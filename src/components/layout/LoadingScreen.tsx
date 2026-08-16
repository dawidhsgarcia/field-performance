import { Loader2 } from 'lucide-react'
import { AppLogo } from './AppLogo'

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <AppLogo />
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
    </div>
  )
}
