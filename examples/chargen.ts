import { TelnetServer, TelnetConnection } from "../src/index";

const PATTERN = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_\`abcdefghijklmnopqrstuvwxyz{|}`;

async function chargen(conn: TelnetConnection) {
  const remote = conn.name();
  console.log(`${remote}: connected`);
  let running = true;
  let index = 0;

  function sendPattern() {
    conn.send(PATTERN[index]);
    index = (index + 1) % PATTERN.length;
    if (running) {
      setTimeout(() => {
        sendPattern();
      });
    }
  }

  setTimeout(() => {
    sendPattern();
  });

  for await (const event of conn.receive()) {
    if (event.type === "end") {
      running = false;
      break;
    }
  }

  console.log(`${remote}: disconnected`);
}

(async () => {
  const server = new TelnetServer({ port: 9999 });

  console.log("Starting chargen server");
  for await (const event of server.listen()) {
    if (event.type === "connect") {
      chargen(event.connection);
    }
  }
})();
