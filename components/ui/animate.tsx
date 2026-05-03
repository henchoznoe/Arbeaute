'use client'

import { useInView } from '@/hooks/use-in-view'
import { cn } from '@/lib/utils/cn'

type AnimateProps = {
  children: React.ReactNode
  className?: string
  delay?: number
  animation?: 'fade-up' | 'fade-in' | 'fade-left' | 'fade-right' | 'scale-in'
}

export function Animate({
  children,
  className,
  delay = 0,
  animation = 'fade-up',
}: AnimateProps) {
  const { ref, isVisible } = useInView(0.1)

  const base = 'transition-all duration-700 ease-out'

  const hidden: Record<string, string> = {
    'fade-up': 'translate-y-8 opacity-0',
    'fade-in': 'opacity-0',
    'fade-left': '-translate-x-8 opacity-0',
    'fade-right': 'translate-x-8 opacity-0',
    'scale-in': 'scale-95 opacity-0',
  }

  const visible = 'translate-x-0 translate-y-0 scale-100 opacity-100'

  return (
    <div
      ref={ref}
      className={cn(base, isVisible ? visible : hidden[animation], className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
