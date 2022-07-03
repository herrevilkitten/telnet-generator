import { Socket as NetSocket, connect as netConnect, NetConnectOpts as NetOptions } from "net";
import { TLSSocket, connect as tlsConnect, ConnectionOptions as TLSOptions } from "tls";
import { TelnetConnection } from "./connection";

abstract class AbstractTelnetClient {
  connection?: TelnetConnection;
  protected abstract options: NetOptions | TLSOptions;

  cosntructor() {}

  protected connect(socket: NetSocket | TLSSocket) {
    this.connection = new TelnetConnection(socket);
    return this.connection;
  }
}

export class TelnetClient extends AbstractTelnetClient {
  override options: NetOptions;

  constructor(options: NetOptions) {
    super();

    this.options = options;
  }

  connect() {
    return super.connect(netConnect(this.options));
  }
}

export class TLSTelnetClient extends AbstractTelnetClient {
  override options: TLSOptions;

  constructor(options: TLSOptions) {
    super();

    this.options = options;
  }

  connect() {
    return super.connect(tlsConnect(this.options));
  }
}
