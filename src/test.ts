import { make } from "./server.js"

const r = new Router().route("GET", "/", Effect.succeed(new Response("Hello!")))

const serve = make(
  r.handle.catchTag("RouteNotFound", () =>
    Effect.succeed(new Response("Not found")),
  ),
)

serve.unsafeRun((exit) => {
  if (exit.isFailure()) {
    console.error(exit.cause.pretty())
  }
})
