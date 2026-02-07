import { Server as NetServer, createServer as createNetServer } from 'net';
import { Server as TlsServer, createServer as createTlsServer } from 'tls';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TLSTelnetServer, TelnetServer } from './server';

vi.mock('net', async () => {
  const { EventEmitter } = await import('node:events');
  class MockSocket extends EventEmitter {}
  class MockServer extends EventEmitter {
    listen = vi.fn((options, callback) => {
      if (callback) {
        callback();
      }
      return this;
    });
    close = vi.fn();
  }
  return {
    createServer: vi.fn(() => new MockServer()),
    Socket: MockSocket,
  };
});

vi.mock('tls', async () => {
  const { EventEmitter } = await import('node:events');
  class MockSocket extends EventEmitter {}
  class MockServer extends EventEmitter {
    listen = vi.fn((options, callback) => {
      if (callback) {
        callback();
      }
      return this;
    });
    close = vi.fn();
  }
  return {
    createServer: vi.fn(() => new MockServer()),
    Socket: MockSocket,
  };
});

describe('TelnetServer', () => {
  let server: TelnetServer;
  const options = { port: 23 };

  beforeEach(() => {
    server = new TelnetServer(options);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a net server', () => {
    expect(createNetServer).toHaveBeenCalledWith(options, expect.any(Function));
  });

  it('should start listening and emit a start event', async () => {
    const listenPromise = server.listen().next();
    const event = await listenPromise;
    expect(server.server.listen).toHaveBeenCalledWith(options, expect.any(Function));
    expect(event.value).toEqual({ type: 'start', server: server.server });
  });

  it('should emit a connect event on new connection', async () => {
    const iterator = server.listen();
    await iterator.next(); // start event

    const connectPromise = iterator.next();
    const mockSocket = new (await import('net')).Socket();
    // This is the connection handler passed to createNetServer
    const connectionCallback = (createNetServer as vi.Mock).mock.calls[0][1];
    connectionCallback(mockSocket);

    const event = await connectPromise;
    expect(event.value.type).toBe('connect');
    expect(event.value.connection).toBeDefined();
  });

  it('should emit an error event', async () => {
    const iterator = server.listen();
    await iterator.next(); // start event

    const errorPromise = iterator.next();
    const error = new Error('test error');
    (server.server as NetServer).emit('error', error);

    const event = await errorPromise;
    expect(event.value).toEqual({ type: 'error', error });
  });

  it('should stop the server', async () => {
    const iterator = server.listen();
    await iterator.next(); // start event

    const stopPromise = iterator.next();
    server.stop();

    const event = await stopPromise;
    expect(event.value).toEqual({ type: 'stop' });

    const end = await iterator.next();
    expect(end.done).toBe(true);
  });
});

describe('TLSTelnetServer', () => {
  let server: TLSTelnetServer;
  const options = { port: 992, key: 'key', cert: 'cert' };

  beforeEach(() => {
    server = new TLSTelnetServer(options);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a tls server', () => {
    expect(createTlsServer).toHaveBeenCalledWith(options, expect.any(Function));
  });

  it('should start listening and emit a start event', async () => {
    const listenPromise = server.listen().next();
    const event = await listenPromise;
    expect(server.server.listen).toHaveBeenCalledWith(options, expect.any(Function));
    expect(event.value).toEqual({ type: 'start', server: server.server });
  });

  it('should emit a connect event on new connection', async () => {
    const iterator = server.listen();
    await iterator.next(); // start event

    const connectPromise = iterator.next();
    const mockSocket = new (await import('tls')).Socket();
    // This is the connection handler passed to createTlsServer
    const connectionCallback = (createTlsServer as vi.Mock).mock.calls[0][1];
    connectionCallback(mockSocket);

    const event = await connectPromise;
    expect(event.value.type).toBe('connect');
    expect(event.value.connection).toBeDefined();
  });

  it('should emit an error event', async () => {
    const iterator = server.listen();
    await iterator.next(); // start event

    const errorPromise = iterator.next();
    const error = new Error('test error');
    (server.server as TlsServer).emit('error', error);

    const event = await errorPromise;
    expect(event.value).toEqual({ type: 'error', error });
  });

  it('should stop the server', async () => {
    const iterator = server.listen();
    await iterator.next(); // start event

    const stopPromise = iterator.next();
    server.stop();

    const event = await stopPromise;
    expect(event.value).toEqual({ type: 'stop' });

    const end = await iterator.next();
    expect(end.done).toBe(true);
  });
});
