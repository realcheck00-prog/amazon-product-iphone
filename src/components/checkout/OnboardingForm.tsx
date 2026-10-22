import type { ReactNode } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  normalizeConnectionPeriod,
  type OnboardingErrors,
  type OnboardingField,
  type OnboardingValues,
} from '@/lib/onboarding'
import type { CsvDownload } from '@/lib/csvExport'
import { Button } from '@/components/ui/Button'

/** Inline submission feedback for the onboarding step. */
export type OnboardingNotice = {
  tone: 'info' | 'success' | 'error'
  message: string
}

export type OnboardingFormProps = {
  values: OnboardingValues
  errors: OnboardingErrors
  onChange: (field: OnboardingField, value: string) => void
  onBlur: (field: OnboardingField) => void
  disabled?: boolean
  notice?: OnboardingNotice | null
  /** The exported file, when one has been generated. */
  download?: CsvDownload | null
  /** Downloads the exported file again (user action). */
  onDownload?: () => void
}

const inputClass =
  'w-full rounded-xl border bg-white px-3.5 py-3 text-base leading-6 text-ink shadow-[0_1px_2px_rgba(15,17,17,0.04)] transition-[border-color,box-shadow] duration-150 placeholder:text-ink-4 focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-muted'

const fieldErrorClass =
  'border-deal focus:border-deal focus:ring-4 focus:ring-[#cc0c39]/12'

const fieldNormalClass =
  'border-[#e2e2e7] focus:border-[#007aff] focus:ring-4 focus:ring-[#007aff]/15'

type FieldProps = {
  id: OnboardingField
  label: string
  error?: string
  optional?: boolean
  hint?: string
  className?: string
  children: ReactNode
}

function Field({ id, label, error, optional, hint, className, children }: FieldProps) {
  const errorId = `${id}-error`

  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
        {optional ? <span className="text-xs font-normal text-ink-3">Optional</span> : null}
      </div>
      {children}
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-ink-3">{hint}</p> : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-start gap-1 text-xs font-medium text-deal"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}

/**
 * Connection details section of the checkout.
 *
 * SECURITY: there is no card-number, expiry, CVV or PIN input here, so those
 * credentials can neither be entered nor transmitted. There is no password
 * field and no one-time-code field either — the account is confirmed by our
 * team over the phone, so nothing credential-shaped is ever collected, sent
 * or stored.
 *
 * The username, the 20-character user ID and the 3-digit confirmation code are
 * assigned by our team afterwards. The customer is never asked for them and
 * the browser is never allowed to write them.
 */
export function OnboardingForm({
  values,
  errors,
  onChange,
  onBlur,
  disabled = false,
  notice = null,
  download = null,
  onDownload,
}: OnboardingFormProps) {
  return (
    <section
      aria-labelledby="onboarding-heading"
      className="animate-fade-in rounded-[18px] border border-black/[0.07] bg-surface shadow-[0_1px_2px_rgba(15,17,17,0.05),0_10px_28px_-14px_rgba(15,17,17,0.20)]"
    >
      <header className="flex items-start justify-between gap-3 border-b border-[#ececef] px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <h2
            id="onboarding-heading"
            className="text-base font-semibold tracking-[-0.01em] text-ink md:text-lg"
          >
            Connection details
          </h2>
          <p className="mt-1 text-sm text-ink-3">
            Tell us how long you need the connection for. We call you to confirm your account and
            give you your user ID.
          </p>
        </div>
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-pill bg-[#eef4ff] px-2.5 py-1 text-2xs font-semibold text-[#0b63d6]">
          <UserPlus className="size-3" aria-hidden />
          Onboarding
        </span>
      </header>

      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <Field
          id="connectionPeriod"
          label="Connection period"
          error={errors.connectionPeriod}
          hint="How long you need the connection for, in months or years — for example 18 months or 2 years."
        >
          <input
            id="connectionPeriod"
            name="connectionPeriod"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="18 months"
            maxLength={20}
            required
            disabled={disabled}
            value={values.connectionPeriod}
            aria-invalid={errors.connectionPeriod ? true : undefined}
            aria-describedby={errors.connectionPeriod ? 'connectionPeriod-error' : undefined}
            onChange={(event) =>
              onChange('connectionPeriod', normalizeConnectionPeriod(event.target.value))
            }
            onBlur={() => onBlur('connectionPeriod')}
            className={cn(
              inputClass,
              errors.connectionPeriod ? fieldErrorClass : fieldNormalClass,
            )}
          />
        </Field>

        {notice ? (
          <p
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-medium leading-relaxed',
              notice.tone === 'info' && 'bg-surface-sunken text-ink-3',
              notice.tone === 'success' && 'bg-[#e9f6ef] text-success',
              notice.tone === 'error' && 'bg-[#fdecea] text-deal',
            )}
          >
            {notice.tone === 'info' ? (
              <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" aria-hidden />
            ) : notice.tone === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            ) : (
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            )}
            <span>{notice.message}</span>
          </p>
        ) : null}

        {download && onDownload ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled}
            leadingIcon={<Download className="size-3.5" aria-hidden />}
            onClick={onDownload}
          >
            Download your details (CSV)
          </Button>
        ) : null}

        <div className="space-y-2 border-t border-[#ececef] pt-3">
          <p className="text-2xs leading-relaxed text-ink-4">
            We use these details only to set up your connection. No payment is taken on this
            site, and your username and user ID are assigned during the confirmation call.
          </p>
        </div>
      </div>
    </section>
  )
}
