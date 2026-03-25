import { useLocation, useNavigate } from 'react-router-dom'
import {
  IconHome,
  IconToolbox,
  IconLayers,
} from './Icons'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: IconHome },
  { to: '/tool-suite', label: 'Tool Suite', icon: IconToolbox },
] as const

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="navbar">
      <button
        className="navbar-brand"
        onClick={() => navigate('/dashboard')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', height: '100%', padding: 0 }}
      >
        <div className="navbar-brand-icon">
          <IconLayers style={{ width: 18, height: 18 }} />
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
            >
              <Icon />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
