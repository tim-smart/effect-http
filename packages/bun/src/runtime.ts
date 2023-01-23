import type { Effect } from "@effect/io/Effect"
import type { AsyncFiber, Runtime } from "@effect/io/Runtime"

/**
 * @tsplus fluent effect/io/Runtime unsafeRunSyncOrPromise
 */
export const unsafeRunSyncOrPromise = <R, E, A>(
  runtime: Runtime<R>,
  effect: Effect<R, E, A>,
) => {
  const exit = runtime.unsafeRunSyncExit(effect)

  if (
    exit._tag === "Failure" &&
    exit.cause._tag === "Die" &&
    (exit.cause as any).defect._tag === "AsyncFiber"
  ) {
    return new Promise<A>((resolve, reject) => {
      ;((exit.cause as any).defect as AsyncFiber<E, A>).fiber.unsafeAddObserver(
        (exit) => {
          if (exit._tag === "Success") {
            resolve(exit.value)
          } else {
            reject(exit.cause.squash)
          }
        },
      )
    })
  } else if (exit._tag === "Failure") {
    throw exit.cause.squash
  }

  return exit.value
}
