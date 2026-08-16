import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PagePlaceholderProps {
  title: string
  description: string
  children?: ReactNode
  className?: string
}

export function PagePlaceholder({ title, description, children, className }: PagePlaceholderProps) {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
        <div className="text-sm text-muted-foreground">{children ?? 'Em construção'}</div>
      </div>
    </section>
  )
}
