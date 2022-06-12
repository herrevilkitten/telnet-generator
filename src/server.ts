import {
  Socket as NetSocket,
  Server as NetServer,
  createServer as createNetServer,
  ServerOpts,
  ListenOptions,
} from "net";
import { TLSSocket, Server as TLSServer, createServer as createTLSServer, TlsOptions } from "tls";

import { TelnetConnection } from "./connection";

type PushResolver = (value: ServerEvent | PromiseLike<ServerEvent>) => void;

export interface ServerConnectEvent {
  type: "connect";
  connection: TelnetConnection;
}

export interface ServerDisconnectEvent {
  type: "disconnect";
}

export type ServerEvent = ServerConnectEvent | ServerDisconnectEvent;

export type NetServerOptions = ServerOpts & ListenOptions;

export type TLSServerOptions = TlsOptions & ListenOptions;

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
        resolve(event);
      } else {
        this.pushList.push(resolve);
      }
    });
  }

  async *listen() {
    const connectionHandler = (conn: NetSocket | TLSSocket) => {
      const connection = new TelnetConnection(conn);
      if (this.pushList.length > 0) {
        const resolve = this.pushList.shift();
        if (resolve) {
          resolve({ type: "connect", connection: connection });
        }
      } else {
        this.pullList.push({ type: "connect", connection: connection });
      }
    };

    if (this.tls) {
      this.server = createTLSServer({}, connectionHandler);
    } else {
      this.server = createNetServer({}, connectionHandler);
    }

    await new Promise<NetServer | TLSServer | undefined>((resolve) =>
      this.server?.listen(this.port, () => {
        resolve(this.server);
      })
    );

    while (this.connected) {
      let result = await this.getNextEvent();
      yield result;
    }
    return;
  }

  disconnect() {
    this.connected = false;
  }
}
