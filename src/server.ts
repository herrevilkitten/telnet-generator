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
 * An event that represents the start of a server.
 */
export interface ServerStartEvent {
  /** The type of the event. */
  type: 'start';
  /** The server instance. */
  server: NetServer | TLSServer | undefined;
}

/**
 * An event that represents a new connection.
 */
export interface ServerConnectEvent {
  /** The type of the event. */
  type: 'connect';
  /** The new connection. */
  connection: TelnetConnection;
}

/**
 * An event that represents the stop of a server.
 */
export interface ServerStopEvent {
  /** The type of the event. */
  type: 'stop';
}

/**
 * An event that represents an error.
 */
export interface ServerErrorEvent {
  /** The type of the event. */
  type: 'error';
  /** The error. */
  error: Error | string;
}

/**
 * A server event.
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
 * Abstract base class for Telnet servers.
 * @abstract
 */
abstract class AbstractTelnetServer {
  /** The event queue. */
  protected resolver = new AsyncQueue<ServerEvent>();
  /** Whether the server is connected. */
  protected connected = true;
  /** The underlying server. */
  protected abstract server: NetServer | TLSServer;

  /**
   * Creates a new abstract Telnet server.
   * @param options The options for the server.
   * @protected
   */
  protected constructor(protected options: NetServerOptions | TLSServerOptions) {}

  /**
   * Starts listening for connections.
   * @returns An async iterator of server events.
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
   * Handles a new connection.
   * @param socket The socket for the new connection.
   */
  connectionHandler(socket: NetSocket | TLSSocket) {
    const connection = new TelnetConnection(socket);
    this.resolver.add({ type: 'connect', connection: connection });
  }

  /**
   * Stops the server.
   */
  stop() {
    this.connected = false;
    this.resolver.add({ type: 'stop' });
  }
}

/**
 * A Telnet server that uses a raw TCP connection.
 */
export class TelnetServer extends AbstractTelnetServer {
  /** The underlying server. */
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
 * A Telnet server that uses a TLS connection.
 */
export class TLSTelnetServer extends AbstractTelnetServer {
  /** The underlying server. */
  override server: TLSServer;

  /**
   * Creates a new TLS Telnet server.
   * @param options The options for the server.
   */
  constructor(options: TLSServerOptions) {
    super(options);

    this.server = createTLSServer(options, this.connectionHandler.bind(this));
  }
}
