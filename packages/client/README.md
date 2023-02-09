# @effect-http/client

An implementation agnostic http client for Effect-TS.

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

Example using fp-ts/schema:

```ts
import * as S from "@fp-ts/schema"
import * as Http from "@effect-http/client"
import * as Effect from "@effect/io/Effect"
import { pipe } from "@fp-ts/core/Function"

const User_ = S.struct({
  id: S.number,
  name: S.string,
  age: S.number,
})

export interface User extends S.Infer<typeof User_> {}
export const User: S.Schema<User> = User_

const baseUrlExecutor = pipe(
  Http.fetch(),
  Http.executor.contramap(Http.updateUrl(_ => `https://example.com/api${_}`)),
)

const userResponseExecutor = pipe(
  baseUrlExecutor,
  Http.executor.mapEffect(_ => _.decode(User)),
)

export const createUser = pipe(
  Http.post("/users"),
  Http.withSchema(User, userResponseExecutor),
)

export const updateUser = (user: User) =>
  pipe(
    Http.patch(`/users/${user.id}`),
    Http.withSchema(User, userResponseExecutor),
    run => run(user),
  )
```
