import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { FormField, formControlClass } from '@/components/ui/form-field'
import { MAIN_CONTENT_ID } from '@/components/ui/skip-link'
import { SubmitButton } from '@/components/ui/submit-button'
import { loginAdmin } from '@/lib/actions/admin-auth'
import { getAdminSession } from '@/lib/core/session-cookies'

interface AdminLoginPageProps {
  searchParams: Promise<{ error?: string }>
}

const AdminLoginPage = ({ searchParams }: Readonly<AdminLoginPageProps>) => (
  <Suspense fallback={<AdminSkeleton variant="card" />}>
    <AdminLogin searchParams={searchParams} />
  </Suspense>
)

const AdminLogin = async ({ searchParams }: Readonly<AdminLoginPageProps>) => {
  if (await getAdminSession()) redirect('/admin')
  const { error } = await searchParams

  return (
    <main
      id={MAIN_CONTENT_ID}
      className="flex min-h-screen items-center justify-center px-6 py-16"
    >
      <section className="w-full max-w-sm rounded-3xl border bg-card p-8 shadow-xl shadow-brand-soft/40">
        <Link href="/" className="font-heading text-xl font-bold">
          Arbeauté
        </Link>
        <h1 className="mt-8 text-2xl font-semibold">Administration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saisissez le mot de passe de l’institut.
        </p>

        <form action={loginAdmin} className="mt-8 space-y-4">
          <FormField controlId="password" label="Mot de passe">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={formControlClass}
            />
          </FormField>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              Connexion impossible. Vérifiez le mot de passe ou réessayez plus
              tard.
            </p>
          ) : null}
          <SubmitButton pendingLabel="Connexion…" size="lg" className="w-full">
            Se connecter
          </SubmitButton>
        </form>
      </section>
    </main>
  )
}

export default AdminLoginPage
