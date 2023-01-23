import type { Effect } from "@effect/io/Effect"
import type { HttpApp } from "@effect-http/core"
import type { ListenOptions } from "net"
import {
  EarlyResponse,
  HttpResponse,
  HttpStreamError,
} from "@effect-http/core/Response"
import * as Http from "http"
import { Readable } from "stream"
import { LazyArg } from "@fp-ts/data/Function"
import { NodeHttpRequest } from "./internal/Request.js"
import * as S from "./internal/stream.js"
import { MultipartOptions } from "./internal/multipart.js"

export * from "./internal/HttpFs.js"

/**
 * @tsplus pipeable effect-http/HttpApp serveNode
 */
export const make =
  (
    makeServer: LazyArg<Http.Server>,
    options: ListenOptions &
      MultipartOptions & {
        port: number
        debug?: boolean
      },
  ) =>
  <R>(httpApp: HttpApp<R, EarlyResponse>): Effect<R, never, never> =>
    Effect.runtime<R>().flatMap((rt) =>
      Effect.asyncInterrupt<never, never, never>(() => {
        const server = makeServer()

        server.on("request", (request, response) => {
          rt.unsafeRun(
            httpApp(convertRequest(request, options))
              .catchTag("EarlyResponse", (_) => Effect.succeed(_.response))
              .flatMap((_) => handleResponse(_, response)),
            (exit) => {
              if (exit.isFailure()) {
                console.error("@effect-http/node", exit.cause.pretty())
                response.writeHead(500)
                response.end()
              }
            },
          )
        })

        server.listen(options)

        return Effect.async((resume) => {
          server.close(() => resume(Effect.unit()))
        })
      }),
    )

const convertRequest = (
  source: Http.IncomingMessage,
  {
    port,
    limits = {},
    multipartFieldTypes = ["application/json"],
  }: { port: number } & MultipartOptions,
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
  const headers: Record<string, string> =
    source.headers._tag === "Some"
      ? Object.fromEntries(source.headers.value.entries())
      : {}
  let body: unknown = undefined

  switch (source._tag) {
    case "TextResponse":
      headers["content-type"] = source.contentType
      body = source.body
      headers["content-length"] = Buffer.byteLength(source.body).toString()
      break

    case "FormDataResponse":
      return Effect(() => {
        const r = new Response(source.body)
        headers["content-type"] = r.headers.get("content-type")!
        dest.writeHead(source.status, headers)
        Readable.fromWeb(r.body as any).pipe(dest)
      })

    case "StreamResponse":
      headers["content-type"] = source.contentType
      if (source.contentLength._tag === "Some") {
        headers["content-length"] = source.contentLength.value.toString()
      }

      return Effect(() => {
        dest.writeHead(source.status, headers)
      })
        .tap(() => source.body.run(S.sink(dest)))
        .catchTag("WritableError", (e) => Effect.fail(new HttpStreamError(e)))

    case "RawResponse":
      body = source.body
      break
  }

  return Effect(() => {
    dest.writeHead(source.status, headers)
    dest.end(body)
  })
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
