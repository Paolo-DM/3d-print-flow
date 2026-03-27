import { Disc3 } from "lucide-react"

import { SpoolCard } from "~/components/SpoolCard"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { usePrintFlowStore } from "~/lib/store"

export default function SpoolLibrary() {
  const spools = usePrintFlowStore((s) => s.spools)
  const spoolList = Array.from(spools.values())

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Spool Library</h1>
        <Button disabled>Add Spool</Button>
      </div>

      {spoolList.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Disc3 />
            </EmptyMedia>
            <EmptyTitle>No Spools Yet</EmptyTitle>
            <EmptyDescription>
              Add your filament spools to start building your color library.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button disabled>Add Your First Spool</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {spoolList.map((spool) => (
            <SpoolCard key={spool.id} spool={spool} />
          ))}
        </div>
      )}
    </div>
  )
}
