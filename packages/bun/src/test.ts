import { router } from "@effect-http/core"
import type { Effect } from "@effect/io/Effect"
import { HttpResponse } from "@effect-http/core/Response"

router
  .route("GET", "/", Effect.succeed(HttpResponse.text("Hello!")))
  .toHttpApp()
  .catchTag("RouteNotFound", () =>
    Effect.succeed(HttpResponse.text("Not found")),
  )
  .serveBun()
  .unsafeRun()
