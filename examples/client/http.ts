import { TelnetClient } from "../../src/index";

(async () => {
  const client = new TelnetClient({ host: "google.com", port: 80 });

  console.log("Starting http client");
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
