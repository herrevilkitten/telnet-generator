import { TelnetClient } from "../../src/index";

(async () => {
  const client = new TelnetClient({ host: "india.colorado.edu", port: 13 });

  console.log("Starting daytime client");
  const connection = client.connect();
  for await (const event of connection.receive()) {
    if (event.type === "data") {
      console.log(event.data);
    } else if (event.type === "error") {
      console.error(event.error);
      break;
    }
  }
})();
  