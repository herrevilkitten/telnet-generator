import { NetConnectOpts as NetOptions, Socket as NetSocket, connect as netConnect } from 'net';
import { ConnectionOptions as TLSOptions, TLSSocket, connect as tlsConnect } from 'tls';

import { TelnetConnection } from './connection';

/**
 * Represents an abstract base class for Telnet clients.
 * @abstract
 */
abstract class AbstractTelnetClient {
  /**
   * The underlying Telnet connection.
   * This is only available after a successful connection.
   */
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
   * Establishes a connection to a Telnet server.
   * @returns The established Telnet connection.
   */
  connect() {
    return super.connect(netConnect(this.options));
  }
}

/**
 * A Telnet client that communicates over a TLS-encrypted connection.
 */
export class TLSTelnetClient extends AbstractTelnetClient {
  /** The options for the TLS connection. */
  override options: TLSOptions;

  /**
   * Creates a new TLS Telnet client.
   * @param options The options for the TLS connection.
   */
  constructor(options: TLSOptions) {
    super();

    this.options = options;
  }

  /**
   * Establishes a connection to a Telnet server using TLS.
   * @returns The established Telnet connection.
   */
  connect() {
    return super.connect(tlsConnect(this.options));
  }
}
