import * as Mime from "mime-types"
import parseRange from "range-parser"
import * as Path from "node:path"

export const serveDirectory =
  (directory: string): HttpApp<HttpFs, HttpFsNotFound | HttpFsError> =>
  (request) => {
    const url = new URL(request.url)
    const path = Path.join(directory, Path.join("/", url.pathname))
    const contentType = Mime.lookup(path)

    const range = request.headers.get("range")
    const parsedRange = range ? parseRange(Infinity, range) : undefined
    const validRange = Array.isArray(parsedRange)

    return HttpResponse.file(path, {
      contentType: contentType || "application/octet-stream",
      range: validRange
        ? [parsedRange[0].start, parsedRange[1].end]
        : undefined,
    })
  }
