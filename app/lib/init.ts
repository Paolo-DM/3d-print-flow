import { hydrate } from "~/lib/db"
import { fromJSON, setPersist } from "~/lib/store"

let initialized = false

export async function initApp() {
  if (initialized) return
  initialized = true

  setPersist(false)
  const data = await hydrate()
  fromJSON(data)
  setPersist(true)
}

/** Reset initialization guard — used in tests */
export function _resetInit() {
  initialized = false
}
