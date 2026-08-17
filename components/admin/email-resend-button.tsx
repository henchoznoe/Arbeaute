'use client'

import { LoaderCircle, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { AppToast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/button'
import { resendFailedEmail } from '@/lib/actions/admin-emails'

export const EmailResendButton = ({
  deliveryId,
}: Readonly<{ deliveryId: string }>) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    ok: boolean
    message: string
  } | null>(null)

  const resend = () => {
    startTransition(async () => {
      const result = await resendFailedEmail(deliveryId)
      setFeedback(result)
      if (result.ok) router.refresh()
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={resend}
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Renvoyer
      </Button>
      <AppToast
        open={feedback !== null}
        onOpenChange={open => {
          if (!open) setFeedback(null)
        }}
        title={feedback?.ok ? 'C’est reparti' : 'Envoi impossible'}
        description={feedback?.message}
        variant={feedback?.ok ? 'success' : 'danger'}
      />
    </>
  )
}
