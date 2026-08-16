import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth.store'

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const resetPassword = useAuthStore((s) => s.resetPassword)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !senha) {
      setError('Informe e-mail e senha.')
      return
    }
    setLoading(true)
    const res = await login(email, senha)
    setLoading(false)
    if (!res.ok) setError(res.msg || 'Falha no login.')
  }

  async function handleForgot() {
    setError('')
    if (!email) {
      setError('Informe seu e-mail para recuperar a senha.')
      return
    }
    const res = await resetPassword(email)
    if (res.ok) toast.success('E-mail de recuperação enviado.')
    else setError(res.msg || 'Não foi possível enviar o e-mail de recuperação.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center justify-items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-6" aria-hidden="true">
              <path fill="currentColor" d="M4 13h6V3H4v10Zm0 8h6v-6H4v6Zm8 0h6v-6h-6v6Zm0-18v12h6V3h-6Z" />
            </svg>
          </span>
          <CardTitle className="font-display mt-3 text-xl">Field Performance</CardTitle>
          <CardDescription>Gestão de Desempenho Operacional</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loginEmail">E-mail</Label>
              <Input
                id="loginEmail"
                type="email"
                autoComplete="username"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loginPassword">Senha</Label>
              <Input
                id="loginPassword"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Entrar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => void handleForgot()}
            >
              Esqueci minha senha
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Acesso restrito à equipe de gestão
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
