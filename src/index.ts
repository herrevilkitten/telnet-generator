import { TelnetServer } from "./server";

(async () => {
  const server = new TelnetServer(9999);
  let seq = server.listen();

  let index = 1;
  for await (let num of seq) {
    console.log("Index ", index, Object.keys(num));
    if (num.type === "connect") {
      const socket = num.socket;
    }
    index = index + 1;
  }
})();
