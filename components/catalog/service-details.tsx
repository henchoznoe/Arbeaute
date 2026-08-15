import { ChevronDown, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getServiceCareContent,
  type ServiceCareDetails,
} from '@/lib/catalog/service-content'
import { cn } from '@/lib/utils/cn'

export const ServiceDetails = ({
  service,
  className,
}: Readonly<{
  service: ServiceCareDetails
  className?: string
}>) => {
  const { details, faq, hasContent } = getServiceCareContent(service)

  if (!hasContent) return null

  return (
    <details className={cn('group/details border-t pt-3', className)}>
      <summary className="flex min-h-11 list-none items-center justify-between gap-3 rounded-lg text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        À savoir avant de réserver
        <ChevronDown className="size-4 shrink-0 transition-transform group-open/details:rotate-180" />
      </summary>
      <div className="space-y-4 pb-2 text-sm leading-relaxed">
        {details.map(detail => (
          <div key={detail.label}>
            <h4 className="font-semibold text-foreground">{detail.label}</h4>
            <p className="mt-1 whitespace-pre-line text-muted-foreground">
              {detail.value}
            </p>
          </div>
        ))}
        {faq.length > 0 ? (
          <div>
            <h4 className="font-semibold text-foreground">
              Questions fréquentes
            </h4>
            <dl className="mt-2 space-y-3">
              {faq.map(item => (
                <div key={item.question}>
                  <dt className="font-medium text-foreground">
                    {item.question}
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-line text-muted-foreground">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
        {service.consentFormUrl ? (
          <Button asChild variant="outline">
            <a
              href={service.consentFormUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="size-4" />
              Formulaire de consentement (PDF)
            </a>
          </Button>
        ) : null}
      </div>
    </details>
  )
}
