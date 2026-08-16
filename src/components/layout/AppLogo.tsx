import { cn } from '@/lib/utils'

interface AppLogoProps {
  collapsed?: boolean
  className?: string
}

function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path fill="currentColor" d="M4 13h6V3H4v10Zm0 8h6v-6H4v6Zm8 0h6v-6h-6v6Zm0-18v12h6V3h-6Z" />
    </svg>
  )
}

export function AppLogo({ collapsed = false, className }: AppLogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BrandMark className="size-5" />
      </span>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <div className="truncate font-display text-sm font-semibold">Field Performance</div>
          <div className="truncate text-[11px] text-muted-foreground">Gestão de Desempenho</div>
        </div>
      )}
    </div>
  )
}
