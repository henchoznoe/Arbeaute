import { AlertTriangle } from 'lucide-react'
import { CUSTOMER_CHANGE_CUTOFF_LABEL } from '@/lib/reservation/constants'
import { cn } from '@/lib/utils/cn'

interface CancellationPolicyProps {
  /** Échéance exacte, déjà formatée, quand le rendez-vous est connu. */
  deadlineLabel?: string
  /** Vrai lorsque le délai est dépassé : la séance est désormais due. */
  expired?: boolean
  className?: string
}

export const CancellationPolicy = ({
  deadlineLabel,
  expired = false,
  className,
}: Readonly<CancellationPolicyProps>) => (
  <p
    className={cn(
      'flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive',
      className,
    )}
  >
    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
    <span>
      {expired ? (
        <>
          <strong className="font-semibold">
            Ce rendez-vous n’est plus annulable en ligne.
          </strong>{' '}
          Le délai de {CUSTOMER_CHANGE_CUTOFF_LABEL} est dépassé : en cas
          d’absence, la séance est due à 100 %. Contactez l’institut par
          téléphone en cas d’imprévu.
        </>
      ) : (
        <>
          <strong className="font-semibold">Conditions d’annulation :</strong>{' '}
          toute annulation ou modification doit intervenir au moins{' '}
          {CUSTOMER_CHANGE_CUTOFF_LABEL} avant le rendez-vous
          {deadlineLabel ? (
            <>
              , soit jusqu’au{' '}
              <strong className="font-semibold whitespace-nowrap">
                {deadlineLabel}
              </strong>
            </>
          ) : null}
          . Passé ce délai, la séance est due à 100 %.
        </>
      )}
    </span>
  </p>
)
