import { type DBSchema, type IDBPDatabase, openDB } from "idb"

import type { Figure, QueueItem, Spool } from "~/lib/types"

interface PrintFlowDB extends DBSchema {
  spools: {
    key: string
    value: Spool
  }
  figures: {
    key: string
    value: Figure
  }
  queueItems: {
    key: string
    value: QueueItem
  }
}

type StoreName = "spools" | "figures" | "queueItems"

let dbPromise: Promise<IDBPDatabase<PrintFlowDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PrintFlowDB>("print-flow", 1, {
      upgrade(db) {
        db.createObjectStore("spools", { keyPath: "id" })
        db.createObjectStore("figures", { keyPath: "id" })
        db.createObjectStore("queueItems", { keyPath: "id" })
      },
    })
  }
  return dbPromise
}

export async function hydrate(): Promise<{
  spools: Record<string, Spool>
  figures: Record<string, Figure>
  queueItems: Record<string, QueueItem>
}> {
  const db = await getDB()
  const [spoolList, figureList, queueItemList] = await Promise.all([
    db.getAll("spools"),
    db.getAll("figures"),
    db.getAll("queueItems"),
  ])

  const spools: Record<string, Spool> = {}
  for (const s of spoolList) spools[s.id] = s

  const figures: Record<string, Figure> = {}
  for (const f of figureList) figures[f.id] = f

  const queueItems: Record<string, QueueItem> = {}
  for (const q of queueItemList) queueItems[q.id] = q

  return { spools, figures, queueItems }
}

export async function writeStore<N extends StoreName>(
  name: N,
  map: Map<string, PrintFlowDB[N]["value"]>
) {
  const db = await getDB()
  const tx = db.transaction(name, "readwrite")
  const store = tx.objectStore(name)
  await store.clear()
  for (const item of map.values()) {
    await store.put(item)
  }
  await tx.done
}

export async function replaceAll(data: {
  spools: Record<string, Spool>
  figures: Record<string, Figure>
  queueItems: Record<string, QueueItem>
}) {
  const db = await getDB()
  const tx = db.transaction(["spools", "figures", "queueItems"], "readwrite")

  const spoolStore = tx.objectStore("spools")
  const figureStore = tx.objectStore("figures")
  const queueItemStore = tx.objectStore("queueItems")

  await Promise.all([
    spoolStore.clear(),
    figureStore.clear(),
    queueItemStore.clear(),
  ])

  for (const spool of Object.values(data.spools)) {
    await spoolStore.put(spool)
  }
  for (const figure of Object.values(data.figures)) {
    await figureStore.put(figure)
  }
  for (const queueItem of Object.values(data.queueItems)) {
    await queueItemStore.put(queueItem)
  }

  await tx.done
}

/** Reset the cached DB promise — used in tests */
export function _resetDB() {
  dbPromise = null
}
