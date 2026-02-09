import { AsyncQueue } from '@herrevilkitten/async-queue';
import {
  Server as NetServer,
  Socket as NetSocket,
  createServer as createNetServer,
  connect as netConnect,
} from 'net';
import {
  Server as TLSServer,
  TLSSocket,
  createServer as createTLSServer,
  connect as tlsConnect,
} from 'tls';

import { Command } from './command';

/**
 * Represents an event that is emitted when a Telnet command is received.
 */
export interface ConnectionCommandEvent {
  /** The type of the event, which is always 'command'. */
  type: 'command';
  /** An array of Telnet commands that were received. */
  command: Command[];
}

/**
 * Represents an event that is emitted when data is received from the connection.
 */
export interface ConnectionDataEvent {
  /** The type of the event, which is always 'data'. */
  type: 'data';
  /** The data that was received, as a string. */
  data: string;
}

/**
 * Represents an event that is emitted when an error occurs on the connection.
 */
export interface ConnectionErrorEvent {
  /** The type of the event, which is always 'error'. */
  type: 'error';
  /** The error that occurred. */
  error: Error | string;
}

/**
 * Represents an event that is emitted when the connection is closed.
 */
export interface ConnectionEndEvent {
  /** The type of the event, which is always 'end'. */
  type: 'end';
  /** A flag indicating whether the connection ended with an error. */
  error?: boolean;
}

/**
 * Represents an event that is emitted when the socket's buffer has been drained.
 */
export interface ConnectionDrainEvent {
  /** The type of the event, which is always 'drain'. */
  type: 'drain';
}

/**
 * Represents an event that is emitted when a DNS lookup is performed.
 */
export interface ConnectionLookupEvent {
  /** The type of the event, which is always 'lookup'. */
  type: 'lookup';
  /** The error that occurred during the lookup, if any. */
  error: Error | null;
  /** The IP address that was resolved. */
  address: string;
  /** The address family (e.g., 'IPv4' or 'IPv6'). */
  family?: string | number;
  /** The hostname that was resolved. */
  host: string;
}

/**
 * Represents an event that is emitted when the connection is ready.
 */
export interface ConnectionReadyEvent {
  /** The type of the event, which is always 'ready'. */
  type: 'ready';
}

/**
 * Represents an event that is emitted when the connection times out.
 */
export interface ConnectionTimeoutEvent {
  /** The type of the event, which is always 'timeout'. */
  type: 'timeout';
}

/**
 * Represents a Telnet connection event, which can be one of several types.
 */
type ConnectionEvent =
  | ConnectionCommandEvent
  | ConnectionDataEvent
  | ConnectionErrorEvent
  | ConnectionEndEvent
  | ConnectionDrainEvent
  | ConnectionLookupEvent
  | ConnectionReadyEvent
  | ConnectionTimeoutEvent;

/**
 * Represents a Telnet connection, which can be used to send and receive data and commands.
 */
export class TelnetConnection {
  /** The end-of-line sequence used in Telnet. */
  public static readonly EOL = '\r\n';
  /** The default encoding for Telnet connections. */
  public static readonly DEFAULT_ENCODING = 'utf8';

  private resolver = new AsyncQueue<ConnectionEvent>();

  private connected = true;

  /**
   * Creates a new Telnet connection.
   * @param socket The underlying `net.Socket` or `tls.TLSSocket` to use for the connection.
   */
  constructor(public readonly socket: NetSocket | TLSSocket) {
    this.socket.on('close', (hasError) => {
      this.resolver.add({ type: 'end', error: hasError });
    });

    this.socket.on('error', (error: Error) => {
      this.resolver.add({ type: 'error', error });
      console.error(error);
    });

    this.socket.on('drain', () => {
      this.resolver.add({ type: 'drain' });
    });

    this.socket.on(
      'lookup',
      (error: Error | null, address: string, family: string | number, host: string) => {
        this.resolver.add({ type: 'lookup', error, address, family, host });
      },
    );

    this.socket.on('ready', () => {
      this.resolver.add({ type: 'ready' });
    });

    this.socket.on('timeout', () => {
      this.resolver.add({ type: 'timeout' });
    });

    this.socket.on('data', (data: number[]) => {
      const buffer = Buffer.alloc(data.length);
      let copied = 0;
      for (let cursor = 0; cursor < data.length; ++cursor) {
        if (data[cursor] === Command.IAC) {
          cursor = this.handleTelnetCommand(data, cursor);
        } else {
          buffer[copied++] = data[cursor];
        }
      }

      this.resolver.add({
        type: 'data',
        data: buffer.toString(TelnetConnection.DEFAULT_ENCODING, 0, copied),
      });
    });

    this.socket.on('end', () => {
      this.resolver.add({ type: 'end' });
      this.connected = false;
    });
  }

  /**
   * Asynchronously receives data and events from the connection.
   * @returns An async iterator that yields connection events.
   */
  async *receive() {
    while (this.connected) {
      let result = await this.resolver.next();
      yield result;
    }
    return;
  }

  /**
   * Sends data over the connection.
   * @param data The data to send, as a string or a `Uint8Array`.
   */
  public send(data: string | Uint8Array) {
    if (!this.socket || !this.socket.writable) {
      return;
    }

    this.socket.write(data);
  }

  /**
   * Sends a line of data over the connection, followed by the EOL sequence.
   * @param data The line of data to send.
   */
  public sendln(data: string) {
    this.send(data);
    this.send(TelnetConnection.EOL);
  }

  /**
   * Sends a Telnet command over the connection.
   * @param data The command to send, as an array of numbers.
   */
  public sendCommand(data: Command[]) {
    if (data[0] !== Command.IAC) {
      data.unshift(Command.IAC);
    }
    this.send(Uint8Array.from(data));
  }

  /**
   * Disconnects from the server.
   */
  public disconnect() {
    this.socket.end();
  }

  /**
   * Processes in-band Telnet commands.
   *
   * This method handles Telnet commands that are embedded in the data stream.
   * It emits `ConnectionCommandEvent`s that can be used to respond to the commands.
   *
   * @param data The array of data from the current input.
   * @param position The current position of the data cursor.
   * @returns The new position of the data cursor.
   * @see https://tools.ietf.org/html/rfc854
   */
  private handleTelnetCommand(data: number[], position: number) {
    const telnetCommand: number[] = [Command.IAC];

    // Used to store the new position of the buffer cursor
    position++;

    if (data[position] === Command.SB) {
      while (position < data.length) {
        telnetCommand.push(data[position++]);
        if (data[position] === Command.SE) {
          telnetCommand.push(data[position]);
          break;
        }
      }
    } else {
      if (position < data.length) {
        telnetCommand.push(data[position++]);
      }
      if (position < data.length) {
        telnetCommand.push(data[position]);
      }
    }

    this.resolver.add({ type: 'command', command: telnetCommand });

    return position;
  }

  /**
   * Gets the address information for the remote end of the connection.
   */
  get address() {
    if (!this.socket.remoteAddress) {
      return null;
    }
    return {
      ip: this.socket.remoteAddress,
      port: this.socket.remotePort || 0,
      family: this.socket.remoteFamily,
    };
  }

  /**
   * Returns the name of the connection, including the remote address and port.
   * @returns The name of the connection.
   */
  get name() {
    const address = this.address;
    return `Connection<${address?.ip || '*'}:${address?.port || '*'}>`;
  }
}
