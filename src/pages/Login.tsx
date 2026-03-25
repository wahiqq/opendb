import { useState, FormEvent, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [success, setSuccess] = useState('')
  const emailInputRef = useRef<HTMLInputElement>(null)

  // WCAG: Focus management - focus first error
  useEffect(() => {
    if (emailError && emailInputRef.current) {
      emailInputRef.current.focus()
    }
  }, [emailError])

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    setEmailError('')
    setLoading(true)

    // Validate inputs
    if (!email) {
      setEmailError('Email is required')
      setLoading(false)
      return
    }

    if (!password) {
      setError('Password is required')
      setLoading(false)
      return
    }

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

      setSuccess('Login successful! Redirecting...')
      
      // Redirect to dashboard
      setTimeout(() => navigate('/dashboard'), 500)
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
      padding: '24px',
    }}>
      {loading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(251, 248, 239, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          gap: '16px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--gray-200)',
            borderTop: '3px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
            Signing in...
          </p>
        </div>
      )}
      <div style={{
        width: '100%',
        maxWidth: '420px',
      }}>
        {/* Logo and header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'var(--primary)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: 'var(--shadow-primary)',
            overflow: 'hidden',
          }}>
            <img src="/logo.png" alt="RISE Research logo" width={64} height={64} />
          </div>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 5vw, 2rem)',
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
            margin: 0,
          }}>
            Sign in to access your dashboard
          </p>
        </div>

        {/* Login form */}
        <div className="card" style={{ marginBottom: 0 }}>
          <form onSubmit={handleLogin} noValidate>
            {/* Email field - WCAG compliant */}
            <div className="form-group">
              <label htmlFor="email">
                Email
                <span className="label-required" aria-label="required">
                  *
                </span>
              </label>
              <input
                ref={emailInputRef}
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setEmailError('')
                }}
                onBlur={(e) => {
                  if (!e.target.value) {
                    setEmailError('Email is required')
                  } else if (!e.target.validity.valid) {
                    setEmailError('Please enter a valid email address')
                  }
                }}
                required
                autoComplete="email"
                placeholder="Enter your email address"
                aria-invalid={emailError ? 'true' : 'false'}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
              {emailError && (
                <span id="email-error" className="form-error" role="alert">
                  {emailError}
                </span>
              )}
            </div>

            {/* Password field - WCAG compliant */}
            <div className="form-group">
              <label htmlFor="password">
                Password
                <span className="label-required" aria-label="required">
                  *
                </span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                onBlur={(e) => {
                  if (!e.target.value) {
                    setError('Password is required')
                  }
                }}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? 'password-error' : undefined}
              />
              {error && (
                <span id="password-error" className="form-error" role="alert">
                  {error}
                </span>
              )}
            </div>

            {/* Success message */}
            {success && (
              <div className="alert alert-success" role="status" aria-live="polite">
                ✓ {success}
              </div>
            )}

            {/* Submit button - WCAG touch target 48px minimum */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !!emailError || !email || !password}
              style={{
                width: '100%',
                marginTop: '24px',
                fontSize: '1rem',
                fontWeight: 700,
                height: '48px',
              }}
              aria-busy={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Helper text */}
          <p style={{
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            marginTop: '20px',
            textAlign: 'center',
            margin: '0',
          }}>
            Use your registered credentials to access RISE Research tools
          </p>
        </div>

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}>
          © 2026 RISE Research — Internal Use Only
        </footer>
      </div>
    </div>
  )
}
