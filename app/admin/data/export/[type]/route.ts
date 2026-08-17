import {
  createAppointmentsExport,
  createCatalogExport,
  createCustomersExport,
} from '@/lib/admin/data-management'
import prisma from '@/lib/core/prisma'
import { getAdminSession } from '@/lib/core/session-cookies'
import { isDateKey } from '@/lib/reservation/time'
import { AppointmentStatus } from '@/prisma/generated/prisma/enums'

interface ExportRouteProps {
  params: Promise<{ type: string }>
}

const csvResponse = (csv: string, name: string): Response =>
  new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="arbeaute-${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })

export const GET = async (
  request: Request,
  { params }: ExportRouteProps,
): Promise<Response> => {
  if (!(await getAdminSession()))
    return new Response('Non autorisé', { status: 401 })

  const type = (await params).type
  const { searchParams } = new URL(request.url)
  try {
    if (type === 'appointments') {
      const from = searchParams.get('from') || undefined
      const to = searchParams.get('to') || undefined
      if (
        (from && !isDateKey(from)) ||
        (to && !isDateKey(to)) ||
        (from && to && from > to)
      )
        return new Response('Période invalide', { status: 400 })
      const requestedStatus = searchParams.get('status')
      const status = Object.values(AppointmentStatus).find(
        value => value === requestedStatus,
      )
      if (requestedStatus && !status)
        return new Response('Statut invalide', { status: 400 })
      return csvResponse(
        await createAppointmentsExport(prisma, { from, to, status }),
        'rendez-vous',
      )
    }
    if (type === 'customers')
      return csvResponse(await createCustomersExport(prisma), 'clientes')
    if (type === 'catalog')
      return csvResponse(await createCatalogExport(prisma), 'catalogue')
    return new Response('Export introuvable', { status: 404 })
  } catch {
    return new Response('L’export n’a pas pu être généré', { status: 500 })
  }
}
