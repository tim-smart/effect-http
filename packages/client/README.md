# @effect-http/client

A client agnostic http client for Effect-TS.

## Usage

```ts
import * as Http from "@effect-http/client"
import * as Effect from "@effect/io/Effect"
import { pipe } from "@fp-ts/core/Function"

pipe(
  Http.get("https://google.com", { params: { q: "hello" } }),
  Http.fetch(), // <- uses `fetch` to execute the request
  Effect.flatMap(response => response.text),
  Effect.tap(text =>
    Effect.sync(() => {
      console.log(text)
    }),
  ),
  Effect.runPromise,
)
```
