import { type DBSchema, type IDBPDatabase, openDB } from "idb"
import { toast } from "sonner"

import {
  isValidFigureV1,
  migrateV1Figures,
  type FigureV1,
} from "~/lib/migration"
import type { Brand, Figure, QueueItem, Spool } from "~/lib/types"

interface PrintFlowDB extends DBSchema {
  spools: {
    key: string
    value: Spool
  }
  brands: {
    key: string
    value: Brand
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

type StoreName = "spools" | "brands" | "figures" | "queueItems"

let dbPromise: Promise<IDBPDatabase<PrintFlowDB>> | null = null

function getDB() {
  if (!dbPromise) {
    const opening = openDB<PrintFlowDB>("print-flow", 2, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          db.createObjectStore("spools", { keyPath: "id" })
          db.createObjectStore("figures", { keyPath: "id" })
          db.createObjectStore("queueItems", { keyPath: "id" })
        }
        if (oldVersion < 2) {
          db.createObjectStore("brands", { keyPath: "id" })
        }
        if (oldVersion === 1) {
          // Live-data migration: derive brands from v1 figures' franchise
          // text and rewire figures, in the same versionchange transaction.
          // Rows are read as unknown and narrowed through the v1 guard —
          // the current Figure type no longer has `franchise`.
          const figureStore = tx.objectStore("figures")
          const rows: unknown[] = await figureStore.getAll()
          const v1Figures: Record<string, FigureV1> = {}
          for (const row of rows) {
            if (isValidFigureV1(row)) v1Figures[row.id] = row
          }
          const { brands, figures } = migrateV1Figures(v1Figures)
          const brandStore = tx.objectStore("brands")
          for (const brand of Object.values(brands)) {
            await brandStore.put(brand)
          }
          for (const figure of Object.values(figures)) {
            await figureStore.put(figure)
          }
        }
      },
      blocked() {
        // An old connection (e.g. a pre-upgrade tab) is holding the database
        // and delaying our upgrade — tell the user instead of hanging silently.
        toast.error(
          "Database update blocked — close other 3D Print Flow tabs",
          {
            id: "db-blocked",
          }
        )
      },
      blocking() {
        // A newer version wants to open elsewhere — close this connection so
        // the upgrade there is not stalled indefinitely.
        const stale = dbPromise
        dbPromise = null
        void stale?.then((db) => db.close())
      },
      terminated() {
        // Abnormally closed by the browser — drop the cached promise so the
        // next call reopens the database.
        dbPromise = null
      },
    })
    dbPromise = opening
    opening.catch(() => {
      // A failed open (migration failure, VersionError, ...) must not stay
      // cached, or no later attempt — e.g. the persistence-failure toast's
      // Retry — could ever succeed. The rejection still reaches callers.
      if (dbPromise === opening) dbPromise = null
    })
  }
  return dbPromise
}

export async function hydrate(): Promise<{
  spools: Record<string, Spool>
  brands: Record<string, Brand>
  figures: Record<string, Figure>
  queueItems: Record<string, QueueItem>
}> {
  const db = await getDB()
  const [spoolList, brandList, figureList, queueItemList] = await Promise.all([
    db.getAll("spools"),
    db.getAll("brands"),
    db.getAll("figures"),
    db.getAll("queueItems"),
  ])

  const spools: Record<string, Spool> = {}
  for (const s of spoolList) spools[s.id] = s

  const brands: Record<string, Brand> = {}
  for (const b of brandList) brands[b.id] = b

  const figures: Record<string, Figure> = {}
  for (const f of figureList) figures[f.id] = f

  const queueItems: Record<string, QueueItem> = {}
  for (const q of queueItemList) queueItems[q.id] = q

  return { spools, brands, figures, queueItems }
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
  brands: Record<string, Brand>
  figures: Record<string, Figure>
  queueItems: Record<string, QueueItem>
}) {
  const db = await getDB()
  const tx = db.transaction(
    ["spools", "brands", "figures", "queueItems"],
    "readwrite"
  )

  const spoolStore = tx.objectStore("spools")
  const brandStore = tx.objectStore("brands")
  const figureStore = tx.objectStore("figures")
  const queueItemStore = tx.objectStore("queueItems")

  await Promise.all([
    spoolStore.clear(),
    brandStore.clear(),
    figureStore.clear(),
    queueItemStore.clear(),
  ])

  for (const spool of Object.values(data.spools)) {
    await spoolStore.put(spool)
  }
  for (const brand of Object.values(data.brands)) {
    await brandStore.put(brand)
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
