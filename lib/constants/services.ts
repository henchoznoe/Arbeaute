import {
  CircleDot,
  Eye,
  FlaskConical,
  Paintbrush,
  ScanLine,
  Scissors,
  Sparkles,
  Zap,
} from 'lucide-react'
import type { ElementType } from 'react'

type ServiceCategory = {
  title: string
  description: string
  icon: ElementType
}

export const services: ServiceCategory[] = [
  {
    title: 'Soins du visage',
    description: 'Soins bio et RHEA pour une peau éclatante et revitalisée.',
    icon: Sparkles,
  },
  {
    title: 'Épilation laser',
    description:
      'Épilation définitive pour femmes et hommes, toutes zones du corps.',
    icon: Zap,
  },
  {
    title: 'Épilation au fil',
    description: 'Technique douce et précise pour sourcils, lèvres et visage.',
    icon: Scissors,
  },
  {
    title: 'Onglerie',
    description:
      'Pose complète, remplissage, semi-permanent et dépose soignée.',
    icon: Paintbrush,
  },
  {
    title: 'Sourcils & Cils',
    description: 'Microblading, microshading, teintures cils et sourcils.',
    icon: Eye,
  },
  {
    title: 'Endosphère Therapy',
    description: 'Anti-cellulite, remodelage, raffermissement visage et corps.',
    icon: CircleDot,
  },
  {
    title: 'Peelings',
    description: 'Cosmo Peel, Milk Peel et Crystal Peel professionnels.',
    icon: FlaskConical,
  },
  {
    title: 'Laser Erbium',
    description:
      'Resurfaçage cutané non ablatif pour rides, cicatrices et taches.',
    icon: ScanLine,
  },
]
