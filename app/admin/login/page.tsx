import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SubmitButton } from '@/components/ui/submit-button'
import { loginAdmin } from '@/lib/actions/admin-auth'
import { getAdminSession } from '@/lib/core/session-cookies'

interface AdminLoginPageProps {
  searchParams: Promise<{ error?: string }>
}

const AdminLoginPage = async ({
  searchParams,
}: Readonly<AdminLoginPageProps>) => {
  if (await getAdminSession()) redirect('/admin')
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-sm rounded-3xl border bg-card p-8 shadow-xl shadow-rose-100/40">
        <Link href="/" className="font-heading text-xl font-bold">
          Arbeauté
        </Link>
        <h1 className="mt-8 text-2xl font-semibold">Administration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saisissez le mot de passe de l’institut.
        </p>

        <form action={loginAdmin} className="mt-8 space-y-4">
          <label className="block text-sm font-medium" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-12 w-full rounded-xl border bg-background px-4 outline-none focus:ring-2 focus:ring-ring"
          />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              Connexion impossible. Vérifiez le mot de passe ou réessayez plus
              tard.
            </p>
          ) : null}
          <SubmitButton
            pendingLabel="Connexion…"
            className="h-12 w-full rounded-xl bg-primary px-4 font-medium text-primary-foreground"
          >
            Se connecter
          </SubmitButton>
        </form>
      </section>
    </main>
  )
}

export default AdminLoginPage
