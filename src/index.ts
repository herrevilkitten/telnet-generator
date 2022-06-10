import { TelnetConnection, TelnetServer } from "./server";

async function echo(socket: TelnetConnection) {
  for await (const event of socket.receive()) {
    if (event.type === "data") {
      console.log(event.data);
      socket.send(event.data);
    }
  }
}

(async () => {
  const server = new TelnetServer(9999);
  let socket = server.listen();

  for await (let event of socket) {
    if (event.type === "connect") {
      const socket = event.socket;
      echo(socket);
    }
  }
})();
