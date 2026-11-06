import { useState } from 'react'

// Draft values are applied together so date ranges and account IDs are validated before requests.
export default function ListFilters({ fields, onApply }) {
  const [draft, setDraft] = useState({})
  return <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); onApply(draft) }}>
    {fields.map(({ key, label, options, multiple, ...input }) => <label key={key} className="flex flex-col gap-1 text-[13px] text-muted">{label}
      {options ? <select className="admin-filter" multiple={multiple} value={draft[key] || (multiple ? [] : '')} onChange={(event) => setDraft((values) => ({ ...values, [key]: multiple ? Array.from(event.target.selectedOptions, (option) => option.value) : event.target.value }))}>
        {!multiple && <option value="">All</option>}{options.map((option) => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? String(option).replace(/_/g, ' ')}</option>)}
      </select> : <input className="admin-date-input" value={draft[key] || ''} {...input} onChange={(event) => setDraft((values) => ({ ...values, [key]: event.target.value }))} />}
    </label>)}
    <button className="btn btn-sm btn-primary" type="submit">Apply filters</button><button className="btn btn-sm btn-outline" type="button" onClick={() => { setDraft({}); onApply({}) }}>Clear filters</button>
    {fields.some((field) => field.type === 'date') && <span className="text-[12px] text-muted">Dates are inclusive, in UTC.</span>}
  </form>
}
