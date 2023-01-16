import { router } from "effect-bun-http"

router
  .route(
    "GET",
    "/",
    Effect.sync(() => new Response("Hello!")),
  )
  .toHttpApp()
  .catchTag("RouteNotFound", () => Effect.succeed(new Response("Not found")))
  .serve()
  .unsafeRun()
