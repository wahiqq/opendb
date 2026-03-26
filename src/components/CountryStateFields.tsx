import { useState, useRef, useEffect } from 'react'
import { COUNTRIES, US_STATES } from '../data/geoData'

// ─── Shared styles ────────────────────────────────────────────────────────────

const baseInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  fontSize: '15px',
  border: '2px solid var(--gray-300)',
  borderRadius: '10px',
  outline: 'none',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const smInputStyle: React.CSSProperties = {
  ...baseInputStyle,
  padding: '10px 12px',
  fontSize: '14px',
  border: '1.5px solid var(--border)',
  borderRadius: '6px',
}

// ─── CountrySelect ────────────────────────────────────────────────────────────

interface CountrySelectProps {
  value: string
  onChange: (val: string) => void
  required?: boolean
  small?: boolean   // compact style for CompanyPage inline edit
}

export function CountrySelect({ value, onChange, required, small }: CountrySelectProps) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Keep query in sync when value changes externally
  useEffect(() => { setQuery(value) }, [value])

  const filtered = query.trim()
    ? COUNTRIES.filter(c => c.toLowerCase().includes(query.toLowerCase()))
    : COUNTRIES

  function select(country: string) {
    onChange(country)
    setQuery(country)
    setOpen(false)
  }

  function handleBlur(e: React.FocusEvent) {
    // Close only if focus leaves the whole container
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false)
      setFocused(false)
      // If typed value doesn't match a country, reset to last valid value or clear
      if (!COUNTRIES.includes(query)) {
        setQuery(value)
      }
    }
  }

  const inputStyle = small ? smInputStyle : baseInputStyle
  const activeBorder = small ? '1.5px solid var(--primary)' : '2px solid var(--primary)'
  const defaultBorder = small ? '1.5px solid var(--border)' : '2px solid var(--gray-300)'

  return (
    <div ref={containerRef} style={{ position: 'relative' }} onBlur={handleBlur}>
      <input
        type="text"
        value={query}
        required={required}
        placeholder="Search country…"
        autoComplete="off"
        onChange={e => {
          setQuery(e.target.value)
          onChange('')   // clear committed value while typing
          setOpen(true)
        }}
        onFocus={() => { setFocused(true); setOpen(true) }}
        style={{
          ...inputStyle,
          border: focused ? activeBorder : defaultBorder,
          paddingRight: '32px',
        }}
      />
      {/* chevron icon */}
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted)', pointerEvents: 'none' }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>

      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-xl)',
          maxHeight: '220px',
          overflowY: 'auto',
          zIndex: 2000,
        }}>
          {filtered.map(country => (
            <div
              key={country}
              onMouseDown={() => select(country)}
              style={{
                padding: '9px 14px',
                fontSize: '14px',
                cursor: 'pointer',
                color: country === value ? 'var(--primary)' : 'var(--text)',
                fontWeight: country === value ? 700 : 400,
                background: 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {country}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── StateField ───────────────────────────────────────────────────────────────

interface StateFieldProps {
  country: string
  value: string
  onChange: (val: string) => void
  small?: boolean
}

export function StateField({ country, value, onChange, small }: StateFieldProps) {
  const isUSA = country === 'United States'
  const inputStyle = small ? smInputStyle : baseInputStyle
  const activeBorder = small ? '1.5px solid var(--primary)' : '2px solid var(--primary)'
  const defaultBorder = small ? '1.5px solid var(--border)' : '2px solid var(--gray-300)'

  if (!isUSA) {
    // Free-text, optional
    return (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="State / Province (optional)"
        style={{ ...inputStyle, border: defaultBorder }}
        onFocus={e => (e.target.style.border = activeBorder)}
        onBlur={e => (e.target.style.border = defaultBorder)}
      />
    )
  }

  // USA → dropdown
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        ...inputStyle,
        border: defaultBorder,
        cursor: 'pointer',
      }}
      onFocus={e => (e.target.style.border = activeBorder)}
      onBlur={e => (e.target.style.border = defaultBorder)}
    >
      <option value="">Select state</option>
      {US_STATES.map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}
