import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}
