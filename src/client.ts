import { NetConnectOpts as NetOptions, Socket as NetSocket, connect as netConnect } from 'net';
import { ConnectionOptions as TLSOptions, TLSSocket, connect as tlsConnect } from 'tls';

import { TelnetConnection } from './connection';

/**
 * Abstract base class for Telnet clients.
 * @abstract
 */
abstract class AbstractTelnetClient {
  /** The Telnet connection. */
  connection?: TelnetConnection;
  /** The options for the connection. */
  protected abstract options: NetOptions | TLSOptions;

  /**
   * Connects to a Telnet server.
   * @param socket The underlying socket.
   * @returns The Telnet connection.
   * @protected
   */
  protected connect(socket: NetSocket | TLSSocket) {
    this.connection = new TelnetConnection(socket);
    return this.connection;
  }
}

/**
 * A Telnet client that uses a raw TCP connection.
 */
export class TelnetClient extends AbstractTelnetClient {
  /** The options for the connection. */
  override options: NetOptions;

  /**
   * Creates a new Telnet client.
   * @param options The options for the connection.
   */
  constructor(options: NetOptions) {
    super();

    this.options = options;
  }

  /**
   * Connects to a Telnet server.
   * @returns The Telnet connection.
   */
  connect() {
    return super.connect(netConnect(this.options));
  }
}

/**
 * A Telnet client that uses a TLS connection.
 */
export class TLSTelnetClient extends AbstractTelnetClient {
  /** The options for the connection. */
  override options: TLSOptions;

  /**
   * Creates a new TLS Telnet client.
   * @param options The options for the connection.
   */
  constructor(options: TLSOptions) {
    super();

    this.options = options;
  }

  /**
   * Connects to a Telnet server using TLS.
   * @returns The Telnet connection.
   */
  connect() {
    return super.connect(tlsConnect(this.options));
  }
}
