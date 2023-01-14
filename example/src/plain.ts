import { make, router } from "effect-bun-http"

const r = router.route(
  "GET",
  "/",
  Effect.sync(() => new Response("Hello!")),
)

const serve = make(
  r.handle((a) =>
    a.catchTag("RouteNotFound", () =>
      Effect.succeed(new Response("Not found")),
    ),
  ),
)

serve.unsafeRun()
