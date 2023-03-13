import type { Effect } from "@effect/io/Effect"
import type { Runtime } from "@effect/io/Runtime"

/**
 * @tsplus fluent effect/io/Runtime unsafeRunSyncOrPromise
 */
export const unsafeRunSyncOrPromise = <R, E, A>(
  runtime: Runtime<R>,
  effect: Effect<R, E, A>,
) => {
  const result = effect.runSyncExitOrFiber(runtime)

  if (result._tag === "Left") {
    return result.left.join.runPromise
  } else if (result.right._tag === "Failure") {
    throw result.right.cause.squash
  }

  return result.right.value
}
