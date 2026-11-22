import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router'
import { ImportPage } from './features/import/ImportPage'
import { LogPage } from './features/log/LogPage'
import { OnboardingPage } from './features/onboarding/OnboardingPage'
import { PlanPage } from './features/plan/PlanPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { ShopPage } from './features/shop/ShopPage'
import { AppShell } from './layout/AppShell'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ProfileProvider } from './profile/ProfileProvider'
import { RunsProvider } from './runs/RunsProvider'
import { WalletProvider } from './wallet/WalletProvider'
import { ThemeProvider } from './theme/ThemeProvider'

// The dashboard (and its chart library) loads only when you open it, keeping the app fast.
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'))

// HashRouter: URLs look like /shortpace/#/plan. GitHub Pages can't serve /shortpace/plan
// directly on refresh, but the part after # never reaches the server, so it always works.
export default function App() {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <RunsProvider>
          <WalletProvider>
            <HashRouter>
              <Routes>
                {/* Onboarding: focused flow without the main navigation. */}
                <Route element={<AppShell showNav={false} />}>
                  <Route path="onboarding" element={<OnboardingPage />} />
                </Route>
                <Route element={<AppShell />}>
                  <Route index element={<HomePage />} />
                  <Route path="plan" element={<PlanPage />} />
                  <Route path="log" element={<LogPage />} />
                  <Route path="import" element={<ImportPage />} />
                  <Route
                    path="dashboard"
                    element={
                      <Suspense fallback={<p className="text-muted">Loading charts…</p>}>
                        <DashboardPage />
                      </Suspense>
                    }
                  />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="shop" element={<ShopPage />} />
                  <Route path="*" element={<PlaceholderPage title="Page not found" />} />
                </Route>
              </Routes>
            </HashRouter>
          </WalletProvider>
        </RunsProvider>
      </ProfileProvider>
    </ThemeProvider>
  )
}
