import { useState, FormEvent } from 'react'
import { IconX, IconCheck } from './Icons'
import { CountrySelect, StateField } from './CountryStateFields'

interface POC {
  id: string
  name: string
  email: string
  emailFName: string
  personalEmail: string
  phoneNumber: string
  linkedin: string
  tags: string
  position: string
}

// A slot is either committed (saved=true) or being edited (saved=false)
interface POCSlot {
  id: string
  saved: boolean
  data: POC
  // editing state (only relevant when saved=false)
  draft: {
    name: string
    email: string
    emailNA: boolean
    emailFName: string
    emailFNameLocked: boolean
    personalEmail: string
    personalEmailNA: boolean
    phoneNumber: string
    phoneNumberNA: boolean
    linkedin: string
    linkedinNA: boolean
    position: string
    tags: string
  }
  // pending confirmation: 'email' | 'personalEmail' | null
  pendingConfirm: 'email' | 'personalEmail' | null
}

interface AddLeadModalProps {
  onClose: () => void
  onSuccess: () => void
  currentUser: {
    name: string
    email: string
  }
}

const TAG_OPTIONS = ['IECA', 'HECA', 'NACAC', 'WACAC', 'School', 'Community', 'Homeschool', 'No Tag']
const COMPANY_SIZE_OPTIONS = [
  { value: 'Small', label: 'Small (1-3 people)' },
  { value: 'MSME', label: 'MSME (less than 20 people)' },
  { value: 'Enterprise', label: 'Enterprise (more than 30 people)' },
]

const SIZE_RULES: Record<string, { min: number; max: number }> = {
  Small: { min: 1, max: 3 },
  MSME: { min: 3, max: 5 },
  Enterprise: { min: 5, max: 10 },
}

function newDraft() {
  return {
    name: '',
    email: '',
    emailNA: false,
    emailFName: '',
    emailFNameLocked: true,
    personalEmail: '',
    personalEmailNA: false,
    phoneNumber: '',
    phoneNumberNA: false,
    linkedin: '',
    linkedinNA: false,
    position: '',
    tags: '',
  }
}

function newSlot(): POCSlot {
  const id = Date.now().toString() + Math.random().toString(36).slice(2)
  return {
    id,
    saved: false,
    data: { id, name: '', email: '', emailFName: '', personalEmail: '', phoneNumber: '', linkedin: '', tags: '', position: '' },
    pendingConfirm: null,
    draft: newDraft(),
  }
}

function deriveFName(name: string) {
  return name.trim().split(/\s+/)[0] || ''
}

function isValidEmail(val: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
}

function isValidName(val: string): string | null {
  const trimmed = val.trim()
  if (!trimmed) return 'Name is required'
  if (/[^a-zA-Z .'`-]/.test(trimmed)) return 'Name can only contain letters, spaces, and full stops'
  const words = trimmed.split(/\s+/)
  for (const word of words) {
    if (word && !/^[A-Z]/.test(word)) return 'Each word in the name must start with a capital letter (e.g. Wahiq Iqbal)'
  }
  return null
}

function isValidPhone(val: string) {
  // Allow digits, spaces, dashes, parentheses, and leading +
  return /^\+?[\d\s\-()+]+$/.test(val.trim())
}

function isValidWebsite(val: string) {
  if (!val.trim()) return false // required field
  try {
    const url = new URL(val.trim().startsWith('http') ? val.trim() : 'https://' + val.trim())
    return url.hostname.includes('.')
  } catch {
    return false
  }
}

function isValidLinkedIn(val: string) {
  if (!val.trim()) return false // required field
  try {
    const url = new URL(val.trim().startsWith('http') ? val.trim() : 'https://' + val.trim())
    return url.hostname.includes('.')
  } catch {
    return false
  }
}

function extractDomain(websiteVal: string): string {
  try {
    const raw = websiteVal.trim()
    const url = new URL(raw.startsWith('http') ? raw : 'https://' + raw)
    return url.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function emailMatchesDomain(email: string, domain: string): boolean {
  if (!domain) return true // no domain to check against
  const parts = email.trim().split('@')
  if (parts.length !== 2) return false
  return parts[1].toLowerCase() === domain
}

export default function AddLeadModal({ onClose, onSuccess, currentUser }: AddLeadModalProps) {
  const [companyName, setCompanyName] = useState('')
  const [country, setCountry] = useState('')
  const [state, setState] = useState('')
  const [isRemote, setIsRemote] = useState(false)
  const [website, setWebsite] = useState('')
  const [websiteNA, setWebsiteNA] = useState(false)
  const [companySize, setCompanySize] = useState('')
  const [notes, setNotes] = useState('')
  const [slots, setSlots] = useState<POCSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // When company size changes, reset slots to the minimum count for that size
  function handleSizeChange(size: string) {
    setCompanySize(size)
    setError('')
    if (!size || !SIZE_RULES[size]) {
      setSlots([])
      return
    }
    const { min } = SIZE_RULES[size]
    const initial: POCSlot[] = Array.from({ length: min }, () => newSlot())
    setSlots(initial)
  }

  function updateDraft(slotId: string, patch: Partial<POCSlot['draft']>) {
    setSlots(prev => prev.map(s =>
      s.id === slotId ? { ...s, draft: { ...s.draft, ...patch } } : s
    ))
  }

  function setPendingConfirm(slotId: string, val: POCSlot['pendingConfirm']) {
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, pendingConfirm: val } : s))
  }

  function saveSlot(slotId: string) {
    setSlots(prev => {
      const slot = prev.find(s => s.id === slotId)
      if (!slot) return prev
      const d = slot.draft
      const nameErr = isValidName(d.name)
      if (nameErr) { setError(nameErr); return prev }
      if (!d.position.trim() || !d.tags) {
        setError('Position and Tags are required for each POC')
        return prev
      }
      if (!d.emailNA && !d.email.trim()) {
        setError('Work Email is required (or mark as Not available)')
        return prev
      }
      if (!d.emailNA && !isValidEmail(d.email)) {
        setError('Work Email is not a valid email address')
        return prev
      }
      if (!d.emailNA && !websiteNA) {
        const domain = extractDomain(website)
        if (domain && !emailMatchesDomain(d.email, domain)) {
          setError(`Work Email must belong to the company domain (@${domain})`)
          return prev
        }
      }
      if (!d.emailNA && !d.personalEmailNA && d.personalEmail.trim() && !isValidEmail(d.personalEmail)) {
        setError('Personal Email is not a valid email address')
        return prev
      }

      if (!d.phoneNumberNA && d.phoneNumber.trim() && !isValidPhone(d.phoneNumber)) {
        setError('Phone number can only contain digits, spaces, dashes, and a leading +')
        return prev
      }
      if (!d.linkedinNA && !isValidLinkedIn(d.linkedin)) {
        setError('LinkedIn is required and must be a valid URL (or mark as Not available)')
        return prev
      }
      setError('')
      const poc: POC = {
        id: slot.id,
        name: d.name.trim(),
        email: d.emailNA ? 'NA' : d.email.trim(),
        emailFName: d.emailFName.trim() || deriveFName(d.name),
        personalEmail: !d.emailNA ? 'NA' : (d.personalEmailNA ? 'NA' : d.personalEmail.trim()),
        phoneNumber: d.phoneNumberNA ? 'NA' : d.phoneNumber.trim(),
        linkedin: d.linkedinNA ? 'NA' : d.linkedin.trim(),
        position: d.position.trim(),
        tags: d.tags,
      }
      return prev.map(s => s.id === slotId ? { ...s, saved: true, data: poc } : s)
    })
  }

  function editSlot(slotId: string) {
    setSlots(prev => prev.map(s => {
      if (s.id !== slotId) return s
      return {
        ...s,
        saved: false,
        pendingConfirm: null,
        draft: {
          name: s.data.name,
          email: s.data.email === 'NA' ? '' : s.data.email,
          emailNA: s.data.email === 'NA',
          emailFName: s.data.emailFName,
          emailFNameLocked: true,
          personalEmail: s.data.email === 'NA' || s.data.personalEmail === 'NA' ? '' : s.data.personalEmail,
          personalEmailNA: s.data.personalEmail === 'NA' && s.data.email !== 'NA',
          phoneNumber: s.data.phoneNumber === 'NA' ? '' : s.data.phoneNumber,
          phoneNumberNA: s.data.phoneNumber === 'NA',
          linkedin: s.data.linkedin === 'NA' ? '' : s.data.linkedin,
          linkedinNA: s.data.linkedin === 'NA',
          position: s.data.position,
          tags: s.data.tags,
        },
      }
    }))
  }

  function removeSlot(slotId: string) {
    if (!companySize || !SIZE_RULES[companySize]) return
    const { min } = SIZE_RULES[companySize]
    setSlots(prev => {
      if (prev.length <= min) return prev
      return prev.filter(s => s.id !== slotId)
    })
  }

  function addSlot() {
    if (!companySize || !SIZE_RULES[companySize]) return
    const { max } = SIZE_RULES[companySize]
    if (slots.length >= max) return
    setSlots(prev => [...prev, newSlot()])
  }

  const savedCount = slots.filter(s => s.saved).length
  const rules = companySize ? SIZE_RULES[companySize] : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!companyName.trim() || (!isRemote && !country.trim()) || !companySize || !notes.trim()) {
      setError('Company Name, Country, Company Size, and Notes are required')
      return
    }

    if (!websiteNA && !isValidWebsite(website)) {
      setError('Website is required and must be a valid URL (e.g. https://example.com) — or mark as Not available')
      return
    }

    // Check any unsaved slots
    const unsaved = slots.filter(s => !s.saved)
    if (unsaved.length > 0) {
      setError(`You have ${unsaved.length} unsaved POC form(s). Please save or remove them before submitting.`)
      return
    }

    // Validate POC count
    if (rules) {
      if (savedCount < rules.min) {
        const sizeLabel = COMPANY_SIZE_OPTIONS.find(o => o.value === companySize)?.label || companySize
        setError(`${sizeLabel} requires at least ${rules.min} POC${rules.min > 1 ? 's' : ''}. You have ${savedCount}.`)
        return
      }
      if (savedCount > rules.max) {
        setError(`${companySize} allows a maximum of ${rules.max} POCs. You have ${savedCount}.`)
        return
      }
    }

    setLoading(true)

    try {
      const res = await fetch('/api/add-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          country: isRemote ? 'Remote' : country.trim(),
          state: isRemote ? '' : state.trim(),
          website: websiteNA ? 'NA' : website.trim(),
          qualification: companySize,
          notes: notes.trim(),
          createdBy: currentUser.name,
          pocs: slots.filter(s => s.saved).map(s => ({
            name: s.data.name,
            email: s.data.email,
            emailFName: s.data.emailFName,
            personalEmail: s.data.personalEmail,
            phoneNumber: s.data.phoneNumber,
            linkedin: s.data.linkedin,
            position: s.data.position,
            tags: s.data.tags,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add lead')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add lead')
    } finally {
      setLoading(false)
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '2px solid var(--gray-300)',
    borderRadius: '8px',
    outline: 'none',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '6px',
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: '14px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: 'var(--shadow-xl)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: 'var(--surface)',
          zIndex: 1,
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
            Add New Lead
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--text-muted)' }}
          >
            <IconX style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Company Name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
              Company Name <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 16px', fontSize: '15px', border: '2px solid var(--gray-300)', borderRadius: '10px', outline: 'none', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
            />
          </div>

          {/* Remote checkbox */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', width: 'fit-content' }}>
              <input
                type="checkbox"
                checked={isRemote}
                onChange={e => setIsRemote(e.target.checked)}
                style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Remote company</span>
            </label>
          </div>

          {/* Country / State */}
          {!isRemote && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                  Country <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <CountrySelect value={country} onChange={(val) => { setCountry(val); setState('') }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                  State <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                </label>
                <StateField country={country} value={state} onChange={setState} />
              </div>
            </div>
          )}

          {/* Website */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>
                Website <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={websiteNA}
                  onChange={e => { setWebsiteNA(e.target.checked); if (e.target.checked) setWebsite('') }}
                  style={{ width: '13px', height: '13px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Not available</span>
              </label>
            </div>
            <input
              type="url"
              value={website}
              disabled={websiteNA}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder={websiteNA ? '' : 'https://example.com'}
              style={{ width: '100%', padding: '12px 16px', fontSize: '15px', border: '2px solid var(--gray-300)', borderRadius: '10px', outline: 'none', background: websiteNA ? 'var(--gray-50)' : 'var(--surface)', color: websiteNA ? 'var(--text-muted)' : 'var(--text)', fontFamily: 'inherit', cursor: websiteNA ? 'not-allowed' : 'text', opacity: websiteNA ? 0.6 : 1 }}
              onFocus={(e) => { if (!websiteNA) e.target.style.borderColor = 'var(--primary)' }}
              onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
            />
          </div>

          {/* Company Size */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
              Company Size <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select
              value={companySize}
              onChange={(e) => handleSizeChange(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 16px', fontSize: '15px', border: '2px solid var(--gray-300)', borderRadius: '10px', outline: 'none', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', cursor: 'pointer' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
            >
              <option value="">Select company size</option>
              {COMPANY_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {companySize && rules && (
              <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {companySize === 'Small' && 'Small companies require 1–3 POCs.'}
                {companySize === 'MSME' && 'MSME companies require 3–5 POCs (minimum 3 cannot be removed).'}
                {companySize === 'Enterprise' && 'Enterprise companies require 5–10 POCs (minimum 5 cannot be removed).'}
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
              Notes <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              rows={3}
              style={{ width: '100%', padding: '12px 16px', fontSize: '15px', border: '2px solid var(--gray-300)', borderRadius: '10px', outline: 'none', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', resize: 'vertical' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
            />
          </div>

          {/* Created By */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Created By
            </label>
            <div style={{ padding: '12px 16px', background: 'var(--gray-50)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '15px', color: 'var(--text-muted)' }}>
              {currentUser.name}
            </div>
          </div>

          {/* POCs Section */}
          <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--gray-50)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
                Points of Contact (POCs)
                {rules && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '8px' }}>
                    {savedCount}/{slots.length} saved
                  </span>
                )}
              </h3>
            </div>

            {!companySize && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Select a company size above to add POCs
              </div>
            )}

            {companySize && slots.map((slot, index) => (
              <div key={slot.id} style={{ marginBottom: '12px' }}>
                {slot.saved ? (
                  // ── Saved POC card ──────────────────────────────────────────
                  <div style={{
                    padding: '12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginRight: '6px' }}>#{index + 1}</span>
                        {slot.data.name} • {slot.data.position}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {slot.data.email}
                        {slot.data.phoneNumber && ` • ${slot.data.phoneNumber}`}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ padding: '2px 8px', background: 'var(--green-100)', color: 'var(--green-700)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {slot.data.tags}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => editSlot(slot.id)}
                        title="Edit"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--primary)' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {/* Remove — only if above min */}
                      {rules && slots.length > rules.min && (
                        <button
                          type="button"
                          onClick={() => removeSlot(slot.id)}
                          title="Remove"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--error)' }}
                        >
                          <IconX style={{ width: 15, height: 15 }} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  // ── In-progress POC form ────────────────────────────────────
                  <div style={{ padding: '16px', background: 'var(--surface)', border: '2px solid var(--primary)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px' }}>
                      POC #{index + 1}
                    </div>

                    {/* Name */}
                    <div style={{ marginBottom: '10px' }}>
                      <label style={labelStyle}>Name <span style={{ color: 'var(--error)' }}>*</span></label>
                      <input
                        type="text"
                        value={slot.draft.name}
                        onChange={(e) => {
                          const name = e.target.value
                          updateDraft(slot.id, {
                            name,
                            emailFName: slot.draft.emailFNameLocked ? deriveFName(name) : slot.draft.emailFName,
                          })
                        }}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                      />
                    </div>

                    {/* Email FNAME */}
                    <div style={{ marginBottom: '10px' }}>
                      <label style={labelStyle}>
                        Email Name
                        <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>auto-derived from name</span>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          value={slot.draft.emailFName}
                          readOnly={slot.draft.emailFNameLocked}
                          onChange={(e) => updateDraft(slot.id, { emailFName: e.target.value })}
                          placeholder={slot.draft.name ? `Will be set to "${deriveFName(slot.draft.name)}"` : 'Enter a name above…'}
                          style={{
                            ...inputStyle,
                            border: `2px solid ${slot.draft.emailFNameLocked ? 'var(--border)' : 'var(--primary)'}`,
                            background: slot.draft.emailFNameLocked ? 'var(--gray-50)' : 'var(--surface)',
                            color: slot.draft.emailFNameLocked ? 'var(--text-muted)' : 'var(--text)',
                            fontStyle: slot.draft.emailFName ? 'normal' : 'italic',
                            cursor: slot.draft.emailFNameLocked ? 'default' : 'text',
                          }}
                        />
                        <button
                          type="button"
                          title={slot.draft.emailFNameLocked ? 'Override value' : 'Lock to auto-derive'}
                          onClick={() => {
                            if (slot.draft.emailFNameLocked) {
                              updateDraft(slot.id, { emailFNameLocked: false })
                            } else {
                              updateDraft(slot.id, { emailFNameLocked: true, emailFName: deriveFName(slot.draft.name) })
                            }
                          }}
                          style={{ flexShrink: 0, background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', cursor: 'pointer', color: slot.draft.emailFNameLocked ? 'var(--text-muted)' : 'var(--primary)', display: 'flex', alignItems: 'center' }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Work Email confirmation popup */}
                    {slot.pendingConfirm === 'email' && (
                      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
                        <div style={{ background: 'var(--surface)', borderRadius: '12px', maxWidth: '380px', width: '100%', padding: '24px', boxShadow: 'var(--shadow-xl)' }}>
                          <h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>No Work Email?</h4>
                          <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            I confirm that this POC does not have a work email associated.
                          </p>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" onClick={() => setPendingConfirm(slot.id, null)} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)' }}>
                              Cancel
                            </button>
                            <button type="button" onClick={() => { updateDraft(slot.id, { emailNA: true, email: '', personalEmail: '', personalEmailNA: false }); setPendingConfirm(slot.id, null) }} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '8px', background: 'var(--primary)', color: '#fff', cursor: 'pointer' }}>
                              Accept
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Personal Email confirmation popup */}
                    {slot.pendingConfirm === 'personalEmail' && (
                      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
                        <div style={{ background: 'var(--surface)', borderRadius: '12px', maxWidth: '380px', width: '100%', padding: '24px', boxShadow: 'var(--shadow-xl)' }}>
                          <h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>No Personal Email?</h4>
                          <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            I confirm that this POC does not have a personal email associated.
                          </p>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" onClick={() => setPendingConfirm(slot.id, null)} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)' }}>
                              Cancel
                            </button>
                            <button type="button" onClick={() => { updateDraft(slot.id, { personalEmailNA: true, personalEmail: '' }); setPendingConfirm(slot.id, null) }} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '8px', background: 'var(--primary)', color: '#fff', cursor: 'pointer' }}>
                              Accept
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Work Email */}
                    {(() => {
                      const websiteNeeded = !websiteNA && !isValidWebsite(website)
                      const emailDisabled = slot.draft.emailNA || websiteNeeded
                      const domain = (!websiteNA && isValidWebsite(website)) ? extractDomain(website) : ''
                      const emailDomainWarn = !slot.draft.emailNA && !websiteNeeded && domain && slot.draft.email && isValidEmail(slot.draft.email) && !emailMatchesDomain(slot.draft.email, domain)
                      return (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <label style={{ ...labelStyle, marginBottom: 0 }}>Work Email <span style={{ color: 'var(--error)' }}>*</span></label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: websiteNeeded ? 'not-allowed' : 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={slot.draft.emailNA}
                                disabled={websiteNeeded}
                                onChange={e => {
                                  if (e.target.checked) setPendingConfirm(slot.id, 'email')
                                  else updateDraft(slot.id, { emailNA: false, personalEmail: '', personalEmailNA: false })
                                }}
                                style={{ width: '13px', height: '13px', cursor: websiteNeeded ? 'not-allowed' : 'pointer', accentColor: 'var(--primary)' }}
                              />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Not available</span>
                            </label>
                          </div>
                          <input
                            type="email"
                            value={slot.draft.email}
                            disabled={emailDisabled}
                            onChange={(e) => updateDraft(slot.id, { email: e.target.value })}
                            placeholder={websiteNeeded ? '' : (slot.draft.emailNA ? '' : (domain ? `someone@${domain}` : 'work@company.com'))}
                            style={{
                              ...inputStyle,
                              background: emailDisabled ? 'var(--gray-50)' : 'var(--surface)',
                              color: emailDisabled ? 'var(--text-muted)' : 'var(--text)',
                              cursor: emailDisabled ? 'not-allowed' : 'text',
                              opacity: emailDisabled ? 0.6 : 1,
                              borderColor: emailDomainWarn ? 'var(--error)' : undefined,
                            }}
                            onFocus={(e) => { if (!emailDisabled) e.target.style.borderColor = emailDomainWarn ? 'var(--error)' : 'var(--primary)' }}
                            onBlur={(e) => e.target.style.borderColor = emailDomainWarn ? 'var(--error)' : 'var(--gray-300)'}
                          />
                          {websiteNeeded && (
                            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Please enter the website first
                            </p>
                          )}
                          {emailDomainWarn && (
                            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--error-text)' }}>
                              Email must belong to @{domain}
                            </p>
                          )}
                        </div>
                      )
                    })()}

                    {/* Personal Email — only shown once work email is marked NA */}
                    {slot.draft.emailNA && (
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <label style={{ ...labelStyle, marginBottom: 0 }}>Personal Email <span style={{ color: 'var(--error)' }}>*</span></label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={slot.draft.personalEmailNA}
                              onChange={e => {
                                if (e.target.checked) setPendingConfirm(slot.id, 'personalEmail')
                                else updateDraft(slot.id, { personalEmailNA: false, personalEmail: '' })
                              }}
                              style={{ width: '13px', height: '13px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Not available</span>
                          </label>
                        </div>
                        <input
                          type="email"
                          value={slot.draft.personalEmail}
                          disabled={slot.draft.personalEmailNA}
                          onChange={(e) => updateDraft(slot.id, { personalEmail: e.target.value })}
                          placeholder={slot.draft.personalEmailNA ? '' : 'personal@example.com'}
                          style={{
                            ...inputStyle,
                            background: slot.draft.personalEmailNA ? 'var(--gray-50)' : 'var(--surface)',
                            color: slot.draft.personalEmailNA ? 'var(--text-muted)' : 'var(--text)',
                            cursor: slot.draft.personalEmailNA ? 'not-allowed' : 'text',
                            opacity: slot.draft.personalEmailNA ? 0.6 : 1,
                          }}
                          onFocus={(e) => { if (!slot.draft.personalEmailNA) e.target.style.borderColor = 'var(--primary)' }}
                          onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                        />
                      </div>
                    )}

                    {/* Position */}
                    <div style={{ marginBottom: '10px' }}>
                      <label style={labelStyle}>Position <span style={{ color: 'var(--error)' }}>*</span></label>
                      <input
                        type="text"
                        value={slot.draft.position}
                        onChange={(e) => updateDraft(slot.id, { position: e.target.value })}
                        placeholder="e.g., Director, Manager, etc."
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                      />
                    </div>

                    {/* Phone */}
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>Phone Number</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={slot.draft.phoneNumberNA}
                            onChange={e => updateDraft(slot.id, { phoneNumberNA: e.target.checked, phoneNumber: '' })}
                            style={{ width: '13px', height: '13px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Not available</span>
                        </label>
                      </div>
                      <input
                        type="tel"
                        value={slot.draft.phoneNumber}
                        disabled={slot.draft.phoneNumberNA}
                        onChange={(e) => {
                          const filtered = e.target.value.replace(/[^\d\s\-()+]/g, '')
                          updateDraft(slot.id, { phoneNumber: filtered })
                        }}
                        placeholder={slot.draft.phoneNumberNA ? '' : '+1 234 567 8900'}
                        style={{
                          ...inputStyle,
                          background: slot.draft.phoneNumberNA ? 'var(--gray-50)' : 'var(--surface)',
                          color: slot.draft.phoneNumberNA ? 'var(--text-muted)' : 'var(--text)',
                          cursor: slot.draft.phoneNumberNA ? 'not-allowed' : 'text',
                          opacity: slot.draft.phoneNumberNA ? 0.6 : 1,
                        }}
                        onFocus={(e) => { if (!slot.draft.phoneNumberNA) e.target.style.borderColor = 'var(--primary)' }}
                        onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                      />
                    </div>

                    {/* LinkedIn */}
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>LinkedIn <span style={{ color: 'var(--error)' }}>*</span></label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={slot.draft.linkedinNA}
                            onChange={e => updateDraft(slot.id, { linkedinNA: e.target.checked, linkedin: '' })}
                            style={{ width: '13px', height: '13px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Not available</span>
                        </label>
                      </div>
                      <input
                        type="url"
                        value={slot.draft.linkedin}
                        disabled={slot.draft.linkedinNA}
                        onChange={(e) => updateDraft(slot.id, { linkedin: e.target.value })}
                        placeholder={slot.draft.linkedinNA ? '' : 'https://linkedin.com/in/username'}
                        style={{
                          ...inputStyle,
                          background: slot.draft.linkedinNA ? 'var(--gray-50)' : 'var(--surface)',
                          color: slot.draft.linkedinNA ? 'var(--text-muted)' : 'var(--text)',
                          cursor: slot.draft.linkedinNA ? 'not-allowed' : 'text',
                          opacity: slot.draft.linkedinNA ? 0.6 : 1,
                        }}
                        onFocus={(e) => { if (!slot.draft.linkedinNA) e.target.style.borderColor = 'var(--primary)' }}
                        onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                      />
                    </div>

                    {/* Tags */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={labelStyle}>Tags <span style={{ color: 'var(--error)' }}>*</span></label>
                      <select
                        value={slot.draft.tags}
                        onChange={(e) => updateDraft(slot.id, { tags: e.target.value })}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                      >
                        <option value="">Select a tag</option>
                        {TAG_OPTIONS.map((tag) => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    </div>

                    {/* Save / Remove buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={() => saveSlot(slot.id)} className="btn btn-primary btn-sm">
                        <IconCheck style={{ width: 14, height: 14 }} />
                        Save POC
                      </button>
                      {rules && slots.length > rules.min && (
                        <button
                          type="button"
                          onClick={() => removeSlot(slot.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--error)' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add more / at-max hint */}
            {companySize && rules && (
              slots.length < rules.max ? (
                <button
                  type="button"
                  onClick={addSlot}
                  className="btn btn-outline-green btn-sm"
                  style={{ width: '100%', marginTop: slots.length > 0 ? '4px' : 0 }}
                >
                  + Add Another POC
                </button>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '10px',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  background: 'var(--gray-100)',
                  borderRadius: '6px',
                  marginTop: '8px',
                }}>
                  Maximum {rules.max} POCs reached for {companySize}. To add more, change the company size.
                </div>
              )
            )}
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding Lead...' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
