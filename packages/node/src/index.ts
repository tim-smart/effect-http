import type { HttpApp } from "@effect-http/core"
import {
  EarlyResponse,
  HttpResponse,
  HttpStreamError,
} from "@effect-http/core/Response"
import type { Effect } from "@effect/io/Effect"
import * as Runtime from "@effect/io/Runtime"
import { LazyArg } from "@fp-ts/core/Function"
import * as Http from "http"
import type { ListenOptions } from "net"
import { Readable } from "stream"
import { NodeHttpRequest } from "./internal/Request.js"
import { MultipartOptions } from "./internal/multipart.js"
import * as S from "./internal/stream.js"
import { HttpFs } from "@effect-http/core/internal/HttpFs"
import { nodeHttpFsImpl } from "./internal/HttpFs.js"

export * from "./internal/HttpFs.js"

export type ServeOptions = ListenOptions & {
  port: number
} & Partial<MultipartOptions>

export class NodeHttpError {
  readonly _tag = "NodeHttpError"
  constructor(readonly error: Error) {}
}

/**
 * @tsplus pipeable effect-http/HttpApp serve
 */
export const serve =
  (makeServer: LazyArg<Http.Server>, options: ServeOptions) =>
  <R>(httpApp: HttpApp<R, EarlyResponse>) =>
    Effect.runtime<R>()
      .flatMap(runtime =>
        Effect.asyncInterrupt<never, NodeHttpError, never>(resume => {
          const server = makeServer()

          server.once("error", err => {
            resume(Effect.fail(new NodeHttpError(err)))
          })

          server.on("request", (request, response) => {
            Runtime.runCallback(runtime)(
              httpApp(convertRequest(request, options))
                .catchTag("EarlyResponse", _ => Effect.succeed(_.response))
                .flatMap(_ => handleResponse(_, response)),

              exit => {
                if (exit.isFailure()) {
                  if (!response.headersSent) {
                    response.writeHead(500)
                  }
                  if (!response.writableEnded) {
                    response.end()
                  }

                  exit.cause.logErrorCause.runFork
                }
              },
            )
          })

          server.listen(options)

          return Effect.async(resume => {
            server.close(() => resume(Effect.unit()))
          })
        }),
      )
      .provideService(HttpFs, nodeHttpFsImpl)

const convertRequest = (
  source: Http.IncomingMessage,
  {
    port,
    limits = {},
    multipartFieldTypes = ["application/json"],
  }: { port: number } & Partial<MultipartOptions>,
) => {
  const url = requestUrl(source, port)
  return new NodeHttpRequest(source, url, url, {
    limits,
    multipartFieldTypes,
  })
}

const handleResponse = (
  source: HttpResponse,
  dest: Http.ServerResponse,
): Effect<never, HttpStreamError, void> => {
  switch (source._tag) {
    case "FormDataResponse":
      return Effect.async<never, never, void>(resume => {
        const r = new Response(source.body)
        const headers = source.headers
          ? Object.fromEntries(source.headers.entries())
          : {}
        headers["content-type"] = r.headers.get("content-type")!
        dest.writeHead(source.status, headers)
        Readable.fromWeb(r.body as any)
          .pipe(dest)
          .once("finish", () => {
            resume(Effect.unit())
          })
      })

    case "StreamResponse":
      return Effect(() => {
        dest.writeHead(
          source.status,
          Object.fromEntries(source.headers.entries()),
        )
      })
        .tap(() => source.body.run(S.sink(dest)))
        .catchTag("WritableError", _ => Effect.fail(new HttpStreamError(_)))

    case "RawResponse":
      return Effect(() => {
        if (source.headers) {
          dest.writeHead(
            source.status,
            Object.fromEntries(source.headers.entries()),
          )
        } else {
          dest.writeHead(source.status)
        }
        dest.end(source.body)
      })

    case "EmptyResponse":
      return Effect(() => {
        dest.writeHead(
          source.status,
          source.headers
            ? Object.fromEntries(source.headers.entries())
            : undefined,
        )
        dest.end()
      })
  }
}

const requestUrl = (source: Http.IncomingMessage, port: number) => {
  const proto = requestProtocol(source)
  const host = requestHost(source, port)

  return `${proto}://${host}${source.url}`
}

const requestProtocol = (source: Http.IncomingMessage) => {
  if ((source.socket as any).encrypted) {
    return "https"
  } else if (typeof source.headers["x-forwarded-proto"] === "string") {
    return source.headers["x-forwarded-proto"].trim()
  }

  return "http"
}

const requestHost = (source: Http.IncomingMessage, port: number) => {
  if (typeof source.headers["x-forwarded-host"] === "string") {
    return source.headers["x-forwarded-host"].trim()
  } else if (typeof source.headers["host"] === "string") {
    return source.headers["host"].trim()
  }

  return `localhost:${port}`
}
