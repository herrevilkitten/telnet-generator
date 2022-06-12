import { Socket as NetSocket, connect as netConnect, NetConnectOpts } from "net";
import { TLSSocket, connect as tlsConnect, ConnectionOptions } from "tls";
import { TelnetConnection } from "./connection";

export class TelnetClient {
  connection?: TelnetConnection;
  constructor(private host: string, private port: number, private tls?: boolean) {}

  connect(options: ConnectionOptions | NetConnectOpts) {
    let socket: NetSocket | TLSSocket;
    if ("secureContext" in options) {
      socket = tlsConnect(options);
    } else if ("family" in options) {
      socket = netConnect(options);
    } else {
      throw new Error("")
    }

    this.connection = new TelnetConnection(socket);
    return this.connection;
  }
}
