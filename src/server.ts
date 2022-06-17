import {
  Socket as NetSocket,
  Server as NetServer,
  createServer as createNetServer,
  ServerOpts,
  ListenOptions,
} from "net";
import { TLSSocket, Server as TLSServer, createServer as createTLSServer, TlsOptions } from "tls";

import { TelnetConnection } from "./connection";
import { EventResolver } from "./event-resolver";

export interface ServerStartEvent {
  type: "start";
  server: NetServer | TLSServer | undefined;
}

export interface ServerConnectEvent {
  type: "connect";
  connection: TelnetConnection;
}

export interface ServerStopEvent {
  type: "stop";
}

export interface ServerErrorEvent {
  type: "error";
  error: Error | string;
}

export type ServerEvent = ServerStartEvent | ServerConnectEvent | ServerStopEvent | ServerErrorEvent;

export type NetServerOptions = ServerOpts & ListenOptions;

export type TLSServerOptions = TlsOptions & ListenOptions;

abstract class AbstractTelnetServer {
  protected resolver = new EventResolver<ServerEvent>();
  protected connected = true;
  protected abstract server: NetServer | TLSServer;

  protected constructor(protected options: NetServerOptions | TLSServerOptions) {}

  async *listen() {
    await new Promise<NetServer | TLSServer | undefined>((resolve) =>
      this.server.listen(this.options, () => {
        this.resolver.add({ type: "start", server: this.server });
        resolve(this.server);
      })
    );

    while (this.connected) {
      let result = await this.resolver.next();
      yield result;
    }
    return;
  }

  connectionHandler(socket: NetSocket | TLSSocket) {
    const connection = new TelnetConnection(socket);
    this.resolver.add({ type: "connect", connection: connection });
  }

  stop() {
    this.connected = false;
    this.resolver.add({ type: "stop" });
  }
}

export class TelnetServer extends AbstractTelnetServer {
  override server: NetServer;

  constructor(options: NetServerOptions) {
    super(options);

    this.server = createNetServer(options, this.connectionHandler.bind(this));
    this.server.on("error", (error) => {
      this.resolver.add({ type: "error", error });
    });
  }
}

export class TLSTelnetServer extends AbstractTelnetServer {
  override server: TLSServer;

  constructor(options: TLSServerOptions) {
    super(options);

    this.server = createTLSServer(options, this.connectionHandler.bind(this));
  }
}
