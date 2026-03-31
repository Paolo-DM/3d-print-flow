// @vitest-environment jsdom
import { describe, expect, it } from "vitest"

import { createFigure, createQueueItem, createSpool } from "~/lib/test-utils"
import {
  computeAffectedQueueItems,
  computeColorRanking,
  computeCompletionStatus,
  computeFigureProgress,
  getReferencingFigures,
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
    const queueItems = new Map([["q1", q1], ["q2", q2], ["q3", q3]])

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
    const q1 = createQueueItem({ id: "q1", figureId: "fig-1", completedColors: [] })
    const q2 = createQueueItem({ id: "q2", figureId: "fig-2", completedColors: [] })

    const spools = new Map([["s1", s1], ["s2", s2]])
    const figures = new Map([["fig-1", fig1], ["fig-2", fig2]])
    const queueItems = new Map([["q1", q1], ["q2", q2]])

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
    const q1 = createQueueItem({ id: "q1", figureId: "fig-1", completedColors: ["s1"] })

    const spools = new Map([["s1", s1], ["s2", s2]])
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
    const q1 = createQueueItem({ id: "q1", figureId: "fig-1", type: "order", completedColors: [] })

    const spools = new Map([["s1", s1]])
    const figures = new Map([["fig-1", fig]])
    const queueItems = new Map([["q1", q1]])

    const result = computeColorRanking(spools, figures, queueItems)

    expect(result[0].hasOrders).toBe(true)
  })

  it("hasOrders is false when only stock-type queue items", () => {
    const s1 = createSpool({ id: "s1" })
    const fig = createFigure({ id: "fig-1", requiredColors: ["s1"] })
    const q1 = createQueueItem({ id: "q1", figureId: "fig-1", type: "stock", completedColors: [] })

    const spools = new Map([["s1", s1]])
    const figures = new Map([["fig-1", fig]])
    const queueItems = new Map([["q1", q1]])

    const result = computeColorRanking(spools, figures, queueItems)

    expect(result[0].hasOrders).toBe(false)
  })
})

describe("computeFigureProgress", () => {
  it("intersects completedColors with current requiredColors (stale entries ignored)", () => {
    const qi = createQueueItem({
      completedColors: ["s1", "s-stale"],
    })
    const fig = createFigure({ requiredColors: ["s1", "s2", "s3"] })

    const result = computeFigureProgress(qi, fig)

    expect(result).toEqual({ completed: 1, total: 3 })
  })

  it("returns { completed: 0, total: 0 } for null figure", () => {
    const qi = createQueueItem({ completedColors: ["s1"] })

    const result = computeFigureProgress(qi, null)

    expect(result).toEqual({ completed: 0, total: 0 })
  })

  it("returns { completed: 0, total: 0 } for undefined figure", () => {
    const qi = createQueueItem({ completedColors: ["s1"] })

    const result = computeFigureProgress(qi, undefined)

    expect(result).toEqual({ completed: 0, total: 0 })
  })
})

describe("computeCompletionStatus", () => {
  it("returns true only when all required colors are completed", () => {
    const qi = createQueueItem({ completedColors: ["s1", "s2"] })
    const fig = createFigure({ requiredColors: ["s1", "s2"] })

    expect(computeCompletionStatus(qi, fig)).toBe(true)
  })

  it("returns false when not all required colors are completed", () => {
    const qi = createQueueItem({ completedColors: ["s1"] })
    const fig = createFigure({ requiredColors: ["s1", "s2"] })

    expect(computeCompletionStatus(qi, fig)).toBe(false)
  })

  it("returns false for figure with zero requiredColors", () => {
    const qi = createQueueItem({ completedColors: [] })
    const fig = createFigure({ requiredColors: [] })

    expect(computeCompletionStatus(qi, fig)).toBe(false)
  })

  it("returns false for null figure", () => {
    const qi = createQueueItem({ completedColors: ["s1"] })

    expect(computeCompletionStatus(qi, null)).toBe(false)
  })
})
