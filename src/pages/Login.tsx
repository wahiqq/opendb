import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconLayers } from '../components/Icons'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store user info in localStorage
      localStorage.setItem('riseUser', JSON.stringify(data.user))

      // Redirect to dashboard
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        padding: '24px',
      }}>
        {/* Logo and header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'var(--green-600)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: 'var(--shadow-green)',
          }}>
            <IconLayers style={{ width: 32, height: 32, color: 'white' }} />
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 900,
            color: 'var(--text)',
            marginBottom: '8px',
            letterSpacing: '-0.5px',
          }}>
            RISE Research
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}>
            Sign in to access your dashboard
          </p>
        </div>

        {/* Login form */}
        <div className="card" style={{ marginBottom: 0 }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '8px',
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '10px',
                  outline: 'none',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--green-600)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-strong)'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '8px',
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '10px',
                  outline: 'none',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--green-600)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-strong)'}
              />
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '20px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <footer style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '0.8rem',
          color: 'var(--text-faint)',
        }}>
          © 2026 RISE Research — Internal Use Only
        </footer>
      </div>
    </div>
  )
}
