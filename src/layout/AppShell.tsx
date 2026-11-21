import type { MouseEvent } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { Logo } from '../ui/Logo'
import { ThemeToggle } from '../ui/ThemeToggle'
import { NAV_ITEMS } from './navItems'

// With hash URLs, a normal href="#main" would change the page, so we move focus by hand.
function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
  document.getElementById('main')?.focus()
}

/**
 * Layout for every page: header, page content (<Outlet />), and mobile bottom nav.
 * `showNav={false}` is for focused flows like onboarding (logo + theme toggle only).
 */
export function AppShell({ showNav = true }: { showNav?: boolean }) {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        onClick={skipToContent}
        className="sr-only rounded-md bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to content
      </a>

      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" aria-label="ShortPace home" className="rounded-md">
            <Logo />
          </Link>

          {showNav ? (
            <nav aria-label="Main" className="hidden md:block">
              <ul className="flex gap-1">
                {NAV_ITEMS.map(({ to, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) =>
                        `block rounded-md px-3 py-2 text-sm font-medium ${
                          isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'
                        }`
                      }
                    >
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <ThemeToggle />
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className={`mx-auto w-full max-w-5xl flex-1 px-4 pt-8 outline-none md:pb-12 ${showNav ? 'pb-28' : 'pb-12'}`}
      >
        <Outlet />
      </main>

      {/* Phones: thumb-friendly tab bar at the bottom. Hidden from md (768px) up. */}
      {showNav ? (
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <ul className="mx-auto grid max-w-md grid-cols-4">
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                      isActive ? 'text-accent' : 'text-muted hover:text-ink'
                    }`
                  }
                >
                  <Icon width={22} height={22} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  )
}
