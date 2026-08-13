import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export const formControlClass =
  'min-h-11 w-full rounded-xl border bg-background px-3 text-base outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm'

interface FormFieldProps extends ComponentProps<'label'> {
  controlId: string
  label: ReactNode
  optional?: boolean
  help?: ReactNode
  error?: ReactNode
  helpId?: string
  errorId?: string
}

export const FormField = ({
  controlId,
  label,
  optional = false,
  help,
  error,
  helpId,
  errorId,
  className,
  children,
  ...props
}: Readonly<FormFieldProps>) => (
  <label
    htmlFor={controlId}
    className={cn('flex flex-col gap-2 text-sm font-medium', className)}
    {...props}
  >
    <span>
      {label}{' '}
      {optional ? (
        <span className="font-normal text-muted-foreground">(facultatif)</span>
      ) : null}
    </span>
    {children}
    {help ? (
      <span
        id={helpId}
        className="text-xs leading-relaxed font-normal text-muted-foreground"
      >
        {help}
      </span>
    ) : null}
    {error ? (
      <span
        id={errorId}
        role="alert"
        className="text-xs font-medium text-destructive"
      >
        {error}
      </span>
    ) : null}
  </label>
)
