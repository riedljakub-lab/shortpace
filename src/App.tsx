import { HashRouter, Route, Routes } from 'react-router'
import { OnboardingPage } from './features/onboarding/OnboardingPage'
import { AppShell } from './layout/AppShell'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ProfileProvider } from './profile/ProfileProvider'
import { ThemeProvider } from './theme/ThemeProvider'

// HashRouter: URLs look like /shortpace/#/plan. GitHub Pages can't serve /shortpace/plan
// directly on refresh, but the part after # never reaches the server, so it always works.
export default function App() {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <HashRouter>
          <Routes>
            {/* Onboarding: focused flow without the main navigation. */}
            <Route element={<AppShell showNav={false} />}>
              <Route path="onboarding" element={<OnboardingPage />} />
            </Route>
            <Route element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="plan" element={<PlaceholderPage title="Plan" />} />
              <Route path="log" element={<PlaceholderPage title="Log a run" />} />
              <Route path="dashboard" element={<PlaceholderPage title="Dashboard" />} />
              <Route path="*" element={<PlaceholderPage title="Page not found" />} />
            </Route>
          </Routes>
        </HashRouter>
      </ProfileProvider>
    </ThemeProvider>
  )
}
