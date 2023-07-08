import * as Http from "@effect-http/client"
import type { Option } from "@effect/data/Option"
import type { Layer } from "@effect/io/Layer"
import { ParseOptions } from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import type { Stream } from "@effect/stream/Stream"
import { IncomingMessage } from "http"
import * as NodeHttp from "node:http"
import * as NodeHttps from "node:https"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { LiveNodeAgent, NodeAgent } from "./internal/Agent.js"
import * as IS from "./internal/stream.js"
import * as Effect from "@effect/io/Effect"
import { identity } from "@effect/data/Function"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"

export const executeRaw: Http.executor.RequestExecutor<
  NodeAgent,
  Http.RequestError,
  Http.response.Response
> = request =>
  Do($ => {
    const agent = $(Effect.map(NodeAgent, identity))

    const url = $(
      Effect.try({
        try: () => new URL(request.url),
        catch: _ => new Http.RequestError(request, _),
      }),
    )

    ReadonlyArray.forEach(request.urlParams, ([key, value]) => {
      url.searchParams.append(key, value)
    })

    const response = $(
      executeRequest(agent, url, request.body, {
        method: request.method,
        headers: Object.fromEntries(request.headers),
      }).mapError(_ => new Http.RequestError(request, _)),
    )

    return new ResponseImpl(response)
  })

/**
 * @tsplus getter effect-http/client/Request execute
 */
export const execute = executeRaw.filterStatus(_ => _ >= 200 && _ < 300)

/**
 * @tsplus getter effect-http/client/Request executeJson
 */
export const executeJson = execute
  .contramap(_ => _.acceptJson)
  .mapEffect(_ => _.json)

export const executeDecode = <I extends S.Json, A>(schema: S.Schema<I, A>) =>
  execute.contramap(_ => _.acceptJson).mapEffect(_ => _.decode(schema))

/**
 * @tsplus pipeable effect-http/client/Request executeDecode
 */
export const executeDecode_: <I extends S.Json, A>(
  schema: S.Schema<I, A>,
) => (
  request: Http.Request,
) => Effect.Effect<
  NodeAgent,
  | Http.RequestError
  | Http.StatusCodeError
  | Http.ResponseDecodeError
  | Http.SchemaDecodeError,
  A
> = executeDecode

export const LiveNodeRequestExecutor = Layer.effect(
  Http.executor.HttpRequestExecutor,
  Do($ => {
    const agent = $(Effect.map(NodeAgent, identity))

    return {
      execute: (request: Http.Request) =>
        executeRaw(request).provideService(NodeAgent, agent),
    }
  }),
)

export const LiveNodeRequestExecutorWithAgent =
  LiveNodeAgent >> LiveNodeRequestExecutor

const executeRequest = (
  { httpAgent, httpsAgent }: NodeAgent,
  url: URL,
  body: Option<Http.body.RequestBody>,
  options: NodeHttp.RequestOptions,
) => {
  const controller = new AbortController()

  const request = url.protocol.startsWith("https")
    ? NodeHttps.request(url, {
        ...options,
        agent: httpsAgent,
        signal: controller.signal,
      })
    : NodeHttp.request(url, {
        ...options,
        agent: httpAgent,
        signal: controller.signal,
      })

  const requestEffect = handleRequest(request)
  const bodyEffect = sendBody(request, body)

  return bodyEffect
    .zipRight(requestEffect, { parallel: true })
    .onInterrupt(() =>
      Effect.sync(() => {
        controller.abort()
      }),
    )
}

const handleRequest = (request: NodeHttp.ClientRequest) =>
  Effect.async<never, Error, NodeHttp.IncomingMessage>(resume => {
    request.on("response", response => {
      resume(Effect.succeed(response))
    })
  })

const sendBody = (
  request: NodeHttp.ClientRequest,
  body: Option<Http.body.RequestBody>,
): Effect.Effect<never, unknown, void> => {
  if (body._tag === "None") {
    request.end()
    return waitForFinish(request)
  }

  switch (body.value._tag) {
    case "RawBody":
      request.end(body.value.value)
      return waitForFinish(request)

    case "FormDataBody":
      return Do($ => {
        const response = new Response(body.value.value as FormData)

        response.headers.forEach((value, key) => {
          request.setHeader(key, value)
        })

        return $(
          Effect.tryPromise({
            try: () =>
              pipeline(Readable.fromWeb(response.body! as any), request),
            catch: _ => _,
          }),
        )
      })

    case "StreamBody":
      return body.value.value.run(IS.sink(request))
  }
}

const waitForFinish = (request: NodeHttp.ClientRequest) =>
  Effect.async<never, Error, void>(resume => {
    request.on("error", error => {
      resume(Effect.fail(error))
    })

    request.on("finish", () => {
      resume(Effect.unit)
    })
  })

export class ResponseImpl implements Http.response.Response {
  constructor(private readonly source: IncomingMessage) {}

  get status() {
    return this.source.statusCode!
  }

  get headers() {
    return new Headers(this.source.headers as any)
  }

  get text(): Effect.Effect<never, Http.ResponseDecodeError, string> {
    return IS.readableToString(this.source).mapError(
      _ => new Http.ResponseDecodeError(_.reason, this, "text"),
    )
  }

  get json(): Effect.Effect<never, Http.ResponseDecodeError, unknown> {
    return IS.readableToString(this.source)
      .mapError(_ => new Http.ResponseDecodeError(_.reason, this, "json"))
      .flatMap(_ =>
        Effect.try({
          try: () => JSON.parse(_) as unknown,
          catch: _ => new Http.ResponseDecodeError(_, this, "json"),
        }),
      )
  }

  get formData(): Effect.Effect<never, Http.ResponseDecodeError, FormData> {
    return Effect.fail(
      new Http.ResponseDecodeError("Not implemented", this, "formData"),
    )
  }

  get stream(): Stream<never, Http.ResponseDecodeError, Uint8Array> {
    return IS.fromReadable<Uint8Array>(this.source).mapError(
      _ => new Http.ResponseDecodeError(_, this, "stream"),
    )
  }

  get blob(): Effect.Effect<never, Http.ResponseDecodeError, Blob> {
    return IS.readableToBuffer(this.source)
      .map(_ => new Blob([_]))
      .mapError(_ => new Http.ResponseDecodeError(_, this, "blob"))
  }

  decode<I extends S.Json, A>(
    schema: S.Schema<I, A>,
    options?: ParseOptions,
  ): Effect.Effect<
    never,
    Http.ResponseDecodeError | Http.SchemaDecodeError,
    A
  > {
    const parse = schema.parse
    return this.json.flatMap(_ =>
      parse(_, options).mapError(_ => new Http.SchemaDecodeError(_, this)),
    )
  }
}
