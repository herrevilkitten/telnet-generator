# @herrevilkitten/telnet

A small, modern library for creating Telnet clients and servers using asynchronous generators, providing a clean and intuitive way to handle Telnet connections.

## Features

- **Asynchronous by Design**: Built with async generators for handling events, eliminating the need for complex callback structures.
- **Simple and Intuitive API**: The library is designed to be easy to use, with a straightforward API for both clients and servers.
- **Lightweight with Minimal Dependencies**: `@herrevilkitten/telnet` is a small library with only one external dependency, making it easy to integrate into any project.
- **TLS Support**: In addition to raw TCP connections, the library also supports TLS-encrypted connections for both clients and servers.
- **TypeScript Support**: Written in TypeScript, providing strong typing and improved developer experience.

## Installation

You can install `@herrevilkitten/telnet` using your favorite package manager.

### PNPM

```bash
pnpm add @herrevilkitten/telnet
```

### NPM

```bash
npm install @herrevilkitten/telnet
```

### Yarn

```bash
yarn add @herrevilkitten/telnet
```

## Synopsis

### Telnet Server

Here's a simple example of a Telnet server that sends the current date and time to any client that connects:

```typescript
import { TelnetConnection, TelnetServer } from '@herrevilkitten/telnet';

async function daytime(conn: TelnetConnection) {
  const remote = conn.name;
  console.log(`${remote}: connected`);
  conn.sendln(new Date().toString());
  conn.disconnect();
  console.log(`${remote}: disconnected`);
}

(async () => {
  const server = new TelnetServer({ port: 9999, host: '127.0.0.1' });

  console.log('Starting daytime server on port 9999');
  for await (const event of server.listen()) {
    if (event.type === 'connect') {
      daytime(event.connection);
    }
  }
})();
```

### Telnet Client

Here's a client that connects to a daytime server and prints the received data:

```typescript
import { TelnetClient } from '@herrevilkitten/telnet';

(async () => {
  const client = new TelnetClient({ host: 'localhost', port: 9999 });

  console.log('Connecting to daytime server');
  const connection = client.connect();
  for await (const event of connection.receive()) {
    if (event.type === 'data') {
      console.log(event.data);
    } else if (event.type === 'error') {
      console.error(event.error);
      break;
    }
  }
})();
```

### TLS Support

The library also supports TLS-encrypted connections for both clients and servers.

#### TLS Server

```typescript
import { TLSTelnetServer, TelnetConnection } from '@herrevilkitten/telnet';
import { readFileSync } from 'fs';

const options = {
  key: readFileSync('server-key.pem'),
  cert: readFileSync('server-cert.pem'),
  port: 9998,
  host: '127.0.0.1',
};

async function secureDaytime(conn: TelnetConnection) {
  const remote = conn.name;
  console.log(`${remote}: connected securely`);
  conn.sendln(new Date().toString());
  conn.disconnect();
  console.log(`${remote}: disconnected`);
}

(async () => {
  const server = new TLSTelnetServer(options);

  console.log('Starting secure daytime server on port 9998');
  for await (const event of server.listen()) {
    if (event.type === 'connect') {
      secureDaytime(event.connection);
    }
  }
})();
```

#### TLS Client

```typescript
import { TLSTelnetClient } from '@herrevilkitten/telnet';

(async () => {
  const client = new TLSTelnetClient({
    host: 'localhost',
    port: 9998,
    rejectUnauthorized: false, // For self-signed certificates
  });

  console.log('Connecting to secure daytime server');
  const connection = client.connect();
  for await (const event of connection.receive()) {
    if (event.type === 'data') {
      console.log(event.data);
    } else if (event.type === 'error') {
      console.error(event.error);
      break;
    }
  }
})();
```

## Description

`@herrevilkitten/telnet` is a lightweight and modern library for building Telnet-like clients and servers. It leverages ECMAScript generator functions and asynchronous iterators to provide a clean and intuitive way to handle Telnet events, avoiding the complexity of traditional callback-based approaches.

## Examples

Check the [examples](./examples) directory for more detailed examples of different Telnet clients and servers.

## See Also

- [telnet-rxjs](https://www.npmjs.com/package/telnet-rxjs) - A similar library that uses RxJS for handling Telnet events.
