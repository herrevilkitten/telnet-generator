import { Socket as NetSocket, Server as NetServer, createServer as createNetServer, connect as netConnect } from "net";
import { TLSSocket, Server as TLSServer, createServer as createTLSServer, connect as tlsConnect } from "tls";
import { Command } from "./command";
import { EventResolver } from "./event-resolver";

export interface ConnectionCommandEvent {
  type: "command";
  command: Command[];
}

export interface ConnectionDataEvent {
  type: "data";
  data: string;
}

export interface ConnectionErrorEvent {
  type: "error";
  error: Error | string;
}

export interface ConnectionEndEvent {
  type: "end";
  error?: boolean;
}

export interface ConnectionDrainEvent {
  type: "drain";
}

export interface ConnectionLookupEvent {
  type: "lookup";
  error: Error | null;
  address: string;
  family?: string | number;
  host: string;
}

export interface ConnectionReadyEvent {
  type: "ready";
}

export interface ConnectionTimeoutEvent {
  type: "timeout";
}

type ConnectionEvent =
  | ConnectionCommandEvent
  | ConnectionDataEvent
  | ConnectionErrorEvent
  | ConnectionEndEvent
  | ConnectionDrainEvent
  | ConnectionLookupEvent
  | ConnectionReadyEvent
  | ConnectionTimeoutEvent;

export class TelnetConnection {
  public static readonly EOL = "\r\n";
  public static readonly DEFAULT_ENCODING = "utf8";

  private resolver = new EventResolver<ConnectionEvent>();

  private connected = true;

  constructor(public readonly socket: NetSocket | TLSSocket) {
    this.socket.on("close", (hasError) => {
      this.resolver.add({ type: "end", error: hasError });
    });

    this.socket.on("error", (error: Error) => {
      this.resolver.add({ type: "error", error });
      console.error(error);
    });

    this.socket.on("drain", () => {
      this.resolver.add({ type: "drain" });
    });

    this.socket.on("lookup", (error: Error | null, address: string, family: string | number, host: string) => {
      this.resolver.add({ type: "lookup", error, address, family, host });
    });

    this.socket.on("ready", () => {
      this.resolver.add({ type: "ready" });
    });

    this.socket.on("timeout", () => {
      this.resolver.add({ type: "timeout" });
    });

    this.socket.on("data", (data: number[]) => {
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
        type: "data",
        data: buffer.toString(TelnetConnection.DEFAULT_ENCODING, 0, copied),
      });
    });

    this.socket.on("end", () => {
      this.resolver.add({ type: "end" });
      this.connected = false;
    });
  }

  async *receive() {
    while (this.connected) {
      let result = await this.resolver.next();
      yield result;
    }
    return;
  }

  public send(data: string | Uint8Array) {
    if (!this.socket) {
      return;
    }

    this.socket.write(data);
  }

  public sendln(data: string) {
    this.send(data);
    this.send(TelnetConnection.EOL);
  }

  public sendCommand(data: Command[]) {
    if (data[0] !== Command.IAC) {
      data.unshift(Command.IAC);
    }
    this.send(Uint8Array.from(data));
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

    this.resolver.add({ type: "command", command: telnetCommand });

    return position;
  }
}
