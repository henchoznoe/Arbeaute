import { expect, type Page, test } from '@playwright/test'
import { addDays, format, nextMonday } from 'date-fns'

const adminPassword = process.env.ADMIN_PASSWORD
if (!adminPassword)
  throw new Error('ADMIN_PASSWORD est requis pour la recette admin E2E.')

const login = async (page: Page): Promise<void> => {
  await page.goto('/admin/login')
  await page.getByLabel('Mot de passe').fill(adminPassword)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

const chooseService = async (page: Page): Promise<void> => {
  await page.getByLabel('Rechercher une prestation').fill('Soin visage bio')
  await page.getByRole('button', { name: /Soin visage bio/ }).click()
}

const fillAppointment = async (
  page: Page,
  date: string,
  time: string,
  lastName: string,
): Promise<void> => {
  await page.goto(`/admin/appointments/new?date=${date}&time=${time}`)
  await chooseService(page)
  await page.getByLabel('Prénom', { exact: false }).fill('Mobile')
  await page.getByLabel('Nom', { exact: true }).fill(lastName)
  await page
    .getByLabel('Email', { exact: false })
    .fill(`${lastName.toLowerCase()}@example.test`)
  await page.getByLabel('Téléphone', { exact: false }).fill('079 123 45 67')
}

const createAppointment = async (
  page: Page,
  date: string,
  time: string,
  lastName: string,
): Promise<void> => {
  await fillAppointment(page, date, time, lastName)
  await page.getByRole('button', { name: 'Créer le rendez-vous' }).click()
  await expect(page).toHaveURL(new RegExp(`/admin\\?date=${date}$`))
  await expect(
    page.getByRole('link', { name: new RegExp(`Mobile ${lastName}`) }).first(),
  ).toBeVisible()
}

const openAppointment = async (
  page: Page,
  date: string,
  lastName: string,
): Promise<void> => {
  await page.goto(`/admin?date=${date}`)
  await page
    .getByRole('link', { name: new RegExp(`Mobile ${lastName}`) })
    .first()
    .click()
  await expect(page).toHaveURL(/\/admin\/appointments\//)
}

test.describe('mutations locales isolées', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'arbeaute:install-dismissed:admin',
        String(Date.now()),
      )
    })
  })

  test('création, conflit, déplacement, annulation, statut et exception', async ({
    page,
  }, testInfo) => {
    await login(page)

    const appointmentDate = format(
      addDays(nextMonday(new Date()), 7 * (testInfo.retry + 1)),
      'yyyy-MM-dd',
    )
    const suffix = `${testInfo.workerIndex}${testInfo.retry}${Date.now()}`
    const movedName = `E2EMove${suffix}`
    const conflictName = `E2EConflict${suffix}`
    const cancelledName = `E2ECancel${suffix}`

    await createAppointment(page, appointmentDate, '08:00', movedName)

    await fillAppointment(page, appointmentDate, '08:00', conflictName)
    await page.getByRole('button', { name: 'Créer le rendez-vous' }).click()
    await expect(
      page.getByText('Ce créneau chevauche déjà un rendez-vous confirmé.'),
    ).toBeVisible()

    await openAppointment(page, appointmentDate, movedName)
    await page.getByLabel('Heure de début').fill('10:00')
    await page
      .getByRole('button', { name: 'Enregistrer les modifications' })
      .click()
    await expect(page).toHaveURL(
      new RegExp(`/admin\\?date=${appointmentDate}$`),
    )

    await createAppointment(page, appointmentDate, '13:30', cancelledName)
    await openAppointment(page, appointmentDate, cancelledName)
    await page
      .getByRole('button', { name: 'Annuler le rendez-vous' })
      .first()
      .click()
    await page
      .getByRole('button', { name: 'Annuler le rendez-vous' })
      .last()
      .click()
    await expect(page).toHaveURL(
      new RegExp(`/admin\\?date=${appointmentDate}$`),
    )

    await openAppointment(page, appointmentDate, movedName)
    await page.getByRole('button', { name: 'Terminé', exact: true }).click()
    await page.getByRole('button', { name: 'Marquer comme terminé' }).click()
    await expect(
      page.getByRole('heading', { name: 'Détail du rendez-vous' }),
    ).toBeVisible()
    await expect(
      page.getByText('Terminé', { exact: true }).first(),
    ).toBeVisible()

    const exceptionDate = appointmentDate
    const exceptionLabel = `Fermeture E2E ${suffix}`
    await page.goto(`/admin/availability?month=${exceptionDate.slice(0, 7)}`)
    await page.getByRole('button', { name: 'Ajouter une exception' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Date', { exact: true }).fill(exceptionDate)
    await dialog.getByLabel('Début').fill('18:00')
    await dialog.getByLabel('Fin').fill('19:00')
    await dialog.getByLabel('Motif', { exact: false }).fill(exceptionLabel)
    await dialog
      .getByRole('button', { name: 'Enregistrer l’exception' })
      .click()
    await expect(page.getByText(exceptionLabel, { exact: true })).toBeVisible()
  })
})
