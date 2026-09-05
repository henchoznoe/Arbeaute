import Link from 'next/link'
import { ActivityList } from '@/components/admin/activity-list'
import { Button } from '@/components/ui/button'
import type { ActivityItem } from '@/lib/admin/activity'

export const ActivityOverview = ({
  activities,
}: {
  activities: ActivityItem[]
}) => (
  <section className="mt-4 rounded-2xl border bg-card p-3 sm:mt-6 sm:p-4">
    <h2 className="font-semibold">Activité récente</h2>
    <p className="mt-1 text-xs text-muted-foreground">
      Les derniers rendez-vous et changements, depuis le site ou par Arzu
    </p>
    <div className="mt-4">
      <ActivityList activities={activities} />
    </div>
    <Button asChild variant="outline" className="mt-3 w-full">
      <Link href="/admin/activity">Voir toute l’activité</Link>
    </Button>
  </section>
)
