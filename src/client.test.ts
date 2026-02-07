import { NetConnectOpts, Socket as NetSocket, connect as netConnect } from 'net';
import { ConnectionOptions as TLSOptions, TLSSocket, connect as tlsConnect } from 'tls';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TLSTelnetClient, TelnetClient } from './client';
import { TelnetConnection } from './connection';

vi.mock('net', async (importOriginal) => {
  const mod = await importOriginal<typeof import('net')>();
  return {
    ...mod,
    connect: vi.fn(),
    Socket: vi.fn(),
  };
});

vi.mock('tls', async (importOriginal) => {
  const mod = await importOriginal<typeof import('tls')>();
  return {
    ...mod,
    connect: vi.fn(),
    TLSSocket: vi.fn(),
  };
});

vi.mock('./connection', () => ({
  TelnetConnection: vi.fn(),
}));

describe('TelnetClient', () => {
  let connect: typeof netConnect;
  let Socket: typeof NetSocket;

  beforeEach(async () => {
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
    vi.mocked(connect).mockReturnValue(socket);
    const connection = client.connect();
    expect(connect).toHaveBeenCalledWith(options);
    expect(TelnetConnection).toHaveBeenCalledWith(socket);
    expect(connection).toBeInstanceOf(TelnetConnection);
  });
});

describe('TLSTelnetClient', () => {
  let connect: typeof tlsConnect;
  let TLSSocketClass: typeof TLSSocket;

  beforeEach(async () => {
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
    vi.mocked(connect).mockReturnValue(socket);
    const connection = client.connect();
    expect(connect).toHaveBeenCalledWith(options);
    expect(TelnetConnection).toHaveBeenCalledWith(socket);
    expect(connection).toBeInstanceOf(TelnetConnection);
  });
});
