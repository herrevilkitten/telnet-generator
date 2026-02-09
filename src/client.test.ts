import { NetConnectOpts, Socket as NetSocket, connect as netConnect } from 'net';
import { ConnectionOptions as TLSOptions, TLSSocket, connect as tlsConnect } from 'tls';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TLSTelnetClient, TelnetClient } from './client';
import { TelnetConnection } from './connection';

// Mock the 'net' module to isolate the tests from actual network operations.
vi.mock('net', async (importOriginal) => {
  const mod = await importOriginal<typeof import('net')>();
  return {
    ...mod,
    // Mock the connect function to prevent actual network connections.
    connect: vi.fn(),
    // Mock the Socket class to avoid creating real sockets.
    Socket: vi.fn(),
  };
});

// Mock the 'tls' module to isolate the tests from actual TLS operations.
vi.mock('tls', async (importOriginal) => {
  const mod = await importOriginal<typeof import('tls')>();
  return {
    ...mod,
    // Mock the connect function to prevent actual TLS connections.
    connect: vi.fn(),
    // Mock the TLSSocket class to avoid creating real TLS sockets.
    TLSSocket: vi.fn(),
  };
});

// Mock the TelnetConnection class to avoid testing its implementation details here.
vi.mock('./connection', () => ({
  TelnetConnection: vi.fn(),
}));

describe('TelnetClient', () => {
  let connect: typeof netConnect;
  let Socket: typeof NetSocket;

  beforeEach(async () => {
    // Import the mocked 'net' module and get the mocked functions.
    const net = await import('net');
    connect = net.connect;
    Socket = net.Socket;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new TelnetClient', () => {
    const options: NetConnectOpts = { port: 23 };
    const client = new TelnetClient(options);
    expect(client).toBeInstanceOf(TelnetClient);
    expect(client.options).toBe(options);
  });

  it('should connect to a Telnet server', () => {
    const options: NetConnectOpts = { port: 23, host: 'localhost' };
    const client = new TelnetClient(options);
    const socket = new Socket();
    // Ensure the mocked connect function returns our mock socket.
    vi.mocked(connect).mockReturnValue(socket);
    const connection = client.connect();
    // Verify that the connect function was called with the correct options.
    expect(connect).toHaveBeenCalledWith(options);
    // Verify that the TelnetConnection was created with the mock socket.
    expect(TelnetConnection).toHaveBeenCalledWith(socket);
    expect(connection).toBeInstanceOf(TelnetConnection);
  });
});

describe('TLSTelnetClient', () => {
  let connect: typeof tlsConnect;
  let TLSSocketClass: typeof TLSSocket;

  beforeEach(async () => {
    // Import the mocked 'tls' module and get the mocked functions.
    const tls = await import('tls');
    connect = tls.connect;
    TLSSocketClass = tls.TLSSocket;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new TLSTelnetClient', () => {
    const options: TLSOptions = { port: 992 };
    const client = new TLSTelnetClient(options);
    expect(client).toBeInstanceOf(TLSTelnetClient);
    expect(client.options).toBe(options);
  });

  it('should connect to a Telnet server using TLS', () => {
    const options: TLSOptions = { port: 992, host: 'localhost' };
    const client = new TLSTelnetClient(options);
    const socket = new TLSSocketClass(new NetSocket());
    // Ensure the mocked connect function returns our mock socket.
    vi.mocked(connect).mockReturnValue(socket);
    const connection = client.connect();
    // Verify that the connect function was called with the correct options.
    expect(connect).toHaveBeenCalledWith(options);
    // Verify that the TelnetConnection was created with the mock socket.
    expect(TelnetConnection).toHaveBeenCalledWith(socket);
    expect(connection).toBeInstanceOf(TelnetConnection);
  });
});
