import * as Http from "node:http"
import * as Https from "node:https"
import type { AgentOptions } from "node:https"
import type { Effect } from "@effect/io/Effect"
import type { Layer } from "@effect/io/Layer"
import { Tag } from "@effect/data/Context"

const makeAgent = (opts?: AgentOptions) =>
  Effect.struct({
    httpAgent: Effect(() => new Http.Agent(opts)).acquireRelease(_ =>
      Effect(() => _.destroy()),
    ),
    httpsAgent: Effect(() => new Https.Agent(opts)).acquireRelease(_ =>
      Effect(() => _.destroy()),
    ),
  })

export interface NodeAgent
  extends Effect.Success<ReturnType<typeof makeAgent>> {}
export const NodeAgent = Tag<NodeAgent>()

export const makeAgentLayer = (
  opts?: AgentOptions,
): Layer<never, never, NodeAgent> => makeAgent(opts).toLayerScoped(NodeAgent)
export const LiveNodeAgent = makeAgentLayer()
