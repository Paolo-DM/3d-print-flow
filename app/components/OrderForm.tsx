import { useId, useRef, useState } from "react"

import { nextOrderReference, usePrintFlowStore } from "~/lib/store"
import type { Order } from "~/lib/types"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"

export function OrderForm({
  order,
  onSaved,
  onCancel,
}: {
  order?: Order
  onSaved: (order: Order) => void
  onCancel: () => void
}) {
  const orders = usePrintFlowStore((state) => state.orders)
  const createOrder = usePrintFlowStore((state) => state.createOrder)
  const updateOrder = usePrintFlowStore((state) => state.updateOrder)
  const [reference, setReference] = useState(
    order?.reference ?? nextOrderReference(orders)
  )
  const [customerName, setCustomerName] = useState(order?.customerName ?? "")
  const [platform, setPlatform] = useState(order?.platform ?? "")
  const [dueDate, setDueDate] = useState(order?.dueDate ?? "")
  const [notes, setNotes] = useState(order?.notes ?? "")
  const [errors, setErrors] = useState<{
    reference?: string
    dueDate?: string
  }>({})
  const [formError, setFormError] = useState("")
  const referenceRef = useRef<HTMLInputElement>(null)
  const dueDateRef = useRef<HTMLInputElement>(null)
  const formId = useId()
  const referenceId = `${formId}-reference`
  const referenceErrorId = `${formId}-reference-error`
  const customerId = `${formId}-customer`
  const platformId = `${formId}-platform`
  const dueDateId = `${formId}-due-date`
  const dueDateErrorId = `${formId}-due-date-error`
  const notesId = `${formId}-notes`

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = order
      ? updateOrder(order.id, {
          reference,
          customerName,
          platform,
          dueDate,
          notes,
        })
      : createOrder({ reference, customerName, platform, dueDate, notes })

    if (result.type === "created" || result.type === "updated") {
      setErrors({})
      setFormError("")
      onSaved(result.order)
      return
    }
    if (result.type === "collision") {
      setFormError("")
      setErrors({ reference: "Order reference must be unique." })
      referenceRef.current?.focus()
      return
    }
    if (result.type === "invalid") {
      setFormError("")
      if (result.field === "reference") {
        setErrors({ reference: "Enter an order reference." })
        referenceRef.current?.focus()
      } else {
        setErrors({ dueDate: "Enter a valid local date." })
        dueDateRef.current?.focus()
      }
      return
    }
    if (result.type === "not-found") {
      setErrors({})
      setFormError("This order no longer exists. Close the form and try again.")
    }
  }

  return (
    <form className="space-y-4 p-4" onSubmit={handleSubmit} noValidate>
      <div className="space-y-1.5">
        <Label htmlFor={referenceId}>Reference</Label>
        <Input
          ref={referenceRef}
          id={referenceId}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          aria-invalid={!!errors.reference}
          aria-describedby={errors.reference ? referenceErrorId : undefined}
        />
        {errors.reference ? (
          <p id={referenceErrorId} className="text-sm text-destructive">
            {errors.reference}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={customerId}>Customer name</Label>
          <Input
            id={customerId}
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={platformId}>Platform</Label>
          <Input
            id={platformId}
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            placeholder="Etsy, direct, …"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={dueDateId}>Due date</Label>
        <Input
          ref={dueDateRef}
          id={dueDateId}
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          aria-invalid={!!errors.dueDate}
          aria-describedby={errors.dueDate ? dueDateErrorId : undefined}
        />
        {errors.dueDate ? (
          <p id={dueDateErrorId} className="text-sm text-destructive">
            {errors.dueDate}
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={notesId}>Notes</Label>
        <Textarea
          id={notesId}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
        />
      </div>
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{order ? "Save changes" : "Create order"}</Button>
      </div>
    </form>
  )
}
