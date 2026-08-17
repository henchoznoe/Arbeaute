import { spawnSync } from 'node:child_process'

// Le build est partagé par tous les déploiements Vercel. Sans ce filtre, chaque
// preview de `develop` appliquait ses migrations à la base de production, qui se
// retrouvait en avance sur le code servi depuis `main` : une colonne NOT NULL
// ajoutée par une migration non publiée suffit alors à casser toute réservation.
const vercelEnvironment = process.env.VERCEL_ENV

if (vercelEnvironment && vercelEnvironment !== 'production') {
  console.log(
    `Migrations ignorées : déploiement « ${vercelEnvironment} ». Seule la production migre sa base.`,
  )
  process.exit(0)
}

const result = spawnSync('prisma', ['migrate', 'deploy'], {
  stdio: 'inherit',
  shell: true,
})

if (result.error) throw result.error

process.exit(result.status ?? 1)
