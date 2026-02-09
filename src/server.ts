import { AsyncQueue } from '@herrevilkitten/async-queue';
import {
  ListenOptions,
  Server as NetServer,
  Socket as NetSocket,
  ServerOpts,
  createServer as createNetServer,
} from 'net';
import { Server as TLSServer, TLSSocket, TlsOptions, createServer as createTLSServer } from 'tls';

import { TelnetConnection } from './connection';

/**
 * Represents an event that is emitted when a server starts.
 */
export interface ServerStartEvent {
  /** The type of the event, which is always 'start'. */
  type: 'start';
  /** The underlying `net.Server` or `tls.TLSServer` instance. */
  server: NetServer | TLSServer | undefined;
}

/**
 * Represents an event that is emitted when a new client connects to the server.
 */
export interface ServerConnectEvent {
  /** The type of the event, which is always 'connect'. */
  type: 'connect';
  /** The new Telnet connection. */
  connection: TelnetConnection;
}

/**
 * Represents an event that is emitted when a server stops.
 */
export interface ServerStopEvent {
  /** The type of the event, which is always 'stop'. */
  type: 'stop';
}

/**
 * Represents an event that is emitted when an error occurs.
 */
export interface ServerErrorEvent {
  /** The type of the event, which is always 'error'. */
  type: 'error';
  /** The error that occurred. */
  error: Error | string;
}

/**
 * Represents a server event, which can be one of several types.
 */
export type ServerEvent =
  | ServerStartEvent
  | ServerConnectEvent
  | ServerStopEvent
  | ServerErrorEvent;

/**
 * Options for a raw TCP server.
 */
export type NetServerOptions = ServerOpts & ListenOptions;

/**
 * Options for a TLS server.
 */
export type TLSServerOptions = TlsOptions & ListenOptions;

/**
 * Represents an abstract base class for Telnet servers.
 * @abstract
 */
abstract class AbstractTelnetServer {
  /** The event queue for handling server events asynchronously. */
  protected resolver = new AsyncQueue<ServerEvent>();
  /** A flag indicating whether the server is currently connected and listening for connections. */
  protected connected = true;
  /** The underlying `net.Server` or `tls.TLSServer` instance. */
  protected abstract server: NetServer | TLSServer;

  /**
   * Creates a new abstract Telnet server.
   * @param options The options for the server.
   * @protected
   */
  protected constructor(protected options: NetServerOptions | TLSServerOptions) {}

  /**
   * Starts listening for incoming connections.
   * @returns An async iterator that yields server events.
   */
  async *listen() {
    await new Promise<NetServer | TLSServer | undefined>((resolve) =>
      this.server.listen(this.options, () => {
        this.resolver.add({ type: 'start', server: this.server });
        resolve(this.server);
      }),
    );

    while (this.connected) {
      let result = await this.resolver.next();
      yield result;
    }
    return;
  }

  /**
   * Handles a new incoming connection.
   * @param socket The socket for the new connection.
   */
  connectionHandler(socket: NetSocket | TLSSocket) {
    const connection = new TelnetConnection(socket);
    this.resolver.add({ type: 'connect', connection: connection });
  }

  /**
   * Stops the server from accepting new connections.
   */
  stop() {
    this.connected = false;
    this.resolver.add({ type: 'stop' });
  }

  /**
   * Gets the address information for the server.
   */
  get address() {
    const address = this.server.address();
    if (address && typeof address !== 'string') {
      return { ip: address.address, port: address.port, family: address.family };
    } else if (typeof address === 'string') {
      return { ip: address, port: 0, family: 'N/A' };
    }
    return null;
  }

  /**
   * Gets the name of the server, including its type and address.
   */
  get name() {
    const type = this.server instanceof TLSServer ? 'TLSTelnetServer' : 'TelnetServer';
    return `${type}<${this.address?.ip || '*'}:${this.address?.port || '*'}>`;
  }
}

/**
 * A Telnet server that communicates over a raw TCP connection.
 */
export class TelnetServer extends AbstractTelnetServer {
  /** The underlying `net.Server` instance. */
  override server: NetServer;

  /**
   * Creates a new Telnet server.
   * @param options The options for the server.
   */
  constructor(options: NetServerOptions) {
    super(options);

    this.server = createNetServer(options, this.connectionHandler.bind(this));
    this.server.on('error', (error) => {
      this.resolver.add({ type: 'error', error });
    });
  }
}

/**
 * A Telnet server that communicates over a TLS-encrypted connection.
 */
export class TLSTelnetServer extends AbstractTelnetServer {
  /** The underlying `tls.TLSServer` instance. */
  override server: TLSServer;

  /**
   * Creates a new TLS Telnet server.
   * @param options The options for the server.
   */
  constructor(options: TLSServerOptions) {
    super(options);

    this.server = createTLSServer(options, this.connectionHandler.bind(this));
    this.server.on('error', (error) => {
      this.resolver.add({ type: 'error', error });
    });
  }
}
