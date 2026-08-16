import { useState } from 'react'
import { LogOut } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/auth.store'
import { PERFIS_LIST } from '@/lib/constants'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function UserMenu() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [open, setOpen] = useState(false)

  if (!user) return null

  const perfilLabel = PERFIS_LIST.find((p) => p.value === user.perfil)?.label ?? user.perfil

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2" aria-label="Menu do usuário">
            <Avatar className="size-8">
              <AvatarFallback>{initials(user.nome)}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[160px] truncate text-sm font-medium sm:block">
              {user.nome}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-56">
          <DropdownMenuLabel>
            <div className="text-sm font-medium whitespace-nowrap">{user.nome}</div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {user.email} · {perfilLabel}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              setOpen(true)
            }}
          >
            <LogOut className="size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será desconectado e retornará à tela de login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void logout()}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
