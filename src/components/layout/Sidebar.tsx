import { CalendarDays, Clock3, Fuel, LayoutDashboard, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore, type ActiveTab } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { AppLogo } from './AppLogo'

const NAV_ITEMS: Array<{ tab: ActiveTab; label: string; icon: typeof LayoutDashboard }> = [
  { tab: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { tab: 'acompanhamento', label: 'Acompanhamento', icon: CalendarDays },
  { tab: 'combustivel', label: 'Combustível', icon: Fuel },
  { tab: 'bh', label: 'Banco de Horas', icon: Clock3 },
  { tab: 'params', label: 'Parâmetros', icon: Settings },
]

interface SidebarProps {
  collapsed?: boolean
  withLogo?: boolean
  onNavigate?: () => void
}

export function Sidebar({ collapsed = false, withLogo = false, onNavigate }: SidebarProps) {
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const can = useAuthStore((s) => s.can)

  const items = NAV_ITEMS.filter((item) => {
    if (item.tab === 'params') return can('salvarParams')
    return true
  })

  return (
    <div className="flex h-full flex-col gap-2">
      {withLogo && (
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b px-4',
            collapsed && 'justify-center px-0',
          )}
        >
          <AppLogo collapsed={collapsed} />
        </div>
      )}
      <nav
        aria-label="Navegação principal"
        className={cn('flex flex-1 flex-col gap-1 p-3', collapsed && 'px-2')}
      >
        {items.map((item) => {
          const Icon = item.icon
          const active = activeTab === item.tab
          const navButton = (
            <Button
              key={item.tab}
              type="button"
              variant={active ? 'default' : 'ghost'}
              className={cn('w-full justify-start gap-3', collapsed && 'justify-center px-2')}
              onClick={() => {
                setActiveTab(item.tab)
                onNavigate?.()
              }}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Button>
          )
          if (collapsed) {
            return (
              <Tooltip key={item.tab}>
                <TooltipTrigger asChild>{navButton}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          }
          return navButton
        })}
      </nav>
    </div>
  )
}
