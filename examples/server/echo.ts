import { TelnetServer, TelnetConnection } from "../../src/index";

async function echo(conn: TelnetConnection) {
  const remote = conn.name();
  console.log(`${remote}: connected`);
  for await (const event of conn.receive()) {
    if (event.type === "data") {
      conn.send(event.data);
    }
  }
  console.log(`${remote}: disconnected`);
}

(async () => {
  const server = new TelnetServer({ port: 9999 });

  console.log("Starting echo server");
  for await (const event of server.listen()) {
    if (event.type === "connect") {
      echo(event.connection);
    }
  }
})();
