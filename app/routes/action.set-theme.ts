import { data } from "react-router"

import { type Theme, themeCookie } from "~/lib/theme.server"

export async function action({ request }: { request: Request }) {
  const formData = await request.formData()
  const theme = formData.get("theme")

  if (theme !== "dark" && theme !== "light") {
    return data({ success: false }, { status: 400 })
  }

  return data(
    { success: true },
    {
      headers: {
        "Set-Cookie": await themeCookie.serialize(theme satisfies Theme),
      },
    },
  )
}
