import { type DBSchema, type IDBPDatabase, openDB } from "idb"
import { toast } from "sonner"

import {
  isValidFigureV1,
  isValidQueueItemLegacy,
  isValidQueueItemV3,
  deterministicUUID,
  makeUniqueOrderReference,
  migrateLegacyQueueItem,
  migrateV1Figures,
  migrateV3QueueItems,
  orderReferenceKey,
  type FigureV1,
  type QueueItemV3,
} from "~/lib/migration"
import {
  STARTER_BRANDS,
  STARTER_FIGURES,
  STARTER_SPOOLS,
} from "~/lib/starter-data"
import type { Brand, Figure, Order, QueueItem, Spool } from "~/lib/types"

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
  orders: {
    key: string
    value: Order
  }
}

type StoreName = "spools" | "brands" | "figures" | "orders" | "queueItems"

export interface PrintFlowData {
  spools: Record<string, Spool>
  brands: Record<string, Brand>
  figures: Record<string, Figure>
  orders: Record<string, Order>
  queueItems: Record<string, QueueItem>
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let dbPromise: Promise<IDBPDatabase<PrintFlowDB>> | null = null

function getDB() {
  if (!dbPromise) {
    const opening = openDB<PrintFlowDB>("print-flow", 4, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          db.createObjectStore("spools", { keyPath: "id" })
          db.createObjectStore("figures", { keyPath: "id" })
          db.createObjectStore("queueItems", { keyPath: "id" })
        }
        if (oldVersion < 2) {
          db.createObjectStore("brands", { keyPath: "id" })
        }
        if (oldVersion < 4) {
          db.createObjectStore("orders", { keyPath: "id" })
        }
        if (oldVersion === 0) {
          try {
            const spoolStore = tx.objectStore("spools")
            const brandStore = tx.objectStore("brands")
            const figureStore = tx.objectStore("figures")

            for (const spool of STARTER_SPOOLS) {
              await spoolStore.put(spool)
            }
            for (const brand of STARTER_BRANDS) {
              await brandStore.put(brand)
            }
            for (const figure of STARTER_FIGURES) {
              await figureStore.put(figure)
            }
          } catch {
            // `idb` does not await an async upgrade callback. Abort explicitly
            // so a synchronous request failure cannot commit a partial seed.
            void tx.done.catch(() => {})
            try {
              tx.abort()
            } catch {
              // An asynchronous request failure may already have aborted it.
            }
            return
          }
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
        if (oldVersion > 0 && oldVersion < 3) {
          // Schema v3 queue mapping, in the same versionchange transaction:
          // legacy rows become quantity 1 with completed colors as counts of 1
          // and completedAt preserved verbatim. Rows are read as unknown and
          // narrowed through the legacy guard — rows failing it are deleted,
          // never left in old shape to hydrate as v3. Pre-existing duplicate
          // rows are preserved one-for-one, never consolidated.
          const queueStore = tx.objectStore("queueItems")
          const rows: unknown[] = await queueStore.getAll()
          await queueStore.clear()
          for (const row of rows) {
            if (isValidQueueItemLegacy(row)) {
              await queueStore.put(
                migrateLegacyQueueItem(row) as unknown as QueueItem
              )
            }
          }
        }
        if (oldVersion < 4) {
          // Final v4 conversion runs after the prior schema steps. Every
          // legacy order row gets its own deterministic first-class order;
          // stock rows keep a null orderId and progress is copied verbatim.
          const figureRows = await tx.objectStore("figures").getAll()
          const figures: Record<string, Figure> = {}
          for (const figure of figureRows) figures[figure.id] = figure

          const queueStore = tx.objectStore("queueItems")
          const rows: unknown[] = await queueStore.getAll()
          const v3Rows: Record<string, QueueItemV3> = {}
          for (const row of rows) {
            if (isValidQueueItemV3(row)) v3Rows[row.id] = row
          }
          const migrated = migrateV3QueueItems(v3Rows, figures)
          await queueStore.clear()
          for (const order of Object.values(migrated.orders)) {
            await tx.objectStore("orders").put(order)
          }
          for (const queueItem of Object.values(migrated.queueItems)) {
            await queueStore.put(queueItem)
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

export async function hydrate(): Promise<PrintFlowData> {
  const db = await getDB()
  const tx = db.transaction(
    ["spools", "brands", "figures", "orders", "queueItems"],
    "readwrite"
  )
  const [spoolList, brandList, figureList, orderList, queueItemList] =
    await Promise.all([
      tx.objectStore("spools").getAll(),
      tx.objectStore("brands").getAll(),
      tx.objectStore("figures").getAll(),
      tx.objectStore("orders").getAll(),
      tx.objectStore("queueItems").getAll(),
    ])

  const orders: Record<string, Order> = {}
  for (const order of orderList) orders[order.id] = order

  // A v4 database can still contain dangling links after a crashed or older
  // build. Repair one order per missing id, grouping every shared link.
  const usedReferences = new Set(
    orderList.map((order) => orderReferenceKey(order.reference))
  )
  const recoveredIds = new Map<string, string>()
  const recoveredAt = new Date().toISOString()
  for (let index = 0; index < queueItemList.length; index += 1) {
    const queueItem = queueItemList[index] as QueueItem & { orderId?: unknown }
    const rawOrderId = queueItem.orderId
    if (rawOrderId === null) continue
    const validOrderId =
      typeof rawOrderId === "string" && UUID_PATTERN.test(rawOrderId)
    if (validOrderId && orders[rawOrderId]) continue

    const recoveryKey = validOrderId
      ? `uuid:${rawOrderId}`
      : typeof rawOrderId === "string"
        ? `invalid:${rawOrderId}`
        : `row:${queueItem.id}`
    const previouslyRecoveredId = recoveredIds.get(recoveryKey)
    let orderId = validOrderId
      ? rawOrderId
      : (previouslyRecoveredId ??
        deterministicUUID(`recovered-order:${recoveryKey}`))
    let collision = 2
    while (
      !validOrderId &&
      previouslyRecoveredId === undefined &&
      orders[orderId]
    ) {
      orderId = deterministicUUID(`recovered-order:${recoveryKey}:${collision}`)
      collision += 1
    }
    recoveredIds.set(recoveryKey, orderId)

    if (!orders[orderId]) {
      const sourceIdentity =
        typeof rawOrderId === "string" && rawOrderId.length > 0
          ? rawOrderId
          : queueItem.id
      const reference = makeUniqueOrderReference(
        `Recovered · ${sourceIdentity}`,
        usedReferences
      )
      const recovered: Order = {
        id: orderId,
        reference,
        customerName: null,
        platform: null,
        dueDate: null,
        notes: "Recovered from a queue link whose order record was missing.",
        createdAt: recoveredAt,
      }
      orders[recovered.id] = recovered
      await tx.objectStore("orders").put(recovered)
    }

    if (rawOrderId !== orderId) {
      const repaired = { ...queueItem, orderId } as QueueItem
      queueItemList[index] = repaired
      await tx.objectStore("queueItems").put(repaired)
    }
  }
  await tx.done

  const spools: Record<string, Spool> = {}
  for (const s of spoolList) spools[s.id] = s

  const brands: Record<string, Brand> = {}
  for (const b of brandList) brands[b.id] = b

  const figures: Record<string, Figure> = {}
  for (const f of figureList) figures[f.id] = f

  const queueItems: Record<string, QueueItem> = {}
  for (const q of queueItemList) queueItems[q.id] = q

  return { spools, brands, figures, orders, queueItems }
}

export async function writeStores(data: {
  spools?: Map<string, Spool>
  brands?: Map<string, Brand>
  figures?: Map<string, Figure>
  orders?: Map<string, Order>
  queueItems?: Map<string, QueueItem>
}) {
  const db = await getDB()
  const names = Object.keys(data) as StoreName[]
  if (names.length === 0) return
  const tx = db.transaction(names, "readwrite")
  try {
    if (data.spools) {
      const store = tx.objectStore("spools")
      await store.clear()
      for (const item of data.spools.values()) await store.put(item)
    }
    if (data.brands) {
      const store = tx.objectStore("brands")
      await store.clear()
      for (const item of data.brands.values()) await store.put(item)
    }
    if (data.figures) {
      const store = tx.objectStore("figures")
      await store.clear()
      for (const item of data.figures.values()) await store.put(item)
    }
    if (data.orders) {
      const store = tx.objectStore("orders")
      await store.clear()
      for (const item of data.orders.values()) await store.put(item)
    }
    if (data.queueItems) {
      const store = tx.objectStore("queueItems")
      await store.clear()
      for (const item of data.queueItems.values()) await store.put(item)
    }
    await tx.done
  } catch (error) {
    try {
      tx.abort()
    } catch {
      // A failed request may already have aborted the transaction.
    }
    await tx.done.catch(() => {})
    throw error
  }
}

/** Backward-compatible single-store helper used by focused DB tests. */
export async function writeStore<N extends StoreName>(
  name: N,
  map: Map<string, PrintFlowDB[N]["value"]>
) {
  await writeStores({ [name]: map } as Parameters<typeof writeStores>[0])
}

export async function replaceAll(data: PrintFlowData) {
  const db = await getDB()
  const tx = db.transaction(
    ["spools", "brands", "figures", "orders", "queueItems"],
    "readwrite"
  )

  const spoolStore = tx.objectStore("spools")
  const brandStore = tx.objectStore("brands")
  const figureStore = tx.objectStore("figures")
  const orderStore = tx.objectStore("orders")
  const queueItemStore = tx.objectStore("queueItems")

  try {
    await Promise.all([
      spoolStore.clear(),
      brandStore.clear(),
      figureStore.clear(),
      orderStore.clear(),
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
    for (const order of Object.values(data.orders)) {
      await orderStore.put(order)
    }
    for (const queueItem of Object.values(data.queueItems)) {
      await queueItemStore.put(queueItem)
    }

    await tx.done
  } catch (error) {
    try {
      tx.abort()
    } catch {
      // A failed request may already have aborted the transaction.
    }
    await tx.done.catch(() => {})
    throw error
  }
}

/** Reset the cached DB promise — used in tests */
export function _resetDB() {
  dbPromise = null
}
