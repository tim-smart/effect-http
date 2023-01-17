import { router, decode } from "effect-bun-http"

const numberFromString = Schema.string.transformOrFail(
  Schema.number,
  (a) => {
    const n = parseFloat(a)
    if (isNaN(n)) {
      return ParseResult.left([ParseError.unexpected(a)])
    }

    return ParseResult.right(n)
  },
  (a) => ParseResult.right(a.toString()),
)

export const User = Schema.struct({
  id: Schema.string,
  name: Schema.string,
  age: numberFromString.int().greaterThan(0).optional,
})

router
  .route(
    "PUT",
    "/users/:id",
    decode(User).map((user) => new Response(JSON.stringify(user))),
  )
  .toHttpApp()
  .catchTag("DecodeError", (e) =>
    Effect.succeed(new Response(JSON.stringify(e.errors), { status: 400 })),
  )
  .catchTag("BodyParseError", () =>
    Effect.succeed(new Response("Bad body", { status: 400 })),
  )
  .catchTag("RouteNotFound", () =>
    Effect.succeed(new Response("Not found", { status: 404 })),
  )
  .serve()
  .unsafeRun()
