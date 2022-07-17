import { TLSTelnetClient } from "../../src/index";

(async () => {
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

  const client = new TLSTelnetClient({ host: "google.com", port: 443 });

  console.log("Starting https client");
  const connection = client.connect();

  connection.sendln("GET /");

  for await (const event of connection.receive()) {
    if (event.type === "data") {
      console.log(event.data);
    } else if (event.type === "error") {
      console.error(event.error);
      break;
    }
  }
})();
