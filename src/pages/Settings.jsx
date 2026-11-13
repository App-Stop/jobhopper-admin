import { useState, useEffect } from 'react'
import { ListChecks, Receipt, Scale, ShieldCheck, Wallet, Zap } from 'lucide-react'
import { AdminHeader } from './AdminParts'
import { apiRequest } from '../api/client'

// Placeholders shown until GET /admin/settings answers.
const DEFAULTS = {
  platformFeePercent: 5.0,
  priorityFeeFlat: 15.0,
  taxPercent: 5.7,
  withdrawalFeeFlat: 0.0,
  standardCancellationClientRefundPercent: 60,
  urgentRequestTimeoutSeconds: 120,
  requestTimeoutSeconds: 7200,
  paymentTimeoutSeconds: 7200,
  clientConfirmationTimeoutSeconds: 3600,
  disputeResponseTimeoutSeconds: 43200,
}

const GROUPS = [
  {
    title: 'Client checkout',
    hint: 'Added on top of the job amount when the client pays into escrow — calculated at payment time.',
    icon: Receipt,
    fields: [
      {
        key: 'platformFeePercent',
        label: 'Platform commission',
        hint: 'Percentage of the job amount charged to the client and kept by JobHopper.',
        suffix: '%',
        min: 0,
        max: 100,
      },
      {
        key: 'taxPercent',
        label: 'Sales tax',
        hint: 'Applied to the job amount, commission and any priority fee.',
        suffix: '%',
        min: 0,
        max: 100,
      },
      {
        key: 'paymentTimeoutSeconds',
        label: 'Payment window',
        hint: 'How long the client has to pay after a worker is hired before the job expires.',
        suffix: 'sec',
        min: 1,
        timeout: true,
      },
    ],
  },
  {
    title: 'Job requests',
    hint: 'How long a posted job or direct request stays open for workers.',
    icon: Zap,
    fields: [
      {
        key: 'requestTimeoutSeconds',
        label: 'Request timeout',
        hint: 'How long a standard job request stays open before it expires.',
        suffix: 'sec',
        min: 1,
        timeout: true,
      },
      {
        key: 'priorityFeeFlat',
        label: 'Priority fee (ASAP)',
        hint: 'Flat rush fee charged to the client on ASAP jobs and kept by JobHopper. Locked in when the job is posted.',
        prefix: '$',
        min: 0,
      },
      {
        key: 'urgentRequestTimeoutSeconds',
        label: 'Urgent request timeout',
        hint: 'How long a worker has to accept an urgent direct request before it expires.',
        suffix: 'sec',
        min: 1,
        timeout: true,
      },
    ],
  },
  {
    title: 'Completion, cancellation & disputes',
    hint: 'What happens after the work is done, or when a booking falls through.',
    icon: Scale,
    fields: [
      {
        key: 'clientConfirmationTimeoutSeconds',
        label: 'Client confirmation window',
        hint: 'After the worker marks a job complete, the client has this long to confirm or report an issue; then payment is released to the worker automatically.',
        suffix: 'sec',
        min: 1,
        timeout: true,
      },
      {
        key: 'standardCancellationClientRefundPercent',
        label: 'Early cancellation refund',
        hint: 'Share of the job amount refunded when a client cancels a paid standard job at least 24 hours before it is scheduled. Later cancellations refund nothing; fees and tax are never refunded.',
        suffix: '%',
        min: 0,
        max: 100,
      },
      {
        key: 'disputeResponseTimeoutSeconds',
        label: 'Dispute evidence window',
        hint: 'How long a client or worker has to answer an admin’s evidence request on a dispute.',
        suffix: 'sec',
        min: 1,
        timeout: true,
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
        hint: 'Flat fee per withdrawal; the withdrawal amount must be larger than this fee. Set to 0 to make cash-outs free.',
        prefix: '$',
        min: 0,
      },
    ],
  },
]

const KEYS = Object.keys(DEFAULTS)

const num = (v) => parseFloat(v) || 0
const money = (v) => `$${v.toFixed(2)}`

const formatTimeout = (seconds) => {
  let s = Math.round(num(seconds))
  const parts = []
  for (const [unit, size] of [['h', 3600], ['min', 60], ['sec', 1]]) {
    const n = Math.floor(s / size)
    if (n) parts.push(`${n} ${unit}`)
    s -= n * size
  }
  return parts.join(' ') || '0 sec'
}

const UnitInput = ({ prefix, suffix, changed, className = '', ...input }) => (
  <label className={`admin-unit-input ${changed ? 'admin-unit-input--changed' : ''} ${className}`}>
    {prefix && <span>{prefix}</span>}
    <input type="number" inputMode="decimal" step="any" required {...input} />
    {suffix && <span>{suffix}</span>}
  </label>
)

// GET /admin/field-options — the fixed choice lists the apps offer. Read-only: old jobs and reports
// store the exact text, so these can't be edited.
const FIELD_OPTION_LISTS = [
  ['Client cancellation reasons', (d) => d.cancellationReasons?.client],
  ['Worker cancellation reasons', (d) => d.cancellationReasons?.worker],
  ['Reasons a client can report a worker', (d) => d.userReportReasons?.worker],
  ['Reasons a worker can report a client', (d) => d.userReportReasons?.client],
  ['Dispute reasons (client)', (d) => d.disputeReasons],
  ['Dispute answers (worker)', (d) => d.disputeResponseReasons],
]

const FieldOptions = () => {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setError(null)
    apiRequest('/admin/field-options')
      .then((res) => setData(res?.data || {}))
      .catch((err) => setError(err.message))
  }, [attempt])

  return (
    <section className="admin-card">
      <div className="admin-card-head justify-start">
        <span className="admin-settings-group-icon">
          <ListChecks strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="admin-card-title">Choice lists</h2>
          <p className="admin-card-hint">
            The fixed reasons people pick in the apps. Read-only: past jobs and reports store this exact text. Every
            list ends with &ldquo;Other&rdquo;, which needs a written description.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-5">
        {error && <p className="text-[13px] text-rose-600">Couldn&apos;t load the choice lists: {error} <button className="btn btn-sm btn-outline" onClick={() => setAttempt((value) => value + 1)}>Retry</button></p>}
        {!data && !error && <p className="text-[13px] text-muted">Loading…</p>}
        {data &&
          FIELD_OPTION_LISTS.map(([title, pick]) => (
            <details key={title} className="admin-info-box">
              <summary className="cursor-pointer font-semibold text-dark-900">
                {title} <span className="font-normal text-muted">({pick(data)?.length ?? 0})</span>
              </summary>
              <ul className="mt-2 list-disc pl-5 text-[13px] text-dark-900">
                {(pick(data) || []).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </details>
          ))}
      </div>
    </section>
  )
}

const Settings = () => {
  const [values, setValues] = useState(DEFAULTS)
  // Veriff toggle (boolean, kept apart from the numeric fields).
  const [veriff, setVeriff] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [loadAttempt, setLoadAttempt] = useState(0)

  // Simulator inputs (not persisted)
  const [testAmount, setTestAmount] = useState(150)
  const [testIsUrgent, setTestIsUrgent] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoadError(null)
      try {
        const res = await apiRequest('/admin/settings')
        const d = res?.data || {}
        if (KEYS.some((key) => typeof d[key] !== 'number') || typeof d.veriffEnabled !== 'boolean') throw new Error('The server returned incomplete platform settings.')
        const live = Object.fromEntries(KEYS.map((k) => [k, d[k] ?? DEFAULTS[k]]))
        setValues(live)
        setVeriff(d.veriffEnabled === true)
      } catch (err) {
        setLoadError(err.message || 'Failed to load the current fee settings.')
      }
    }
    load()
  }, [loadAttempt])

  // Simulator math mirrors job-hopper-backend payment.service computeFees (each fee rounded to
  // cents) and uses the current platform settings.
  const round2 = (v) => Math.round(v * 100) / 100
  const baseJob = num(testAmount)
  const priorityAdd = testIsUrgent ? num(values.priorityFeeFlat) : 0
  const platformCut = round2((baseJob * num(values.platformFeePercent)) / 100)
  const tax = round2(((baseJob + platformCut + priorityAdd) * num(values.taxPercent)) / 100)
  const clientCharged = round2(baseJob + platformCut + priorityAdd + tax)
  // Released to the worker's wallet: the job amount only. Commission and priority fee stay with the platform.
  const workerPayout = baseJob
  const platformRevenue = round2(platformCut + priorityAdd)

  const split = [
    { label: 'Worker', value: workerPayout, color: 'bg-accent' },
    { label: 'Platform', value: platformRevenue, color: 'bg-primary' },
    { label: 'Tax', value: tax, color: 'bg-amber-400' },
  ]

  return (
    <div className="admin-page">
      <AdminHeader
        title="Fees & Platform"
        subtitle="View marketplace-wide fees, time windows and verification rules. These settings are read-only."
      />

      <div className="admin-settings">
        <div className="admin-settings-groups">
          {loadError && (
            <p className="rounded-[12px] bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700" role="alert">
              Couldn't load the current fee settings: {loadError} <button type="button" className="btn btn-sm btn-outline" onClick={() => setLoadAttempt((value) => value + 1)}>Retry</button>
            </p>
          )}
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

              {fields.map(({ key, label, hint: fieldHint, timeout, ...input }) => (
                <div key={key} className="admin-setting">
                  <div className="admin-setting-text">
                    <p className="admin-setting-label">{label}</p>
                    <p className="admin-setting-hint">
                      {fieldHint}
                      {timeout && (
                        <span className="text-dark-900"> Currently {formatTimeout(values[key])}.</span>
                      )}
                    </p>
                  </div>
                  <UnitInput
                    aria-label={label}
                    value={values[key]}
                    readOnly
                    {...input}
                  />
                </div>
              ))}
            </section>
          ))}

          <section className="admin-card">
            <div className="admin-card-head justify-start">
              <span className="admin-settings-group-icon">
                <ShieldCheck strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h2 className="admin-card-title">Worker verification</h2>
                <p className="admin-card-hint">How submitted worker ID photos are checked.</p>
              </div>
            </div>
            <label className="admin-setting">
              <div className="admin-setting-text">
                <p className="admin-setting-label">Automatic checks with Veriff</p>
                <p className="admin-setting-hint">
                  On: ID photos are also sent to Veriff for an automatic decision. Off: every submission waits for
                  an admin in the Verification Queue. If Veriff isn&apos;t configured on the server, workers can&apos;t
                  submit while this is on.
                </p>
              </div>
              <input
                type="checkbox"
                aria-label="Automatic checks with Veriff"
                className="size-5 accent-primary"
                checked={veriff}
                disabled
              />
            </label>
          </section>
        </div>

        <section className="admin-card admin-simulator">
          <div className="admin-card-head">
            <div className="min-w-0">
              <h2 className="admin-card-title">Checkout simulator</h2>
              <p className="admin-card-hint">
                Previewing the live rates.
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
                The worker&apos;s wallet is credited with the job amount when the client confirms completion; the
                commission and priority fee stay with JobHopper.{' '}
                {num(values.withdrawalFeeFlat) > 0
                  ? `Each withdrawal then costs the worker ${money(num(values.withdrawalFeeFlat))}.`
                  : 'Withdrawals are free.'}
              </p>
            </div>
          </div>
        </section>
      </div>

      <FieldOptions />
    </div>
  )
}

export default Settings
