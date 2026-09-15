import type { Prisma, PrismaClient } from '@/prisma/generated/prisma/client'

type PackageMailDatabase =
  | Pick<PrismaClient, 'packageSession'>
  | Pick<Prisma.TransactionClient, 'packageSession'>

export const getAppointmentPackageMailContext = async (
  database: PackageMailDatabase,
  appointmentId: string,
) => {
  const session = await database.packageSession.findUnique({
    where: { appointmentId },
    select: {
      customerPackage: {
        select: {
          revenueAppointmentId: true,
          packageNameSnapshot: true,
          packagePriceCents: true,
          sessionCountSnapshot: true,
          installmentCount: true,
        },
      },
    },
  })
  if (!session) return undefined
  return {
    name: session.customerPackage.packageNameSnapshot,
    priceCents: session.customerPackage.packagePriceCents,
    sessionCount: session.customerPackage.sessionCountSnapshot,
    installmentCount: session.customerPackage.installmentCount,
    isInitialAppointment:
      session.customerPackage.revenueAppointmentId === appointmentId,
  }
}
