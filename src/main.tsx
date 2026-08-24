import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './shared/api/queryClient.ts'
import { AuthProvider } from './app/providers/AuthContext.tsx'
import { RecaptchaProvider } from './app/providers/RecaptchaProvider.tsx'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from './shared/components/feedback/ToastProvider.tsx'
import { ConfirmDialogProvider } from './shared/components/feedback/ConfirmDialogProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RecaptchaProvider>
          <AuthProvider>
            <ToastProvider>
              <ConfirmDialogProvider>
                <App />
              </ConfirmDialogProvider>
            </ToastProvider>
          </AuthProvider>
        </RecaptchaProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
