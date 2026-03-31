// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ImportDialog } from "~/components/ImportDialog"

const mockImportData = vi.fn()

vi.mock("~/lib/export-import", () => ({
  importData: (...args: unknown[]) => mockImportData(...args),
}))

afterEach(() => {
  cleanup()
  mockImportData.mockReset()
})

const testFile = new File(['{"test": true}'], "export.json", {
  type: "application/json",
})

describe("ImportDialog", () => {
  it("renders confirmation warning text", () => {
    render(
      <ImportDialog open={true} onOpenChange={() => {}} file={testFile} />
    )

    expect(screen.getByText("Replace All Data?")).toBeTruthy()
    expect(
      screen.getByText(/This will replace ALL current data/)
    ).toBeTruthy()
  })

  it("Cancel closes without calling importData", () => {
    const onOpenChange = vi.fn()
    render(
      <ImportDialog
        open={true}
        onOpenChange={onOpenChange}
        file={testFile}
      />
    )

    fireEvent.click(screen.getByText("Cancel"))

    expect(mockImportData).not.toHaveBeenCalled()
  })

  it("Confirm triggers importData with the file", async () => {
    mockImportData.mockResolvedValue(undefined)
    const onOpenChange = vi.fn()

    render(
      <ImportDialog
        open={true}
        onOpenChange={onOpenChange}
        file={testFile}
      />
    )

    fireEvent.click(screen.getByText("Replace All Data"))

    await waitFor(() => {
      expect(mockImportData).toHaveBeenCalledWith(testFile)
    })
  })

  it("shows error message on import failure and dialog stays open", async () => {
    mockImportData.mockRejectedValue(
      new Error("Import failed — your data has not been changed. Please try again.")
    )
    const onOpenChange = vi.fn()

    render(
      <ImportDialog
        open={true}
        onOpenChange={onOpenChange}
        file={testFile}
      />
    )

    fireEvent.click(screen.getByText("Replace All Data"))

    await waitFor(() => {
      expect(
        screen.getByText(
          "Import failed — your data has not been changed. Please try again."
        )
      ).toBeTruthy()
    })

    // Dialog should NOT have been closed
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it("does not close on Escape while import is in progress", async () => {
    let rejectImport!: (error: Error) => void
    mockImportData.mockReturnValue(
      new Promise((_, reject: (error: Error) => void) => {
        rejectImport = reject
      })
    )
    const onOpenChange = vi.fn()

    render(
      <ImportDialog
        open={true}
        onOpenChange={onOpenChange}
        file={testFile}
      />
    )

    fireEvent.click(screen.getByText("Replace All Data"))
    fireEvent.keyDown(document, { key: "Escape" })

    expect(onOpenChange).not.toHaveBeenCalledWith(false)

    rejectImport(
      new Error("Import failed — your data has not been changed. Please try again.")
    )

    await waitFor(() => {
      expect(
        screen.getByText(
          "Import failed — your data has not been changed. Please try again."
        )
      ).toBeTruthy()
    })

    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it("closes on successful import", async () => {
    mockImportData.mockResolvedValue(undefined)
    const onOpenChange = vi.fn()

    render(
      <ImportDialog
        open={true}
        onOpenChange={onOpenChange}
        file={testFile}
      />
    )

    fireEvent.click(screen.getByText("Replace All Data"))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it("shows selected filename in dialog body", () => {
    render(
      <ImportDialog open={true} onOpenChange={() => {}} file={testFile} />
    )

    expect(screen.getByText("export.json")).toBeTruthy()
  })
})
