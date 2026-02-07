import { TelnetServer, TelnetConnection } from "../../src/index";

async function daytime(conn: TelnetConnection) {
  const remote = conn.name();
  console.log(`${remote}: connected`);
  conn.sendln(new Date().toString());
  conn.disconnect();
  console.log(`${remote}: disconnected`);
}

(async () => {
  const server = new TelnetServer({ port: 9999 });

  console.log("Starting daytime server on port 9999");
  for await (const event of server.listen()) {
    if (event.type === "connect") {
      daytime(event.connection);
    }
  }
})();
