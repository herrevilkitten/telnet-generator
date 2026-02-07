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
 * An event that represents a Telnet command.
 */
export interface ConnectionCommandEvent {
  /** The type of the event. */
  type: 'command';
  /** The Telnet command. */
  command: Command[];
}

/**
 * An event that represents incoming data.
 */
export interface ConnectionDataEvent {
  /** The type of the event. */
  type: 'data';
  /** The incoming data. */
  data: string;
}

/**
 * An event that represents an error.
 */
export interface ConnectionErrorEvent {
  /** The type of the event. */
  type: 'error';
  /** The error. */
  error: Error | string;
}

/**
 * An event that represents the end of the connection.
 */
export interface ConnectionEndEvent {
  /** The type of the event. */
  type: 'end';
  /** Whether the connection ended with an error. */
  error?: boolean;
}

/**
 * An event that represents a drain of the socket's buffer.
 */
export interface ConnectionDrainEvent {
  /** The type of the event. */
  type: 'drain';
}

/**
 * An event that represents a DNS lookup.
 */
export interface ConnectionLookupEvent {
  /** The type of the event. */
  type: 'lookup';
  /** The error, if any. */
  error: Error | null;
  /** The IP address. */
  address: string;
  /** The address family. */
  family?: string | number;
  /** The hostname. */
  host: string;
}

/**
 * An event that represents that the connection is ready.
 */
export interface ConnectionReadyEvent {
  /** The type of the event. */
  type: 'ready';
}

/**
 * An event that represents a timeout.
 */
export interface ConnectionTimeoutEvent {
  /** The type of the event. */
  type: 'timeout';
}

/**
 * A Telnet connection event.
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
 * A Telnet connection.
 */
export class TelnetConnection {
  /** The end-of-line sequence. */
  public static readonly EOL = '\r\n';
  /** The default encoding. */
  public static readonly DEFAULT_ENCODING = 'utf8';

  private resolver = new AsyncQueue<ConnectionEvent>();

  private connected = true;

  /**
   * Creates a new Telnet connection.
   * @param socket The underlying socket.
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
   * Receives data from the connection.
   * @returns An async iterator of connection events.
   */
  async *receive() {
    while (this.connected) {
      let result = await this.resolver.next();
      yield result;
    }
    return;
  }

  /**
   * Sends data to the connection.
   * @param data The data to send.
   */
  public send(data: string | Uint8Array) {
    if (!this.socket || !this.socket.writable) {
      return;
    }

    this.socket.write(data);
  }

  /**
   * Sends a line of data to the connection.
   * @param data The data to send.
   */
  public sendln(data: string) {
    this.send(data);
    this.send(TelnetConnection.EOL);
  }

  /**
   * Sends a Telnet command to the connection.
   * @param data The command to send.
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
   * Processes in-band telnet commands.  Please see the relevant RFCs for more information.
   * Commands are emited as ConnectionCommandEvents and
   * can be responded to by filtering for this information.
   *
   * @param data the array of data for the current input
   * @param position the current position of the data cursor
   * @returns the new position of the data cursor
   */
  private handleTelnetCommand(data: number[], position: number) {
    const telnetCommand: number[] = [Command.IAC];

    // Used to store the new position of the buffer cursor
    position++;

    if (data[position] === Command.SB) {
      while (position < data.length) {
        telnetCommand.push(data[position++]);
        if (data[position] === Command.SE) {
          break;
        }
      }
    } else {
      if (position < data.length) {
        telnetCommand.push(data[position++]);
      }
      if (position < data.length) {
        telnetCommand.push(data[position++]);
      }
    }

    this.resolver.add({ type: 'command', command: telnetCommand });

    return position;
  }

  /**
   * Returns the name of the connection.
   * @returns The name of the connection.
   */
  name() {
    return `${this.socket.remoteAddress}:${this.socket.remotePort || '*'}`;
  }
}
