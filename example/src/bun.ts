import FMY from "find-my-way"

const router = FMY()

router.on("GET", "/", () => new Response("Hello!"))

Bun.serve({
  async fetch(req) {
    const route = router.find(req.method as any, req.url)
    const handle = route!.handler as any
    return handle()
  },
})
