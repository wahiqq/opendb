import { useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import { IconChevronRight } from './Icons'

interface LayoutProps {
  title: string
  description: string
  children: React.ReactNode
}

export default function Layout({ title, description, children }: LayoutProps) {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <header className="page-header" role="banner">
        <div className="page-header-inner">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              Home
            </button>
            <span className="breadcrumb-sep" aria-hidden="true">
              <IconChevronRight />
            </span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>{title}</span>
          </nav>
          <h1>{title}</h1>
          <p className="page-header-desc">{description}</p>
        </div>
      </header>

      <main className="page-body" role="main">
        {children}
      </main>

      <footer className="site-footer" role="contentinfo">
        © 2026 RISE Research — Internal Tools
      </footer>
    </div>
  )
}

