import { redirect } from 'next/navigation'
import { logoutAdmin } from '@/lib/actions/admin-auth'
import { getAdminSession } from '@/lib/core/session-cookies'

const AdminPage = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-rose-500">Arbeauté</p>
          <h1 className="font-heading text-3xl font-bold">Agenda</h1>
        </div>
        <form action={logoutAdmin}>
          <button
            type="submit"
            className="rounded-full border px-4 py-2 text-sm font-medium"
          >
            Se déconnecter
          </button>
        </form>
      </header>

      <section className="mt-10 rounded-3xl border bg-card p-8">
        <h2 className="text-xl font-semibold">Fondation prête</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Le dashboard de rendez-vous sera construit lors de l’étape Agenda
          admin. La session sécurisée et la protection de cette zone sont
          actives.
        </p>
      </section>
    </main>
  )
}

export default AdminPage
