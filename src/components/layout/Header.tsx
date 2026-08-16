import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAppStore } from '@/stores/app.store'
import { AppLogo } from './AppLogo'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import { Sidebar } from './Sidebar'

export function Header() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-card px-4">
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar withLogo onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="min-w-0">
        <AppLogo />
      </div>
      <div className="flex-1" />
      <ThemeToggle />
      <UserMenu />
    </header>
  )
}
