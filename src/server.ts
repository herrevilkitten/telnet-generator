import { Socket as NetSocket, Server as NetServer, createServer as createNetServer, connect as netConnect } from "net";
import { TLSSocket, Server as TLSServer, createServer as createTLSServer, connect as tlsConnect } from "tls";

import { Command } from "./command";

type PushResolver = (value: ServerEvent | PromiseLike<ServerEvent>) => void;

export interface ServerConnectEvent {
  type: "connect";
  socket: TelnetConnection;
}

export interface ServerDisconnectEvent {
  type: "disconnect";
}

export type ServerEvent = ServerConnectEvent | ServerDisconnectEvent;

export class TelnetServer {
  port: number;
  tls = false;
  pullList: ServerEvent[] = [];
  pushList: PushResolver[] = [];
  connected = true;
  server?: NetServer | TLSServer;

  constructor(port: number, tls?: boolean) {
    this.port = port;
    this.tls = !!tls;
  }

  private getNextEvent() {
    return new Promise<ServerEvent>((resolve) => {
      const event = this.pullList.shift();
      if (event) {
        console.log("Existing event:", event.type);
        resolve(event);
      } else {
        console.log("Waiting for event");
        this.pushList.push(resolve);
      }
    });
  }

  async *listen() {
    const connectionHandler = (conn: NetSocket | TLSSocket) => {
      console.log("Received a connection:");
      const connection = new TelnetConnection(conn);
      if (this.pushList.length > 0) {
        const resolve = this.pushList.shift();
        if (resolve) {
          console.log("Resolving event");
          resolve({ type: "connect", socket: connection });
        }
      } else {
        this.pullList.push({ type: "connect", socket: connection });
      }
    };

    if (this.tls) {
      this.server = createTLSServer({}, connectionHandler);
    } else {
      this.server = createNetServer({}, connectionHandler);
    }

    console.log("Before listen");
    await new Promise<any>((resolve) =>
      this.server?.listen(this.port, () => {
        console.log("Listening!");
        resolve(this.server);
      })
    );

    console.log("Before loop");
    while (this.connected) {
      console.log("In loop");
      let result = await this.getNextEvent();
      yield result;
    }
    return;
  }

  disconnect() {
    this.connected = false;
  }
}

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
  error: any;
}

type ConnectionEvent = ConnectionCommandEvent | ConnectionDataEvent | ConnectionErrorEvent;

type ConnectionPushResolver = (value: ConnectionEvent | PromiseLike<ConnectionEvent>) => void;

export class TelnetConnection {
  public static readonly EOL = "\r\n";
  public static readonly DEFAULT_ENCODING = "utf8";

  pullList: ConnectionEvent[] = [];
  pushList: ConnectionPushResolver[] = [];
  connected = true;

  constructor(private socket: NetSocket | TLSSocket) {
    this.initialize();
  }

  private processEvent(event: ConnectionEvent) {
    if (this.pushList.length > 0) {
      const resolve = this.pushList.shift();
      if (resolve) {
        resolve(event);
      }
    } else {
      this.pullList.push(event);
    }
  }

  private initialize() {
    this.socket.on("error", (error: any) => {
      this.processEvent({ type: "error", error });
      console.error(error);
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

      this.processEvent({
        type: "data",
        data: buffer.toString(TelnetConnection.DEFAULT_ENCODING, 0, copied),
      });
    });

    this.socket.on("end", () => {
      this.connected = false;
    });
  }

  private getNextEvent() {
    return new Promise<ConnectionEvent>((resolve) => {
      const event = this.pullList.shift();
      if (event) {
        resolve(event);
      } else {
        this.pushList.push(resolve);
      }
    });
  }

  async *receive() {
    while (this.connected) {
      let result = await this.getNextEvent();
      yield result;
    }
    return;
  }

  public send(data: string) {
    if (!this.socket) {
      return;
    }

    this.socket.write(data);
  }

  public sendln(data: string) {
    this.send(data);
    this.send(TelnetConnection.EOL);
  }

  /**
   * Processes in-band telnet commands.  Please see the relevant RFCs for more information.
   * Commands are published to the connetion observable as {@link Event.Command} and
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
    this.pullList.push({ type: "command", command: telnetCommand });

    return position;
  }
}

export class TelnetClient {
  connection?: TelnetConnection;
  constructor(private host: string, private port: number, private tls?: boolean) {}

  connect() {
    let socket: NetSocket | TLSSocket;
    if (this.tls) {
      socket = tlsConnect({ host: this.host, port: this.port });
    } else {
      socket = netConnect({ host: this.host, port: this.port });
    }

    this.connection = new TelnetConnection(socket);
    return this.connection;
  }
}
