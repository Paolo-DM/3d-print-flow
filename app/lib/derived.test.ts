// @vitest-environment jsdom
import { describe, expect, it } from "vitest"

import { createFigure, createQueueItem, createSpool } from "~/lib/test-utils"
import { computeAffectedQueueItems, getReferencingFigures } from "~/lib/derived"

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
