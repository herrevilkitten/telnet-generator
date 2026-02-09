import { Socket as NetSocket } from 'net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Command } from './command';
import { TelnetConnection } from './connection';

// A mock implementation of the net.Socket class for testing purposes.
class MockSocket extends NetSocket {
  constructor() {
    super();
    // Mock the event listener methods to avoid actual event handling.
    this.on = vi.fn();
    this.write = vi.fn();
    this.end = vi.fn();
  }
}

describe('TelnetConnection', () => {
  let mockSocket: MockSocket;
  let connection: TelnetConnection;

  beforeEach(() => {
    mockSocket = new MockSocket();
    // Mock the remoteAddress and remotePort properties to simulate a real connection.
    vi.spyOn(mockSocket, 'remoteAddress', 'get').mockReturnValue('127.0.0.1');
    vi.spyOn(mockSocket, 'remotePort', 'get').mockReturnValue(12345);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new TelnetConnection', () => {
    connection = new TelnetConnection(mockSocket);
    expect(connection).toBeInstanceOf(TelnetConnection);
    expect(connection.socket).toBe(mockSocket);
  });

  it('should register all event listeners on the socket', () => {
    connection = new TelnetConnection(mockSocket);
    // Verify that all the necessary event listeners are registered on the socket.
    expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('drain', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('lookup', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('timeout', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('data', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('end', expect.any(Function));
  });

  it('should handle "data" event and parse telnet commands', async () => {
    connection = new TelnetConnection(mockSocket);
    // Get the data handler function from the mock socket.
    const dataHandler = (mockSocket.on as vi.Mock).mock.calls.find((call) => call[0] === 'data')[1];

    // Simulate receiving data with an embedded Telnet command.
    const data = [
      ...Buffer.from('hello'),
      Command.IAC,
      Command.DO,
      Command.ECHO,
      ...Buffer.from('world'),
    ];
    dataHandler(data);

    const receiveIterator = connection.receive();
    // Verify that the Telnet command is parsed correctly.
    let result = await receiveIterator.next();
    expect(result.value).toEqual({
      type: 'command',
      command: [Command.IAC, Command.DO, Command.ECHO],
    });
    // Verify that the data is extracted correctly.
    result = await receiveIterator.next();
    expect(result.value).toEqual({
      type: 'data',
      data: 'helloworld',
    });
  });

  it('should handle "close" event', async () => {
    connection = new TelnetConnection(mockSocket);
    const closeHandler = (mockSocket.on as vi.Mock).mock.calls.find(
      (call) => call[0] === 'close',
    )[1];
    closeHandler(true);
    const event = await connection.receive().next();
    expect(event.value).toEqual({ type: 'end', error: true });
  });

  it('should handle "error" event', async () => {
    connection = new TelnetConnection(mockSocket);
    const errorHandler = (mockSocket.on as vi.Mock).mock.calls.find(
      (call) => call[0] === 'error',
    )[1];
    const error = new Error('Test Error');
    errorHandler(error);
    const event = await connection.receive().next();
    expect(event.value).toEqual({ type: 'error', error });
  });

  it('should send data', () => {
    connection = new TelnetConnection(mockSocket);
    const data = 'hello';
    connection.send(data);
    expect(mockSocket.write).toHaveBeenCalledWith(data);
  });

  it('should send a line of data', () => {
    connection = new TelnetConnection(mockSocket);
    const data = 'hello';
    connection.sendln(data);
    expect(mockSocket.write).toHaveBeenCalledWith(data);
    expect(mockSocket.write).toHaveBeenCalledWith(TelnetConnection.EOL);
  });

  it('should send a telnet command', () => {
    connection = new TelnetConnection(mockSocket);
    const command = [Command.DO, Command.ECHO];
    connection.sendCommand(command);
    expect(mockSocket.write).toHaveBeenCalledWith(
      Uint8Array.from([Command.IAC, Command.DO, Command.ECHO]),
    );
  });

  it('should disconnect', () => {
    connection = new TelnetConnection(mockSocket);
    connection.disconnect();
    expect(mockSocket.end).toHaveBeenCalled();
  });

  it('should return the connection name', () => {
    connection = new TelnetConnection(mockSocket);
    expect(connection.name).toBe('Connection<127.0.0.1:12345>');
  });

  it('should return the connection address', () => {
    connection = new TelnetConnection(mockSocket);
    vi.spyOn(mockSocket, 'remoteFamily', 'get').mockReturnValue('IPv4');
    expect(connection.address).toEqual({
      ip: '127.0.0.1',
      port: 12345,
      family: 'IPv4',
    });
  });

  it('should return null address if remoteAddress is not available', () => {
    vi.spyOn(mockSocket, 'remoteAddress', 'get').mockReturnValue(undefined);
    connection = new TelnetConnection(mockSocket);
    expect(connection.address).toBeNull();
    expect(connection.name).toBe('Connection<*:*>');
  });
});
