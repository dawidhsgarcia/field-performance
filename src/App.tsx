import { lazy, Suspense, useEffect } from 'react'
import { AppLayout } from '@/layouts/AppLayout'
import { LoadingScreen } from '@/components/layout/LoadingScreen'
import { useAuthSession } from '@/hooks/useAuthSession'
import { useLeituraDefaultRegion } from '@/hooks/useLeituraDefaultRegion'
import { useIdleLogout } from '@/hooks/useIdleLogout'
import { useAuthStore } from '@/stores/auth.store'
import { useAppStore } from '@/stores/app.store'
import { useStateStore } from '@/stores/state.store'
import { LoginPage } from '@/pages/LoginPage'
import type { ActiveTab } from '@/stores/app.store'

const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const AcompanhamentoPage = lazy(() =>
  import('@/pages/AcompanhamentoPage').then((m) => ({ default: m.AcompanhamentoPage })),
)
const CombustivelPage = lazy(() =>
  import('@/pages/CombustivelPage').then((m) => ({ default: m.CombustivelPage })),
)
const BancoHorasPage = lazy(() =>
  import('@/pages/BancoHorasPage').then((m) => ({ default: m.BancoHorasPage })),
)
const ParametrosPage = lazy(() =>
  import('@/pages/ParametrosPage').then((m) => ({ default: m.ParametrosPage })),
)

const PAGES: Record<ActiveTab, React.LazyExoticComponent<React.ComponentType>> = {
  dashboard: DashboardPage,
  acompanhamento: AcompanhamentoPage,
  combustivel: CombustivelPage,
  bh: BancoHorasPage,
  params: ParametrosPage,
}

function App() {
  useAuthSession()
  useLeituraDefaultRegion()
  useIdleLogout()

  const carregando = useAuthStore((s) => s.carregando)
  const user = useAuthStore((s) => s.user)
  const can = useAuthStore((s) => s.can)
  const activeTab = useAppStore((s) => s.activeTab)
  const loadState = useStateStore((s) => s.loadState)
  const resetState = useStateStore((s) => s.reset)

  useEffect(() => {
    if (user) {
      void loadState()
    } else {
      resetState()
    }
  }, [user, loadState, resetState])

  if (carregando) return <LoadingScreen />
  if (!user) return <LoginPage />

  const tab: ActiveTab = activeTab === 'params' && !can('salvarParams') ? 'dashboard' : activeTab
  const Page = PAGES[tab]

  return (
    <AppLayout>
      <Suspense fallback={<LoadingScreen />}>
        <Page />
      </Suspense>
    </AppLayout>
  )
}

export default App
