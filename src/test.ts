import { make } from "./server.js"

const r = new Router().route("GET", "/", Effect.succeed(new Response("Hello!")))

const handle = r.handle((a) =>
  a.catchTag("RouteNotFound", () => Effect.succeed(new Response("Not found"))),
)

const serve = make(handle)

serve.unsafeRun((exit) => {
  if (exit.isFailure()) {
    console.error(exit.cause.pretty())
  }
})
