# effect-http

A runtime agnostic http library for effect-ts

## node.js example

```ts
import { httpApp, response, router } from "@effect-http/core"
import { make } from "@effect-http/node"
import * as T from "@effect/io/Effect"
import { pipe } from "@fp-ts/data/Function"
import * as Http from "http"

const app = pipe(
  router
    .route("GET", "/", T.succeed(response.text("Hello world!")))
    .toHttpApp(),

  httpApp.catchTag("RouteNotFound", () =>
    T.succeed(response.text("Not found", { status: 404 })),
  ),
)

pipe(app, make(Http.createServer(), { port: 3000 }), T.unsafeRun)
```
