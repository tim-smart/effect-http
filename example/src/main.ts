import { Option } from "@fp-ts/data/Option"
import { make, respond, router } from "effect-bun-http"

const makeCounter = Effect.struct({
  count: Ref.make(0),
})
interface Counter extends Effect.Success<typeof makeCounter> {}
const Counter = Tag<Counter>()
const CounterLive = Layer.effect(Counter)(makeCounter)

const makeReferer = Do(($) => {
  const { request } = $(Effect.service(RouteContext))
  const referer = Option.fromNullable(request.headers.get("referer"))

  // Short circuit test
  $(
    request.url.includes("/fail")
      ? respond(new Response("Boom!"))
      : Effect.unit(),
  )

  return { referer }
})

interface Referer extends Effect.Success<typeof makeReferer> {}
const Referer = Tag<Referer>()

const makeAnother = Do(($) => {
  const { referer } = $(Effect.service(Referer))
  const another = referer.map((a) => `${a} - another`)

  return { another }
})

interface Another extends Effect.Success<typeof makeAnother> {}
const Another = Tag<Another>()

const users = router.route(
  "GET",
  "/",
  Do(($) => {
    $(Effect.service(Referer))
    const { count } = $(Effect.service(Counter))
    const currentCount = $(count.getAndUpdate((i) => i + 1))
    return new Response(`Users: ${currentCount}`)
  }),
)

const r = router
  .provideServiceEffect(Referer)(makeReferer)
  .route(
    "GET",
    "/",
    Do(($) => {
      const { count } = $(Effect.service(Counter))
      const currentCount = $(count.getAndUpdate((i) => i + 1))
      return new Response(`Hello! ${currentCount}`)
    }),
  )
  .mountRouter("/users", users)

const another = router
  .provideServiceEffect(Referer)(makeReferer)
  .provideServiceEffect(Another)(makeAnother)
  .route(
    "GET",
    "/test",
    Do(($) => {
      const { referer } = $(Effect.service(Referer))

      return new Response(JSON.stringify(referer))
    }),
  )
  .route(
    "GET",
    "/test2",
    Do(($) => {
      const { another } = $(Effect.service(Another))

      return new Response(JSON.stringify(another))
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
  combined.handle((a) =>
    a.catchTag("RouteNotFound", () =>
      Effect.succeed(new Response("Not found")),
    ),
  ),
)

serve.provideLayer(CounterLive).unsafeRun()
