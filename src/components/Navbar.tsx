import { useLocation, useNavigate } from 'react-router-dom'
import {
  IconHome,
  IconToolbox,
  IconLayers,
  IconLogout,
} from './Icons'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: IconHome },
  { to: '/tool-suite', label: 'Tool Suite', icon: IconToolbox },
] as const

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <button
        className="navbar-brand"
        onClick={() => navigate('/dashboard')}
        aria-label="RISE Research - Home"
        title="Go to dashboard"
      >
        <div className="navbar-brand-icon">
          <img src="/logo.png" alt="RISE Research" width={40} height={40} />
        </div>
        <span className="navbar-brand-text">
          RISE <span>Research</span>
        </span>
      </button>

      <div className="navbar-links">
        {navLinks.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to
          return (
            <button
              key={to}
              className={`navbar-link${active ? ' active' : ''}`}
              onClick={() => navigate(to)}
              aria-current={active ? 'page' : undefined}
              title={label}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          )
        })}
        <button
          className="navbar-link"
          onClick={() => {
            localStorage.removeItem('riseUser')
            navigate('/')
          }}
          title="Sign out"
        >
          <IconLogout aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  )
}
