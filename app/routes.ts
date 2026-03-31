import { type RouteConfig, index, layout, route } from "@react-router/dev/routes"

export default [
  layout("routes/_queue.tsx", [
    index("routes/_queue.home.tsx"),
    route("figures", "routes/_queue.figures.tsx"),
  ]),
  route("catalog", "routes/catalog.tsx"),
  route("spools", "routes/spools.tsx"),
  route("completed", "routes/completed.tsx"),
  route("action/set-theme", "routes/action.set-theme.ts"),
] satisfies RouteConfig
