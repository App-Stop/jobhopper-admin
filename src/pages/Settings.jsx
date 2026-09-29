import { useState, useEffect } from 'react'
import { Check, Receipt, RotateCcw, Save, Wallet, Zap } from 'lucide-react'
import { AdminHeader } from './AdminParts'
import { apiRequest } from '../api/client'

const DEFAULTS = {
  platformFeePercent: 5.0,
  priorityFeeFlat: 15.0,
  taxPercent: 5.7,
  withdrawalFeeFlat: 0.0,
  urgentRequestTimeoutSeconds: 120,
}

const GROUPS = [
  {
    title: 'Client checkout',
    hint: 'Added on top of the job budget when a client pays into escrow.',
    icon: Receipt,
    fields: [
      {
        key: 'platformFeePercent',
        label: 'Platform commission',
        hint: 'Percentage of the job budget kept by JobHopper.',
        suffix: '%',
        step: 0.1,
        min: 0,
        max: 50,
      },
      {
        key: 'taxPercent',
        label: 'Sales tax',
        hint: 'Applied to the budget, commission and any priority fee.',
        suffix: '%',
        step: 0.1,
        min: 0,
        max: 30,
      },
    ],
  },
  {
    title: 'Emergency dispatch',
    hint: 'ASAP requests that skip the regular bidding flow.',
    icon: Zap,
    fields: [
      {
        key: 'priorityFeeFlat',
        label: 'Priority fee',
        hint: 'Flat rush fee charged to the client and passed to the worker.',
        prefix: '$',
        step: 1,
        min: 0,
      },
      {
        key: 'urgentRequestTimeoutSeconds',
        label: 'Request timeout',
        hint: 'How long an ASAP request waits for a worker before it expires.',
        suffix: 'sec',
        step: 10,
        min: 30,
        max: 600,
      },
    ],
  },
  {
    title: 'Worker payouts',
    hint: 'Charged to tradespeople when they cash out earnings.',
    icon: Wallet,
    fields: [
      {
        key: 'withdrawalFeeFlat',
        label: 'Withdrawal fee',
        hint: 'Flat fee per direct withdrawal. Set to 0 to make cash-outs free.',
        prefix: '$',
        step: 0.5,
        min: 0,
      },
    ],
  },
]

const KEYS = Object.keys(DEFAULTS)

const num = (v) => parseFloat(v) || 0
const money = (v) => `$${v.toFixed(2)}`

const formatTimeout = (seconds) => {
  const s = Math.round(num(seconds))
  const m = Math.floor(s / 60)
  if (!m) return `${s} seconds`
  return s % 60 ? `${m} min ${s % 60} sec` : `${m} min`
}

const UnitInput = ({ prefix, suffix, changed, className = '', ...input }) => (
  <label className={`admin-unit-input ${changed ? 'admin-unit-input--changed' : ''} ${className}`}>
    {prefix && <span>{prefix}</span>}
    <input type="number" inputMode="decimal" required {...input} />
    {suffix && <span>{suffix}</span>}
  </label>
)

const Settings = () => {
  const [values, setValues] = useState(DEFAULTS)
  const [baseline, setBaseline] = useState(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null) // { type: 'saved' | 'error', message }

  // Simulator inputs (not persisted)
  const [testAmount, setTestAmount] = useState(150)
  const [testIsUrgent, setTestIsUrgent] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiRequest('/settings/fees')
        const d = res?.data || {}
        const loaded = Object.fromEntries(KEYS.map((k) => [k, d[k] ?? DEFAULTS[k]]))
        setValues(loaded)
        setBaseline(loaded)
      } catch (err) {
        console.warn('Failed to load settings:', err)
      }
    }
    load()
  }, [])

  const isChanged = (key) => num(values[key]) !== num(baseline[key]) || values[key] === ''
  const dirty = KEYS.some(isChanged)

  const setField = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    setStatus(null)
  }

  const handleDiscard = () => {
    setValues(baseline)
    setStatus(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setStatus(null)
    const payload = Object.fromEntries(KEYS.map((k) => [k, Number(values[k])]))
    try {
      await apiRequest('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      setValues(payload)
      setBaseline(payload)
      setStatus({ type: 'saved', message: 'Changes saved' })
      setTimeout(() => setStatus((s) => (s?.type === 'saved' ? null : s)), 3000)
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  // Simulator math — uses the values currently in the form, saved or not.
  const baseJob = num(testAmount)
  const priorityAdd = testIsUrgent ? num(values.priorityFeeFlat) : 0
  const platformCut = (baseJob * num(values.platformFeePercent)) / 100
  const taxable = baseJob + platformCut + priorityAdd
  const tax = (taxable * num(values.taxPercent)) / 100
  const clientCharged = taxable + tax
  const workerPayout = baseJob + priorityAdd

  const split = [
    { label: 'Worker', value: workerPayout, color: 'bg-accent' },
    { label: 'Platform', value: platformCut, color: 'bg-primary' },
    { label: 'Tax', value: tax, color: 'bg-amber-400' },
  ]

  return (
    <div className="admin-page">
      <AdminHeader
        title="Fees & Platform"
        subtitle="Marketplace-wide commission, tax and dispatch rules. Changes apply to new orders only — jobs already in escrow keep their original rates."
        actions={
          <>
            {status?.type === 'saved' && (
              <span className="admin-badge admin-badge--accent" role="status">
                <Check strokeWidth={2.5} /> {status.message}
              </span>
            )}
            {status?.type === 'error' && (
              <span className="text-[13px] font-medium text-rose-600" role="alert">
                {status.message}
              </span>
            )}
            {dirty && !status && (
              <span className="text-[13px] font-medium text-amber-700">Unsaved changes</span>
            )}
            <button type="button" className="btn btn-outline" onClick={handleDiscard} disabled={!dirty || saving}>
              <RotateCcw strokeWidth={2} /> Discard
            </button>
            <button type="submit" form="fee-settings" className="btn btn-primary" disabled={!dirty || saving}>
              <Save strokeWidth={2} /> {saving ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      />

      <div className="admin-settings">
        <form id="fee-settings" onSubmit={handleSave} className="admin-settings-groups">
          {GROUPS.map(({ title, hint, icon: Icon, fields }) => (
            <section key={title} className="admin-card">
              <div className="admin-card-head justify-start">
                <span className="admin-settings-group-icon">
                  <Icon strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <h2 className="admin-card-title">{title}</h2>
                  <p className="admin-card-hint">{hint}</p>
                </div>
              </div>

              {fields.map(({ key, label, hint: fieldHint, ...input }) => (
                <div key={key} className="admin-setting">
                  <div className="admin-setting-text">
                    <p className="admin-setting-label">{label}</p>
                    <p className="admin-setting-hint">
                      {fieldHint}
                      {key === 'urgentRequestTimeoutSeconds' && (
                        <span className="text-dark-900"> Currently {formatTimeout(values[key])}.</span>
                      )}
                    </p>
                  </div>
                  <UnitInput
                    aria-label={label}
                    value={values[key]}
                    onChange={setField(key)}
                    changed={isChanged(key)}
                    {...input}
                  />
                </div>
              ))}
            </section>
          ))}
        </form>

        <section className="admin-card admin-simulator">
          <div className="admin-card-head">
            <div className="min-w-0">
              <h2 className="admin-card-title">Checkout simulator</h2>
              <p className="admin-card-hint">
                {dirty ? 'Previewing your unsaved rates.' : 'Previewing the live rates.'}
              </p>
            </div>
            <span className="admin-badge">Live preview</span>
          </div>

          <div className="flex flex-col gap-5 p-5">
            <div className="flex flex-col sm:flex-row xl:flex-col gap-3">
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="admin-field-label">Job budget</span>
                <UnitInput
                  aria-label="Sample job budget"
                  prefix="$"
                  min={1}
                  step={5}
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  className="sm:w-full"
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="admin-field-label">Dispatch</span>
                <div className="admin-filters w-full" role="group" aria-label="Dispatch type">
                  <button
                    type="button"
                    className="admin-filter flex-1"
                    aria-pressed={!testIsUrgent}
                    onClick={() => setTestIsUrgent(false)}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    className="admin-filter flex-1 inline-flex items-center justify-center gap-1"
                    aria-pressed={testIsUrgent}
                    onClick={() => setTestIsUrgent(true)}
                  >
                    <Zap className="size-3.5" strokeWidth={2} /> ASAP
                  </button>
                </div>
              </div>
            </div>

            <div className="admin-receipt">
              <div className="admin-receipt-row">
                <span>Job budget</span>
                <strong>{money(baseJob)}</strong>
              </div>
              {testIsUrgent && (
                <div className="admin-receipt-row">
                  <span>Priority fee</span>
                  <strong>+{money(priorityAdd)}</strong>
                </div>
              )}
              <div className="admin-receipt-row">
                <span>Platform commission ({num(values.platformFeePercent)}%)</span>
                <strong>+{money(platformCut)}</strong>
              </div>
              <div className="admin-receipt-row">
                <span>Sales tax ({num(values.taxPercent)}%)</span>
                <strong>+{money(tax)}</strong>
              </div>
              <div className="admin-receipt-total">
                <span>Client pays</span>
                <strong>{money(clientCharged)}</strong>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="admin-split-bar" aria-hidden="true">
                {clientCharged > 0 &&
                  split.map(({ label, value, color }) => (
                    <span key={label} className={color} style={{ width: `${(value / clientCharged) * 100}%` }} />
                  ))}
              </div>
              <div className="admin-split-legend">
                {split.map(({ label, value, color }) => (
                  <div key={label} className="admin-split-item">
                    <p>
                      <span className={`admin-split-dot ${color}`} /> {label}
                    </p>
                    <p>{money(value)}</p>
                  </div>
                ))}
              </div>
              <p className="text-[12px] leading-relaxed text-muted">
                Worker earnings are released from escrow when the job is completed
                {num(values.withdrawalFeeFlat) > 0
                  ? `, minus a ${money(num(values.withdrawalFeeFlat))} fee per withdrawal.`
                  : '. Withdrawals are free.'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Settings
