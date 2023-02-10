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

Here is an example using tsplus:

```ts
import { HttpClientError } from "@effect-http/client"
import * as S from "@fp-ts/schema"

const Post_ = S.struct({
  id: S.number,
  title: S.string,
  body: S.string,
  userId: S.number,
})
interface Post extends S.Infer<typeof Post_> {}
const Post: S.Schema<Post> = Post_

const Posts = S.array(Post)
const CreatePost = pipe(Post, S.omit("id"))

/**
 * Here is a jsonplaceholder request executor, which adds a base url and an
 * Accept header.
 */
const jsonplaceholder = Http.fetch().contramap(
  _ => _.updateUrl(_ => `https://jsonplaceholder.typicode.com${_}`).acceptJson,
)

/**
 * We further refine the jsonplaceholder request executor by adding a Post
 * decoder.
 *
 * @tsplus getter effect-http/client/Request fetchPost
 */
export const jsonplaceholderPost = jsonplaceholder.mapEffect(_ =>
  _.decode(Post),
)

/**
 * @tsplus getter effect-http/client/Request fetchPosts
 */
export const jsonplaceholderPosts = jsonplaceholder.mapEffect(_ =>
  _.decode(Posts),
)

/**
 * We can now use the jsonplaceholderPost executor to send a POST request that
 * creates a new post.
 */
export const createPost: (post: {
  readonly title: string
  readonly body: string
  readonly userId: number
}) => Effect<never, HttpClientError, Post> = Http.post("/posts").withSchema(
  CreatePost,
  jsonplaceholderPost,
)

/**
 * Here we use the fetchPosts tsplus getter to create a listPosts effect.
 */
export const listPosts: Effect<never, HttpClientError, readonly Post[]> =
  Http.get("/posts").fetchPosts
```
