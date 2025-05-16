import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("opord/new", "routes/opord/new.tsx"),
  route("opord/:id", "routes/opord/$id.tsx"),
  route("doctrine", "routes/doctrine.tsx"),
  index("routes/home.tsx"),
] satisfies RouteConfig;
