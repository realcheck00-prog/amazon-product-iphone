import type { HTMLInputAutoCompleteAttribute, InputHTMLAttributes } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export type FormFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  optional?: boolean
  type?: InputHTMLAttributes<HTMLInputElement>['type']
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  autoComplete?: HTMLInputAutoCompleteAttribute
  placeholder?: string
  maxLength?: number
  className?: string
}

const inputClass =
  'w-full rounded-sm border bg-surface px-2.5 py-1.5 text-sm text-ink shadow-hairline transition-colors placeholder:text-ink-4 focus:outline-none disabled:bg-surface-muted'

/** Accessible labelled text input with inline validation messaging. */
export function FormField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  optional = false,
  type = 'text',
  inputMode,
  autoComplete,
  placeholder,
  maxLength,
  className,
}: FormFieldProps) {
  const errorId = `${id}-error`
  const describedBy = error ? errorId : undefined

  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-ink-3">(optional)</span>
        ) : (
          <span className="ml-0.5 text-deal" aria-hidden>
            *
          </span>
        )}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={cn(
          inputClass,
          error
            ? 'border-deal focus:border-deal focus:ring-1 focus:ring-deal'
            : 'border-line-strong focus:border-link focus:ring-1 focus:ring-link',
        )}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 flex items-start gap-1 text-xs text-deal">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
