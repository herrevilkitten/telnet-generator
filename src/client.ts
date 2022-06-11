import { Socket as NetSocket, Server as NetServer, createServer as createNetServer, connect as netConnect } from "net";
import { TLSSocket, Server as TLSServer, createServer as createTLSServer, connect as tlsConnect } from "tls";
import { TelnetConnection } from "./connection";

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
