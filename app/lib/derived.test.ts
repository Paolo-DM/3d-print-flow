// @vitest-environment jsdom
import { describe, expect, it } from "vitest"

import { createFigure, createQueueItem, createSpool } from "~/lib/test-utils"
import {
  computeAffectedQueueItems,
  computeColorRanking,
  computeCompletionStatus,
  computeFigureProgress,
  getReferencingFigures,
  isCompletedToday,
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
      type: "order",
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
      type: "stock",
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
      type: "order",
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
