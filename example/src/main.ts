import { Option } from "@fp-ts/data/Option"
import { make, respond, router } from "effect-bun-http"

const makeCounter = Effect.struct({
  count: Ref.make(0),
})
interface Counter extends Effect.Success<typeof makeCounter> {}
const Counter = Tag<Counter>()
const CounterLive = Layer.effect(Counter)(makeCounter)

const r = router.route(
  "GET",
  "/",
  Do(($) => {
    const { count } = $(Effect.service(Counter))
    const currentCount = $(count.getAndUpdate((i) => i + 1))
    return new Response(`Hello! ${currentCount}`)
  }),
)

const makeRefererCheck = Do(($) => {
  const { request } = $(Effect.service(RequestContext))
  const referer = Option.fromNullable(request.headers.get("referer"))

  // Short circuit test
  $(
    request.url.includes("/fail")
      ? respond(new Response("Boom!"))
      : Effect.unit(),
  )

  return { referer }
})

interface Referer extends Effect.Success<typeof makeRefererCheck> {}
const Referer = Tag<Referer>()
const RefererLive = Layer.effect(Referer)(makeRefererCheck)

const another = router
  .provideRequestLayer(RefererLive)
  .route(
    "GET",
    "/test",
    Do(($) => {
      const { referer } = $(Effect.service(Referer))

      return new Response(JSON.stringify(referer))
    }),
  )
  // Test short circuit
  .route(
    "GET",
    "/fail",
    Effect.sync(() => new Response("I will never happen")),
  )

const combined = r.combineWith(another)

const serve = make(
  combined.handle.catchTag("RouteNotFound", () =>
    Effect.succeed(new Response("Not found")),
  ),
)

serve.provideLayer(CounterLive).unsafeRun()
