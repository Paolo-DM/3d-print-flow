// @vitest-environment jsdom
import { describe, expect, it } from "vitest"

import {
  createFigure,
  createOrder,
  createQueueItem,
  createSpool,
} from "~/lib/test-utils"
import {
  computeAffectedQueueItems,
  computeColorRanking,
  computeCompletionStatus,
  computeFigureProgress,
  computeOrderProgress,
  computeQueueItemIssue,
  computeQueueSummary,
  deriveOrderState,
  getReferencingFigures,
  isCompletedToday,
  isFinishedOrderLine,
  isOrderOverdue,
  parseQueueScope,
  sortFinishedLines,
  sortOrders,
} from "~/lib/derived"

describe("getReferencingFigures", () => {
  it("returns empty array when no figures reference the spool", () => {
    const spool = createSpool({ id: "spool-1" })
    const figure = createFigure({ id: "fig-1", requiredColors: ["spool-2"] })
    const figures = new Map([["fig-1", figure]])

    const result = getReferencingFigures(spool.id, figures)

    expect(result).toEqual([])
  })

  it("returns matching figures when spool ID is in requiredColors", () => {
    const spool = createSpool({ id: "spool-1" })
    const figure1 = createFigure({
      id: "fig-1",
      name: "Naruto",
      requiredColors: ["spool-1", "spool-2"],
    })
    const figure2 = createFigure({
      id: "fig-2",
      name: "Goku",
      requiredColors: ["spool-3"],
    })
    const figure3 = createFigure({
      id: "fig-3",
      name: "Luffy",
      requiredColors: ["spool-1"],
    })
    const figures = new Map([
      ["fig-1", figure1],
      ["fig-2", figure2],
      ["fig-3", figure3],
    ])

    const result = getReferencingFigures(spool.id, figures)

    expect(result).toEqual([figure1, figure3])
  })

  it("returns empty array when figures map is empty", () => {
    const figures = new Map()

    const result = getReferencingFigures("spool-1", figures)

    expect(result).toEqual([])
  })
})

describe("computeAffectedQueueItems", () => {
  it("returns matching queue items", () => {
    const q1 = createQueueItem({ id: "q1", figureId: "fig-1" })
    const q2 = createQueueItem({ id: "q2", figureId: "fig-1" })
    const q3 = createQueueItem({ id: "q3", figureId: "fig-2" })
    const queueItems = new Map([
      ["q1", q1],
      ["q2", q2],
      ["q3", q3],
    ])

    const result = computeAffectedQueueItems("fig-1", queueItems)

    expect(result).toEqual([q1, q2])
  })

  it("returns empty array when no matches", () => {
    const q1 = createQueueItem({ id: "q1", figureId: "fig-2" })
    const queueItems = new Map([["q1", q1]])

    const result = computeAffectedQueueItems("fig-1", queueItems)

    expect(result).toEqual([])
  })

  it("returns empty array for empty queueItems Map", () => {
    const result = computeAffectedQueueItems("fig-1", new Map())

    expect(result).toEqual([])
  })
})

describe("computeColorRanking", () => {
  it("sorts by incomplete chip count descending", () => {
    const s1 = createSpool({ id: "s1", name: "Red", hex: "#FF0000" })
    const s2 = createSpool({ id: "s2", name: "Blue", hex: "#0000FF" })
    const fig1 = createFigure({ id: "fig-1", requiredColors: ["s1", "s2"] })
    const fig2 = createFigure({ id: "fig-2", requiredColors: ["s1"] })
    const q1 = createQueueItem({
      id: "q1",
      figureId: "fig-1",
      completedCounts: {},
    })
    const q2 = createQueueItem({
      id: "q2",
      figureId: "fig-2",
      completedCounts: {},
    })

    const spools = new Map([
      ["s1", s1],
      ["s2", s2],
    ])
    const figures = new Map([
      ["fig-1", fig1],
      ["fig-2", fig2],
    ])
    const queueItems = new Map([
      ["q1", q1],
      ["q2", q2],
    ])

    const result = computeColorRanking(spools, figures, queueItems)

    expect(result[0].spool.id).toBe("s1")
    expect(result[0].count).toBe(2)
    expect(result[1].spool.id).toBe("s2")
    expect(result[1].count).toBe(1)
  })

  it("excludes colors with zero incomplete chips", () => {
    const s1 = createSpool({ id: "s1" })
    const s2 = createSpool({ id: "s2" })
    const fig = createFigure({ id: "fig-1", requiredColors: ["s1", "s2"] })
    const q1 = createQueueItem({
      id: "q1",
      figureId: "fig-1",
      completedCounts: { s1: 1 },
    })

    const spools = new Map([
      ["s1", s1],
      ["s2", s2],
    ])
    const figures = new Map([["fig-1", fig]])
    const queueItems = new Map([["q1", q1]])

    const result = computeColorRanking(spools, figures, queueItems)

    expect(result).toHaveLength(1)
    expect(result[0].spool.id).toBe("s2")
  })

  it("returns empty array for empty queue", () => {
    const s1 = createSpool({ id: "s1" })
    const spools = new Map([["s1", s1]])
    const figures = new Map()
    const queueItems = new Map()

    const result = computeColorRanking(spools, figures, queueItems)

    expect(result).toEqual([])
  })

  it("tracks hasOrders when order-type queue items need the color", () => {
    const s1 = createSpool({ id: "s1" })
    const fig = createFigure({ id: "fig-1", requiredColors: ["s1"] })
    const q1 = createQueueItem({
      id: "q1",
      figureId: "fig-1",
      orderId: "00000000-0000-4000-8000-000000000001",
      completedCounts: {},
    })

    const spools = new Map([["s1", s1]])
    const figures = new Map([["fig-1", fig]])
    const queueItems = new Map([["q1", q1]])

    const result = computeColorRanking(spools, figures, queueItems)

    expect(result[0].hasOrders).toBe(true)
  })

  it("excludes orphaned spool references not in spools Map", () => {
    const s1 = createSpool({ id: "s1" })
    const fig = createFigure({
      id: "fig-1",
      requiredColors: ["s1", "s-deleted"],
    })
    const q1 = createQueueItem({
      id: "q1",
      figureId: "fig-1",
      completedCounts: {},
    })

    const spools = new Map([["s1", s1]])
    const figures = new Map([["fig-1", fig]])
    const queueItems = new Map([["q1", q1]])

    const result = computeColorRanking(spools, figures, queueItems)

    expect(result).toHaveLength(1)
    expect(result[0].spool.id).toBe("s1")
  })

  it("hasOrders is false when only stock-type queue items", () => {
    const s1 = createSpool({ id: "s1" })
    const fig = createFigure({ id: "fig-1", requiredColors: ["s1"] })
    const q1 = createQueueItem({
      id: "q1",
      figureId: "fig-1",
      orderId: null,
      completedCounts: {},
    })

    const spools = new Map([["s1", s1]])
    const figures = new Map([["fig-1", fig]])
    const queueItems = new Map([["q1", q1]])

    const result = computeColorRanking(spools, figures, queueItems)

    expect(result[0].hasOrders).toBe(false)
  })

  it("weights by outstanding copies: Buzz ×2 + Woody ×1 rank Green at 3; one green tap drops it to 2", () => {
    const green = createSpool({ id: "s-green", name: "Green" })
    const buzz = createFigure({ id: "fig-buzz", requiredColors: ["s-green"] })
    const woody = createFigure({ id: "fig-woody", requiredColors: ["s-green"] })
    const buzzQi = createQueueItem({
      id: "q-buzz",
      figureId: "fig-buzz",
      quantity: 2,
      completedCounts: {},
    })
    const woodyQi = createQueueItem({
      id: "q-woody",
      figureId: "fig-woody",
      quantity: 1,
      completedCounts: {},
    })

    const spools = new Map([["s-green", green]])
    const figures = new Map([
      ["fig-buzz", buzz],
      ["fig-woody", woody],
    ])
    const queueItems = new Map([
      ["q-buzz", buzzQi],
      ["q-woody", woodyQi],
    ])

    expect(computeColorRanking(spools, figures, queueItems)[0].count).toBe(3)

    queueItems.set("q-buzz", {
      ...buzzQi,
      completedCounts: { "s-green": 1 },
    })
    expect(computeColorRanking(spools, figures, queueItems)[0].count).toBe(2)
  })

  it("excludes a spool once every copy of it is printed", () => {
    const s1 = createSpool({ id: "s1" })
    const fig = createFigure({ id: "fig-1", requiredColors: ["s1"] })
    const q1 = createQueueItem({
      id: "q1",
      figureId: "fig-1",
      quantity: 2,
      completedCounts: { s1: 2 },
    })

    const result = computeColorRanking(
      new Map([["s1", s1]]),
      new Map([["fig-1", fig]]),
      new Map([["q1", q1]])
    )

    expect(result).toEqual([])
  })

  it("hasOrders flags on any order entry with outstanding copies", () => {
    const s1 = createSpool({ id: "s1" })
    const fig = createFigure({ id: "fig-1", requiredColors: ["s1"] })
    const partialOrder = createQueueItem({
      id: "q1",
      figureId: "fig-1",
      orderId: "00000000-0000-4000-8000-000000000001",
      quantity: 2,
      completedCounts: { s1: 1 },
    })

    const result = computeColorRanking(
      new Map([["s1", s1]]),
      new Map([["fig-1", fig]]),
      new Map([["q1", partialOrder]])
    )

    expect(result[0].count).toBe(1)
    expect(result[0].hasOrders).toBe(true)
  })

  it("breaks equal counts by spool name ascending, then id", () => {
    const zed = createSpool({ id: "s-a", name: "Zed" })
    const amber1 = createSpool({ id: "s-c", name: "Amber" })
    const amber2 = createSpool({ id: "s-b", name: "Amber" })
    const fig = createFigure({
      id: "fig-1",
      requiredColors: ["s-a", "s-c", "s-b"],
    })
    const q1 = createQueueItem({
      id: "q1",
      figureId: "fig-1",
      completedCounts: {},
    })

    const result = computeColorRanking(
      new Map([
        ["s-a", zed],
        ["s-c", amber1],
        ["s-b", amber2],
      ]),
      new Map([["fig-1", fig]]),
      new Map([["q1", q1]])
    )

    // equal counts: "Amber" before "Zed"; the two Ambers order by id
    expect(result.map((entry) => entry.spool.id)).toEqual(["s-b", "s-c", "s-a"])
  })

  it("ignores stray count keys outside requiredColors", () => {
    const s1 = createSpool({ id: "s1" })
    const fig = createFigure({ id: "fig-1", requiredColors: ["s1"] })
    const q1 = createQueueItem({
      id: "q1",
      figureId: "fig-1",
      quantity: 1,
      completedCounts: { "s-stale": 1 },
    })

    const result = computeColorRanking(
      new Map([["s1", s1]]),
      new Map([["fig-1", fig]]),
      new Map([["q1", q1]])
    )

    expect(result).toHaveLength(1)
    expect(result[0].spool.id).toBe("s1")
    expect(result[0].count).toBe(1)
  })
})

describe("computeFigureProgress", () => {
  it("sums over requiredColors only (stale count keys never inflate progress)", () => {
    const qi = createQueueItem({
      completedCounts: { s1: 1, "s-stale": 1 },
    })
    const fig = createFigure({ requiredColors: ["s1", "s2", "s3"] })

    const result = computeFigureProgress(qi, fig)

    expect(result).toEqual({ completed: 1, total: 3 })
  })

  it("returns { completed: 0, total: 0 } for null figure", () => {
    const qi = createQueueItem({ completedCounts: { s1: 1 } })

    const result = computeFigureProgress(qi, null)

    expect(result).toEqual({ completed: 0, total: 0 })
  })

  it("returns { completed: 0, total: 0 } for undefined figure", () => {
    const qi = createQueueItem({ completedCounts: { s1: 1 } })

    const result = computeFigureProgress(qi, undefined)

    expect(result).toEqual({ completed: 0, total: 0 })
  })

  it("total is colors × quantity; completed sums per-color counts", () => {
    const qi = createQueueItem({
      quantity: 2,
      completedCounts: { s1: 1 },
    })
    const fig = createFigure({ requiredColors: ["s1", "s2"] })

    expect(computeFigureProgress(qi, fig)).toEqual({ completed: 1, total: 4 })
  })

  it("clamps a stray count above quantity when summing", () => {
    const qi = createQueueItem({
      quantity: 2,
      completedCounts: { s1: 5 },
    })
    const fig = createFigure({ requiredColors: ["s1", "s2"] })

    expect(computeFigureProgress(qi, fig)).toEqual({ completed: 2, total: 4 })
  })

  it("a missing count key reads as 0", () => {
    const qi = createQueueItem({ quantity: 3, completedCounts: {} })
    const fig = createFigure({ requiredColors: ["s1"] })

    expect(computeFigureProgress(qi, fig)).toEqual({ completed: 0, total: 3 })
  })
})

describe("computeCompletionStatus", () => {
  it("returns true only when all required colors are completed", () => {
    const qi = createQueueItem({ completedCounts: { s1: 1, s2: 1 } })
    const fig = createFigure({ requiredColors: ["s1", "s2"] })

    expect(computeCompletionStatus(qi, fig)).toBe(true)
  })

  it("returns false when not all required colors are completed", () => {
    const qi = createQueueItem({ completedCounts: { s1: 1 } })
    const fig = createFigure({ requiredColors: ["s1", "s2"] })

    expect(computeCompletionStatus(qi, fig)).toBe(false)
  })

  it("returns false for figure with zero requiredColors", () => {
    const qi = createQueueItem({ completedCounts: {} })
    const fig = createFigure({ requiredColors: [] })

    expect(computeCompletionStatus(qi, fig)).toBe(false)
  })

  it("returns false for null figure", () => {
    const qi = createQueueItem({ completedCounts: { s1: 1 } })

    expect(computeCompletionStatus(qi, null)).toBe(false)
  })

  it("requires every required color to reach quantity", () => {
    const fig = createFigure({ requiredColors: ["s1", "s2"] })
    const partial = createQueueItem({
      quantity: 2,
      completedCounts: { s1: 2, s2: 1 },
    })
    const full = createQueueItem({
      quantity: 2,
      completedCounts: { s1: 2, s2: 2 },
    })

    expect(computeCompletionStatus(partial, fig)).toBe(false)
    expect(computeCompletionStatus(full, fig)).toBe(true)
  })

  it("stale count keys never make an entry complete", () => {
    const fig = createFigure({ requiredColors: ["s1"] })
    const qi = createQueueItem({
      quantity: 1,
      completedCounts: { "s-stale": 1 },
    })

    expect(computeCompletionStatus(qi, fig)).toBe(false)
  })
})

describe("isCompletedToday", () => {
  it("returns true when completedAt is on the same local day", () => {
    const qi = createQueueItem({
      completedAt: new Date(2026, 2, 31, 8, 30).toISOString(),
    })

    expect(isCompletedToday(qi, new Date(2026, 2, 31, 18, 0))).toBe(true)
  })

  it("returns false when completedAt is on a different day", () => {
    const qi = createQueueItem({
      completedAt: new Date(2026, 2, 30, 8, 30).toISOString(),
    })

    expect(isCompletedToday(qi, new Date(2026, 2, 31, 18, 0))).toBe(false)
  })

  it("returns false when completedAt is null", () => {
    const qi = createQueueItem({ completedAt: null })

    expect(isCompletedToday(qi, new Date(2026, 2, 31, 18, 0))).toBe(false)
  })
})

describe("order work state and issues", () => {
  const orderId = "00000000-0000-4000-8000-000000000001"
  const spool = createSpool({ id: "s1" })

  it("derives Draft, Active, Ready, and all three Blocked causes", () => {
    const figures = new Map([
      ["active", createFigure({ id: "active", requiredColors: ["s1"] })],
      ["empty", createFigure({ id: "empty", requiredColors: [] })],
      [
        "missing-spool",
        createFigure({ id: "missing-spool", requiredColors: ["gone"] }),
      ],
    ])
    const spools = new Map([[spool.id, spool]])

    expect(deriveOrderState(orderId, new Map(), figures, spools)).toBe("draft")

    const active = createQueueItem({
      id: "q-active",
      figureId: "active",
      orderId,
    })
    expect(
      deriveOrderState(orderId, new Map([[active.id, active]]), figures, spools)
    ).toBe("active")

    const ready = {
      ...active,
      completedCounts: { s1: 1 },
      completedAt: "2026-08-30T12:00:00.000Z",
    }
    expect(
      deriveOrderState(orderId, new Map([[ready.id, ready]]), figures, spools)
    ).toBe("ready")

    for (const figureId of ["gone", "empty", "missing-spool"]) {
      const row = createQueueItem({ id: `q-${figureId}`, figureId, orderId })
      expect(
        deriveOrderState(orderId, new Map([[row.id, row]]), figures, spools)
      ).toBe("blocked")
    }
  })

  it("reports the exact repairable reason for each Blocked line", () => {
    const missing = createQueueItem({ figureId: "gone", orderId })
    expect(computeQueueItemIssue(missing, new Map(), new Map())?.type).toBe(
      "missing-figure"
    )

    const emptyFigure = createFigure({ id: "empty", requiredColors: [] })
    const empty = createQueueItem({ figureId: emptyFigure.id, orderId })
    expect(
      computeQueueItemIssue(
        empty,
        new Map([[emptyFigure.id, emptyFigure]]),
        new Map()
      )?.type
    ).toBe("no-colors")

    const missingSpoolFigure = createFigure({
      id: "needs-spool",
      requiredColors: ["gone"],
    })
    const missingSpool = createQueueItem({
      figureId: missingSpoolFigure.id,
      orderId,
    })
    const issue = computeQueueItemIssue(
      missingSpool,
      new Map([[missingSpoolFigure.id, missingSpoolFigure]]),
      new Map()
    )
    expect(issue).toMatchObject({
      type: "missing-spool",
      spoolIds: ["gone"],
    })
  })

  it("sums progress across every order line and quantity", () => {
    const figures = new Map([
      ["a", createFigure({ id: "a", requiredColors: ["s1", "s2"] })],
      ["b", createFigure({ id: "b", requiredColors: ["s1"] })],
    ])
    const rows = new Map([
      [
        "qa",
        createQueueItem({
          id: "qa",
          figureId: "a",
          orderId,
          quantity: 2,
          completedCounts: { s1: 2, s2: 1 },
        }),
      ],
      [
        "qb",
        createQueueItem({
          id: "qb",
          figureId: "b",
          orderId,
          completedCounts: { s1: 1 },
        }),
      ],
    ])

    expect(computeOrderProgress(orderId, rows, figures)).toEqual({
      completed: 4,
      total: 5,
    })
  })
})

describe("isFinishedOrderLine", () => {
  const orderId = "00000000-0000-4000-8000-000000000001"
  const spool = createSpool({ id: "s1" })
  const spools = new Map([[spool.id, spool]])
  const figure = createFigure({ id: "f1", requiredColors: ["s1"] })
  const figures = new Map([[figure.id, figure]])

  function toMap(...rows: ReturnType<typeof createQueueItem>[]) {
    return new Map(rows.map((row) => [row.id, row]))
  }

  it("retains a complete line while an incomplete sibling keeps the order active", () => {
    const finished = createQueueItem({
      id: "q-finished",
      figureId: "f1",
      orderId,
      completedCounts: { s1: 1 },
    })
    const sibling = createQueueItem({
      id: "q-sibling",
      figureId: "f1",
      orderId,
      completedCounts: {},
    })
    const queueItems = toMap(finished, sibling)

    expect(isFinishedOrderLine(finished, queueItems, figures, spools)).toBe(
      true
    )
    expect(isFinishedOrderLine(sibling, queueItems, figures, spools)).toBe(
      false
    )
  })

  it("retains a complete line while a broken sibling keeps the order blocked", () => {
    const finished = createQueueItem({
      id: "q-finished",
      figureId: "f1",
      orderId,
      completedCounts: { s1: 1 },
    })
    const broken = createQueueItem({
      id: "q-broken",
      figureId: "gone",
      orderId,
    })
    const queueItems = toMap(finished, broken)

    expect(deriveOrderState(orderId, queueItems, figures, spools)).toBe(
      "blocked"
    )
    expect(isFinishedOrderLine(finished, queueItems, figures, spools)).toBe(
      true
    )
    expect(isFinishedOrderLine(broken, queueItems, figures, spools)).toBe(false)
  })

  it("releases every line once the parent order is Ready", () => {
    const finished = createQueueItem({
      id: "q-finished",
      figureId: "f1",
      orderId,
      completedCounts: { s1: 1 },
    })
    const queueItems = toMap(finished)

    expect(deriveOrderState(orderId, queueItems, figures, spools)).toBe("ready")
    expect(isFinishedOrderLine(finished, queueItems, figures, spools)).toBe(
      false
    )
  })

  it("never retains a complete stock line", () => {
    const stock = createQueueItem({
      id: "q-stock",
      figureId: "f1",
      orderId: null,
      completedCounts: { s1: 1 },
    })

    expect(isFinishedOrderLine(stock, toMap(stock), figures, spools)).toBe(
      false
    )
  })

  it("never retains an orphaned line whose figure is missing", () => {
    const orphaned = createQueueItem({
      id: "q-orphaned",
      figureId: "gone",
      orderId,
      completedCounts: { s1: 1 },
    })

    expect(
      isFinishedOrderLine(orphaned, toMap(orphaned), figures, spools)
    ).toBe(false)
  })

  it("never retains an invalid line: no required colors or missing spools", () => {
    const noColors = createFigure({ id: "f-empty", requiredColors: [] })
    const missingSpool = createFigure({
      id: "f-missing-spool",
      requiredColors: ["gone"],
    })
    const allFigures = new Map([
      ...figures,
      [noColors.id, noColors],
      [missingSpool.id, missingSpool],
    ])
    const emptyLine = createQueueItem({
      id: "q-empty",
      figureId: noColors.id,
      orderId,
    })
    const missingSpoolLine = createQueueItem({
      id: "q-missing-spool",
      figureId: missingSpool.id,
      orderId,
      completedCounts: { gone: 1 },
    })
    const queueItems = toMap(emptyLine, missingSpoolLine)

    expect(isFinishedOrderLine(emptyLine, queueItems, allFigures, spools)).toBe(
      false
    )
    expect(
      isFinishedOrderLine(missingSpoolLine, queueItems, allFigures, spools)
    ).toBe(false)
  })

  it("requires every color to reach the full quantity, ignoring completedAt", () => {
    const partial = createQueueItem({
      id: "q-partial",
      figureId: "f1",
      orderId,
      quantity: 2,
      completedCounts: { s1: 1 },
      completedAt: "2026-08-30T12:00:00.000Z",
    })
    const sibling = createQueueItem({
      id: "q-sibling",
      figureId: "f1",
      orderId,
      completedCounts: {},
    })
    const full = createQueueItem({
      id: "q-full",
      figureId: "f1",
      orderId,
      quantity: 2,
      completedCounts: { s1: 2 },
      completedAt: null,
    })
    const queueItems = toMap(partial, sibling, full)

    expect(isFinishedOrderLine(partial, queueItems, figures, spools)).toBe(
      false
    )
    expect(isFinishedOrderLine(full, queueItems, figures, spools)).toBe(true)
  })
})

describe("sortFinishedLines", () => {
  it("sorts timestamped lines newest-first, then missing timestamps last by id", () => {
    const newest = createQueueItem({
      id: "q-c",
      completedAt: "2026-08-31T10:00:00.000Z",
    })
    const oldest = createQueueItem({
      id: "q-d",
      completedAt: "2026-08-01T10:00:00.000Z",
    })
    const missingA = createQueueItem({ id: "q-a", completedAt: null })
    const missingB = createQueueItem({ id: "q-b", completedAt: null })

    const result = sortFinishedLines([missingB, oldest, missingA, newest])

    expect(result.map((row) => row.id)).toEqual(["q-c", "q-d", "q-a", "q-b"])
  })

  it("sorts an unreadable timestamp last, as the card shows no time for it", () => {
    const timestamped = createQueueItem({
      id: "q-a",
      completedAt: "2026-08-01T10:00:00.000Z",
    })
    const unreadable = createQueueItem({
      id: "q-b",
      completedAt: "not-a-timestamp",
    })
    const missing = createQueueItem({ id: "q-c", completedAt: null })

    expect(
      sortFinishedLines([unreadable, missing, timestamped]).map((row) => row.id)
    ).toEqual(["q-a", "q-b", "q-c"])
  })

  it("breaks equal timestamps by id and does not mutate its input", () => {
    const first = createQueueItem({
      id: "q-b",
      completedAt: "2026-08-31T10:00:00.000Z",
    })
    const second = createQueueItem({
      id: "q-a",
      completedAt: "2026-08-31T10:00:00.000Z",
    })
    const input = [first, second]

    expect(sortFinishedLines(input).map((row) => row.id)).toEqual([
      "q-a",
      "q-b",
    ])
    expect(input.map((row) => row.id)).toEqual(["q-b", "q-a"])
  })
})

describe("queue scopes and order urgency", () => {
  const orderId = "00000000-0000-4000-8000-000000000001"

  it("limits demand to an order without changing outstanding-copy sorting", () => {
    const red = createSpool({ id: "red", name: "Red" })
    const blue = createSpool({ id: "blue", name: "Blue" })
    const figure = createFigure({
      id: "figure",
      requiredColors: ["red", "blue"],
    })
    const orderRow = createQueueItem({
      id: "order-row",
      figureId: figure.id,
      orderId,
      quantity: 3,
      completedCounts: { blue: 2 },
    })
    const stockRow = createQueueItem({
      id: "stock-row",
      figureId: figure.id,
      quantity: 9,
    })

    const result = computeColorRanking(
      new Map([
        [red.id, red],
        [blue.id, blue],
      ]),
      new Map([[figure.id, figure]]),
      new Map([
        [orderRow.id, orderRow],
        [stockRow.id, stockRow],
      ]),
      parseQueueScope(`order:${orderId}`)
    )

    expect(result.map(({ spool, count }) => [spool.id, count])).toEqual([
      ["red", 3],
      ["blue", 1],
    ])
  })

  it("never marks Ready overdue and sorts overdue before due, creation, reference, id", () => {
    const figure = createFigure({ id: "f", requiredColors: ["s"] })
    const spool = createSpool({ id: "s" })
    const figures = new Map([[figure.id, figure]])
    const spools = new Map([[spool.id, spool]])
    const overdue = createOrder({
      id: orderId,
      reference: "B",
      dueDate: "2026-08-29",
      createdAt: "2026-08-20T00:00:00.000Z",
    })
    const ready = createOrder({
      id: "00000000-0000-4000-8000-000000000002",
      reference: "A",
      dueDate: "2026-08-01",
      createdAt: "2026-08-19T00:00:00.000Z",
    })
    const rows = new Map([
      ["active", createQueueItem({ id: "active", figureId: "f", orderId })],
      [
        "ready",
        createQueueItem({
          id: "ready",
          figureId: "f",
          orderId: ready.id,
          completedCounts: { s: 1 },
        }),
      ],
    ])

    expect(isOrderOverdue(overdue, "active", "2026-08-30")).toBe(true)
    expect(isOrderOverdue(ready, "ready", "2026-08-30")).toBe(false)
    expect(
      sortOrders([ready, overdue], rows, figures, spools, "2026-08-30").map(
        (order) => order.id
      )
    ).toEqual([overdue.id, ready.id])
  })

  it("summarizes scoped work, colors, lifecycle, and attention", () => {
    const order = createOrder({ id: orderId })
    const figure = createFigure({ id: "f", requiredColors: ["s"] })
    const spool = createSpool({ id: "s" })
    const row = createQueueItem({
      id: "q",
      figureId: figure.id,
      orderId,
      quantity: 2,
      completedCounts: { s: 1 },
    })

    expect(
      computeQueueSummary(
        new Map([[order.id, order]]),
        new Map([[row.id, row]]),
        new Map([[figure.id, figure]]),
        new Map([[spool.id, spool]]),
        { kind: "order", orderId }
      )
    ).toEqual({ work: 1, colors: 1, active: 1, ready: 0, needsAttention: 0 })
  })
})
