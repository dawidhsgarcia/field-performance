import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@/components/acompanhamento/matrix.css'
import { ThemeProvider } from '@/hooks/useTheme'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <App />
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
)
