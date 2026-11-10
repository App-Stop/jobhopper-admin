import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const optionValue = (option) => option.value ?? option
const optionLabel = (option) => option.label ?? String(option).replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase())

function MultipleFilter({ label, options, value, onChange }) {
  const id = useId()
  const container = useRef(null)
  const trigger = useRef(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event) => {
      if (!container.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  return (
    <div ref={container} className="admin-multiple-filter" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }} onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        trigger.current?.focus()
      }
    }}>
      <span id={`${id}-label`}>{label}</span>
      <button ref={trigger} type="button" className="admin-multiple-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-options`} onClick={() => setOpen((current) => !current)}>
        <span id={`${id}-value`}>{value.length ? `${value.length} selected` : 'All statuses'}</span>
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <div id={`${id}-options`} className="admin-multiple-options" role="group" aria-labelledby={`${id}-label`}>
          {options.map((option) => {
            const key = optionValue(option)
            return (
              <label key={key} className="admin-multiple-option">
                <input type="checkbox" checked={value.includes(key)} onChange={(event) => onChange(event.target.checked ? [...value, key] : value.filter((item) => item !== key))} />
                {optionLabel(option)}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Draft values are applied together so date ranges and account IDs are validated before requests.
export default function ListFilters({ fields, onApply }) {
  const [draft, setDraft] = useState({})
  return <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); onApply(draft) }}>
    {fields.map(({ key, label, options, multiple, ...input }) => multiple && options ? <MultipleFilter key={key} label={label} options={options} value={draft[key] || []} onChange={(value) => setDraft((values) => ({ ...values, [key]: value }))} /> : <label key={key} className="flex flex-col gap-1 text-[13px] text-muted">{label}
      {options ? <select className="admin-filter" value={draft[key] || ''} onChange={(event) => setDraft((values) => ({ ...values, [key]: event.target.value }))}>
        <option value="">All</option>{options.map((option) => <option key={optionValue(option)} value={optionValue(option)}>{optionLabel(option)}</option>)}
      </select> : <input className="admin-date-input" value={draft[key] || ''} {...input} onChange={(event) => setDraft((values) => ({ ...values, [key]: event.target.value }))} />}
    </label>)}
    <button className="btn btn-sm btn-primary" type="submit">Apply filters</button><button className="btn btn-sm btn-outline" type="button" onClick={() => { setDraft({}); onApply({}) }}>Clear filters</button>
    {fields.some((field) => field.type === 'date') && <span className="text-[12px] text-muted">Dates are inclusive, in UTC.</span>}
  </form>
}
