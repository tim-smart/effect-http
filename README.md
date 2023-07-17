# effect-http

A runtime agnostic http library for effect-ts

## node.js example

```ts
import * as Http from "@effect-http/core"
import * as HttpNode from "@effect-http/node"
import { Effect, pipe } from "effect"
import { createServer } from "node:http"

const app = pipe(
  Http.router
    .route("GET", "/", Effect.succeed(Http.response.text("Hello world!")))
    .toHttpApp(),

  Http.httpApp.catchTag("RouteNotFound", () =>
    Effect.succeed(response.text("Not found", { status: 404 })),
  ),
)

pipe(
  app,
  HttpNode.serve(() => createServer(), { port: 3000 }),
  Effect.runFork,
)
```

## bun example

```ts
import * as Http from "@effect-http/core"
import * as HttpBun from "@effect-http/bun"
import { Effect, pipe } from "effect"

const app = pipe(
  Http.router
    .route("GET", "/", Effect.succeed(Http.response.text("Hello world!")))
    .toHttpApp(),

  Http.httpApp.catchTag("RouteNotFound", () =>
    Effect.succeed(Http.response.text("Not found", { status: 404 })),
  ),
)

pipe(app, HttpBun.serve({ port: 3000 }), Effect.runFork)
```
