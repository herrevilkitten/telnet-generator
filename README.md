# telnet-generator

A small library for telnet clients and servers built with asynchronous generators

## INSTALLATION

    npm install telnet-generator

## SYNOPSIS

Server
```
import { TelnetServer, TelnetConnection } from "telnet-generator";

async function daytime(conn: TelnetConnection) {
  const remote = conn.name();
  console.log(`${remote}: connected`);
  conn.sendln(new Date().toString());
  conn.disconnect();
  console.log(`${remote}: disconnected`);
}

(async () => {
  const server = new TelnetServer({ port: 9999 });

  console.log("Starting daytime server");
  for await (const event of server.listen()) {
    if (event.type === "connect") {
      daytime(event.connection);
    }
  }
})();
```

Client

```
import { TelnetClient } from "telnet-generator";

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
```

## DESCRIPTION

`telnet-generator` is a small library for building telnet-like clients and servers. It has no dependencies. The basic premise of this library is to use ECMAScript generator functions and asynchronous iterators for receiving events, instead of callbacks.

## EXAMPLES

Check the [examples](./examples) directory for some examples on different telnet clients and servers.

## SEE ALSO

[telnet-rxjs](https://www.npmjs.com/package/telnet-rxjs)