import type { ReactNode } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAppStore } from '@/stores/app.store'

export function AppLayout({ children }: { children: ReactNode }) {
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleCollapsed = useAppStore((s) => s.toggleSidebarCollapsed)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <div className="flex">
        <aside
          className={cn(
            'sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col overflow-y-auto border-r bg-card transition-[width] duration-200 lg:flex',
            collapsed ? 'w-16' : 'w-64',
          )}
        >
          <div className={cn('flex p-2', collapsed ? 'justify-center' : 'justify-end')}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          </div>
          <Sidebar collapsed={collapsed} />
        </aside>
        <main id="conteudo" className="min-w-0 flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
      <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Alloha Fibra — Field Performance - Gestão de Desempenho Operacional
        <br />Desenvolvido por David Garcia
      </footer>
    </div>
  )
}
