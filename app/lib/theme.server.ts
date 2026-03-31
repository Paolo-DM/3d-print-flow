import { createCookie } from "react-router"

export type Theme = "dark" | "light"

export const themeCookie = createCookie("theme", {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365, // 1 year
})
