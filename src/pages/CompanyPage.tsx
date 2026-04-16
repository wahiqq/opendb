import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { CountrySelect, StateField } from '../components/CountryStateFields'
import { useTagOptions } from '../hooks/useTagOptions'

interface Company {
  id: string
  CompanyID: string
  'Company Name': string
  Country: string
  State: string
  Website: string
  CreatedBy: string
  Notes: string
  Qualification: string
}

interface Contact {
  id: string
  ContactID: string
  Name: string
  Email: string
  'Email FNAME': string
  'Personal Email': string
  'Phone Number': string
  LinkedIn: string
  Position: string
  Tags: string
  'Call Notes': string
}

const QUALIFICATION_OPTIONS = [
  { value: 'Small', label: 'Small (1-2 people)' },
  { value: 'MSME', label: 'MSME (less than 20 people)' },
  { value: 'Enterprise', label: 'Enterprise (more than 30 people)' },
]

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
  if (!domain) return true
  const parts = email.trim().split('@')
  if (parts.length !== 2) return false
  return parts[1].toLowerCase() === domain
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

// ─── Read-only Field ──────────────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
        {label}
      </span>
      <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: value ? 'var(--text)' : 'var(--text-muted)' }}>
        {value || '—'}
      </p>
    </div>
  )
}

// ─── Editable Field ───────────────────────────────────────────────────────────

interface EditableFieldProps {
  label: string
  value: string
  onSave: (val: string) => Promise<void>
  multiline?: boolean
}

function EditableField({ label, value, onSave, multiline }: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await onSave(draft)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(value)
    setEditing(false)
    setError('')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    fontSize: '14px',
    border: '1.5px solid var(--primary)',
    borderRadius: '6px',
    background: 'var(--surface)',
    color: 'var(--text)',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div>
      <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
        {label}
      </span>
      {editing ? (
        <div>
          {multiline ? (
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3} autoFocus style={{ ...inputStyle, resize: 'vertical' }} />
          ) : (
            <input
              type="text" value={draft} onChange={e => setDraft(e.target.value)} autoFocus style={inputStyle}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
            />
          )}
          {error && <p style={{ fontSize: '12px', color: 'var(--error-text)', marginTop: '4px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 600, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={handleCancel} style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 600, background: 'none', color: 'var(--text-muted)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: value ? 'var(--text)' : 'var(--text-muted)', flex: 1, whiteSpace: 'pre-wrap' }}>
            {value || '—'}
          </p>
          <button onClick={() => { setDraft(value); setEditing(true) }} style={{ flexShrink: 0, padding: '2px 10px', fontSize: '12px', fontWeight: 600, background: 'none', color: 'var(--primary)', border: '1px solid var(--primary-light)', borderRadius: '5px', cursor: 'pointer' }}>
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Website Editable Field (with N/A checkbox) ───────────────────────────────

function WebsiteEditableField({ value, onSave }: { value: string; onSave: (val: string) => Promise<void> }) {
  const isNA = value === 'NA'
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(isNA ? '' : value)
  const [naChecked, setNaChecked] = useState(isNA)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    const val = naChecked ? 'NA' : draft.trim()
    if (!naChecked && !val) { setError('Website is required (or mark as Not available)'); return }
    setSaving(true)
    setError('')
    try {
      await onSave(val)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(isNA ? '' : value)
    setNaChecked(isNA)
    setEditing(false)
    setError('')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: '14px',
    border: '1.5px solid var(--primary)', borderRadius: '6px',
    background: naChecked ? 'var(--gray-50)' : 'var(--surface)',
    color: naChecked ? 'var(--text-muted)' : 'var(--text)',
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
    cursor: naChecked ? 'not-allowed' : 'text', opacity: naChecked ? 0.6 : 1,
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Website
        </span>
        {editing && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={naChecked}
              onChange={e => { setNaChecked(e.target.checked); if (e.target.checked) setDraft('') }}
              style={{ width: '12px', height: '12px', cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>N/A</span>
          </label>
        )}
      </div>
      {editing ? (
        <div>
          <input
            type="text"
            value={draft}
            disabled={naChecked}
            onChange={e => setDraft(e.target.value)}
            placeholder={naChecked ? '' : 'https://example.com'}
            autoFocus={!naChecked}
            style={inputStyle}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
          />
          {error && <p style={{ fontSize: '12px', color: 'var(--error-text)', marginTop: '4px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 600, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={handleCancel} style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 600, background: 'none', color: 'var(--text-muted)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: value && value !== 'NA' ? 'var(--text)' : 'var(--text-muted)', flex: 1, fontStyle: value === 'NA' ? 'italic' : 'normal' }}>
            {value === 'NA' ? 'Not available' : (value || '—')}
          </p>
          <button onClick={() => { setDraft(value === 'NA' ? '' : value); setNaChecked(value === 'NA'); setEditing(true) }} style={{ flexShrink: 0, padding: '2px 10px', fontSize: '12px', fontWeight: 600, background: 'none', color: 'var(--primary)', border: '1px solid var(--primary-light)', borderRadius: '5px', cursor: 'pointer' }}>
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Qualification Single-Select ──────────────────────────────────────────────

function QualificationField({ value, onSave }: { value: string; onSave: (val: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await onSave(draft)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(value)
    setEditing(false)
    setError('')
  }

  return (
    <div>
      <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
        Qualification
      </span>
      {editing ? (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            {QUALIFICATION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDraft(opt.value)}
                style={{
                  padding: '5px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: draft === opt.value ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                  background: draft === opt.value ? 'var(--primary-bg)' : 'var(--surface)',
                  color: draft === opt.value ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {error && <p style={{ fontSize: '12px', color: 'var(--error-text)', marginBottom: '6px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 600, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={handleCancel} style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 600, background: 'none', color: 'var(--text-muted)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            {value
              ? <span style={{ padding: '3px 10px', fontSize: '13px', fontWeight: 600, background: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: '8px', border: '1px solid var(--primary-light)' }}>{value}</span>
              : <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>—</p>
            }
          </div>
          <button onClick={() => { setDraft(value); setEditing(true) }} style={{ flexShrink: 0, padding: '2px 10px', fontSize: '12px', fontWeight: 600, background: 'none', color: 'var(--primary)', border: '1px solid var(--primary-light)', borderRadius: '5px', cursor: 'pointer' }}>
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Country Editable Field ───────────────────────────────────────────────────

function CountryEditableField({ value, onSave, onCountryChange }: { value: string; onSave: (val: string) => Promise<void>; onCountryChange?: (val: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!draft) { setError('Please select a country'); return }
    setSaving(true)
    setError('')
    try {
      await onSave(draft)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(value)
    setEditing(false)
    setError('')
  }

  return (
    <div>
      <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
        Country
      </span>
      {editing ? (
        <div>
          <CountrySelect value={draft} onChange={val => { setDraft(val); onCountryChange?.(val) }} small />
          {error && <p style={{ fontSize: '12px', color: 'var(--error-text)', marginTop: '4px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 600, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={handleCancel} style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 600, background: 'none', color: 'var(--text-muted)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: value ? 'var(--text)' : 'var(--text-muted)', flex: 1 }}>
            {value || '—'}
          </p>
          <button onClick={() => { setDraft(value); setEditing(true) }} style={{ flexShrink: 0, padding: '2px 10px', fontSize: '12px', fontWeight: 600, background: 'none', color: 'var(--primary)', border: '1px solid var(--primary-light)', borderRadius: '5px', cursor: 'pointer' }}>
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

// ─── State Editable Field ─────────────────────────────────────────────────────

function StateEditableField({ value, country, onSave }: { value: string; country: string; onSave: (val: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await onSave(draft)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(value)
    setEditing(false)
    setError('')
  }

  return (
    <div>
      <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
        State
      </span>
      {editing ? (
        <div>
          <StateField country={country} value={draft} onChange={setDraft} small />
          {error && <p style={{ fontSize: '12px', color: 'var(--error-text)', marginTop: '4px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 600, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={handleCancel} style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 600, background: 'none', color: 'var(--text-muted)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: value ? 'var(--text)' : 'var(--text-muted)', flex: 1 }}>
            {value || '—'}
          </p>
          <button onClick={() => { setDraft(value); setEditing(true) }} style={{ flexShrink: 0, padding: '2px 10px', fontSize: '12px', fontWeight: 600, background: 'none', color: 'var(--primary)', border: '1px solid var(--primary-light)', borderRadius: '5px', cursor: 'pointer' }}>
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Tag Select Field (for contacts) ─────────────────────────────────────────

function TagSelectField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { tags: TAG_OPTIONS } = useTagOptions()
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
        Tags
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '7px 10px', fontSize: '14px', border: '1.5px solid var(--primary)', borderRadius: '6px', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit' }}
      >
        <option value="">Select a tag</option>
        {TAG_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  )
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

interface ContactCardProps {
  contact: Contact
  index: number
  companyId: string
  companyWebsite: string
  onSaveField: (contactId: string, field: keyof Contact, value: string) => Promise<void>
  onDelete: (contactId: string) => Promise<void>
}

function ContactCard({ contact, index, companyWebsite, onSaveField, onDelete }: ContactCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ ...contact })
  const [emailFNameLocked, setEmailFNameLocked] = useState(true)
  const [emailNA, setEmailNA] = useState(contact.Email === 'NA')
  const [personalEmailNA, setPersonalEmailNA] = useState(contact['Personal Email'] === 'NA')
  const [phoneNumberNA, setPhoneNumberNA] = useState(contact['Phone Number'] === 'NA')
  const [linkedinNA, setLinkedinNA] = useState(contact.LinkedIn === 'NA')
  const [pendingConfirm, setPendingConfirm] = useState<'email' | 'personalEmail' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    const nameErr = isValidName(draft.Name); if (nameErr) { setError(nameErr); return }
    if (!draft.Position.trim()) { setError('Position is required'); return }
    if (!draft.Tags) { setError('Tags is required'); return }
    if (!emailNA && !draft.Email.trim()) { setError('Work Email is required (or mark as N/A)'); return }
    if (!emailNA && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.Email.trim())) { setError('Work Email is not a valid email address'); return }
    if (!emailNA && !personalEmailNA && (draft['Personal Email'] || '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((draft['Personal Email'] || '').trim())) { setError('Personal Email is not a valid email address'); return }
    if (!linkedinNA && !draft.LinkedIn.trim()) { setError('LinkedIn is required (or mark as N/A)'); return }
    if (!emailNA && companyWebsite && companyWebsite !== 'NA') {
      const domain = extractDomain(companyWebsite)
      if (domain && draft.Email && !emailMatchesDomain(draft.Email, domain)) {
        setError(`Work Email must belong to the company domain (@${domain})`)
        return
      }
    }
    setSaving(true)
    setError('')
    try {
      const resolved = {
        ...draft,
        Email: emailNA ? 'NA' : draft.Email,
        'Personal Email': emailNA ? 'NA' : (personalEmailNA ? 'NA' : (draft['Personal Email'] || '')),
        'Phone Number': phoneNumberNA ? 'NA' : draft['Phone Number'],
        LinkedIn: linkedinNA ? 'NA' : draft.LinkedIn,
      }
      for (const field of ['Name', 'Email', 'Email FNAME', 'Personal Email', 'Phone Number', 'LinkedIn', 'Position', 'Tags', 'Call Notes'] as (keyof Contact)[]) {
        if (resolved[field] !== contact[field]) {
          await onSaveField(contact.id, field, resolved[field] as string)
        }
      }
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft({ ...contact })
    setEmailNA(contact.Email === 'NA')
    setPersonalEmailNA(contact['Personal Email'] === 'NA')
    setPhoneNumberNA(contact['Phone Number'] === 'NA')
    setLinkedinNA(contact.LinkedIn === 'NA')
    setPendingConfirm(null)
    setEditing(false)
    setEmailFNameLocked(true)
    setError('')
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete(contact.id)
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: '14px',
    border: '1.5px solid var(--border)', borderRadius: '6px',
    background: 'var(--surface)', color: 'var(--text)',
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700,
    color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: '4px',
  }

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      {/* Confirm delete modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '14px', maxWidth: '400px', width: '100%', padding: '24px', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Delete Contact?</h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-muted)' }}>
              Are you sure you want to delete <strong>{contact.Name || 'this contact'}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} style={{ flex: 1, padding: '8px', fontSize: '14px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '8px', fontSize: '14px', border: 'none', borderRadius: '8px', background: '#ef4444', color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1, fontWeight: 600 }}>
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Contact {index + 1}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>{contact.ContactID}</span>
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)} style={{ padding: '2px 10px', fontSize: '12px', fontWeight: 600, background: 'none', color: 'var(--primary)', border: '1px solid var(--primary-light)', borderRadius: '5px', cursor: 'pointer' }}>
                Edit
              </button>
              <button onClick={() => setConfirmDelete(true)} style={{ padding: '2px 10px', fontSize: '12px', fontWeight: 600, background: 'none', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '5px', cursor: 'pointer' }}>
                Delete
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setConfirmDelete(true)} style={{ fontSize: '12px', fontWeight: 600, background: 'none', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                Delete
              </button>
              <button onClick={handleCancel} style={{ fontSize: '12px', fontWeight: 600, background: 'none', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Name</label>
              <input type="text" value={draft.Name} onChange={e => {
                const name = e.target.value
                setDraft(p => ({ ...p, Name: name, ...(emailFNameLocked ? { 'Email FNAME': name.trim().split(/\s+/)[0] || '' } : {}) }))
              }} style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>
                Email Name
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px', textTransform: 'none', letterSpacing: 0 }}>auto-derived from name</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  value={draft['Email FNAME']}
                  readOnly={emailFNameLocked}
                  onChange={e => setDraft(p => ({ ...p, 'Email FNAME': e.target.value }))}
                  placeholder={draft.Name ? `Will be set to "${draft.Name.trim().split(/\s+/)[0]}"` : ''}
                  style={{ ...inputStyle, flex: 1, background: emailFNameLocked ? 'var(--gray-50)' : 'var(--surface)', color: emailFNameLocked ? 'var(--text-muted)' : 'var(--text)', border: `1.5px solid ${emailFNameLocked ? 'var(--border)' : 'var(--primary)'}`, cursor: emailFNameLocked ? 'default' : 'text' }}
                  onFocus={e => { if (!emailFNameLocked) e.target.style.borderColor = 'var(--primary)' }}
                  onBlur={e => { if (!emailFNameLocked) e.target.style.borderColor = 'var(--border)' }}
                />
                <button type="button" title={emailFNameLocked ? 'Override value' : 'Lock to auto-derive'} onClick={() => {
                  if (emailFNameLocked) { setEmailFNameLocked(false) }
                  else { setEmailFNameLocked(true); setDraft(p => ({ ...p, 'Email FNAME': p.Name.trim().split(/\s+/)[0] || '' })) }
                }} style={{ flexShrink: 0, background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', cursor: 'pointer', color: emailFNameLocked ? 'var(--text-muted)' : 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Work Email confirmation popup */}
            {pendingConfirm === 'email' && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
                <div style={{ background: 'var(--surface)', borderRadius: '12px', maxWidth: '380px', width: '100%', padding: '24px', boxShadow: 'var(--shadow-xl)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>No Work Email?</h4>
                  <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>I confirm that this contact does not have a work email associated.</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => setPendingConfirm(null)} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                    <button type="button" onClick={() => { setEmailNA(true); setDraft(p => ({ ...p, Email: '' })); setPersonalEmailNA(false); setDraft(p => ({ ...p, 'Personal Email': '' })); setPendingConfirm(null) }} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '8px', background: 'var(--primary)', color: '#fff', cursor: 'pointer' }}>Accept</button>
                  </div>
                </div>
              </div>
            )}
            {/* Personal Email confirmation popup */}
            {pendingConfirm === 'personalEmail' && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
                <div style={{ background: 'var(--surface)', borderRadius: '12px', maxWidth: '380px', width: '100%', padding: '24px', boxShadow: 'var(--shadow-xl)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>No Personal Email?</h4>
                  <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>I confirm that this contact does not have a personal email associated.</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => setPendingConfirm(null)} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                    <button type="button" onClick={() => { setPersonalEmailNA(true); setDraft(p => ({ ...p, 'Personal Email': '' })); setPendingConfirm(null) }} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '8px', background: 'var(--primary)', color: '#fff', cursor: 'pointer' }}>Accept</button>
                  </div>
                </div>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Work Email</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={emailNA} onChange={e => { if (e.target.checked) setPendingConfirm('email'); else { setEmailNA(false); setPersonalEmailNA(false) } }} style={{ width: '12px', height: '12px', cursor: 'pointer', accentColor: 'var(--primary)' }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>N/A</span>
                </label>
              </div>
              {(() => {
                const domain = companyWebsite && companyWebsite !== 'NA' ? extractDomain(companyWebsite) : ''
                const emailVal = emailNA ? '' : draft.Email
                const emailDomainWarn = !emailNA && domain && emailVal && isValidEmail(emailVal) && !emailMatchesDomain(emailVal, domain)
                return (
                  <>
                    <input type="text" value={emailVal} disabled={emailNA} onChange={e => setDraft(p => ({ ...p, Email: e.target.value }))} placeholder={emailNA ? '' : (domain ? `someone@${domain}` : 'work@company.com')} style={{ ...inputStyle, background: emailNA ? 'var(--gray-50)' : 'var(--surface)', color: emailNA ? 'var(--text-muted)' : 'var(--text)', cursor: emailNA ? 'not-allowed' : 'text', opacity: emailNA ? 0.6 : 1, borderColor: emailDomainWarn ? 'var(--error)' : undefined }} onFocus={e => { if (!emailNA) e.target.style.borderColor = emailDomainWarn ? 'var(--error)' : 'var(--primary)' }} onBlur={e => e.target.style.borderColor = emailDomainWarn ? 'var(--error)' : 'var(--border)'} />
                    {emailDomainWarn && <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--error-text)' }}>Email must belong to @{domain}</p>}
                  </>
                )
              })()}
            </div>
            {emailNA && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Personal Email</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={personalEmailNA} onChange={e => { if (e.target.checked) setPendingConfirm('personalEmail'); else { setPersonalEmailNA(false); setDraft(p => ({ ...p, 'Personal Email': '' })) } }} style={{ width: '12px', height: '12px', cursor: 'pointer', accentColor: 'var(--primary)' }} />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>N/A</span>
                  </label>
                </div>
                <input type="text" value={personalEmailNA ? '' : (draft['Personal Email'] || '')} disabled={personalEmailNA} onChange={e => setDraft(p => ({ ...p, 'Personal Email': e.target.value }))} placeholder={personalEmailNA ? '' : 'personal@example.com'} style={{ ...inputStyle, background: personalEmailNA ? 'var(--gray-50)' : 'var(--surface)', color: personalEmailNA ? 'var(--text-muted)' : 'var(--text)', cursor: personalEmailNA ? 'not-allowed' : 'text', opacity: personalEmailNA ? 0.6 : 1 }} onFocus={e => { if (!personalEmailNA) e.target.style.borderColor = 'var(--primary)' }} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Phone Number</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={phoneNumberNA} onChange={e => { setPhoneNumberNA(e.target.checked); if (e.target.checked) setDraft(p => ({ ...p, 'Phone Number': '' })) }} style={{ width: '12px', height: '12px', cursor: 'pointer', accentColor: 'var(--primary)' }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>N/A</span>
                </label>
              </div>
              <input type="text" value={phoneNumberNA ? '' : draft['Phone Number']} disabled={phoneNumberNA} onChange={e => setDraft(p => ({ ...p, 'Phone Number': e.target.value }))} placeholder={phoneNumberNA ? '' : '+1 234 567 8900'} style={{ ...inputStyle, background: phoneNumberNA ? 'var(--gray-50)' : 'var(--surface)', color: phoneNumberNA ? 'var(--text-muted)' : 'var(--text)', cursor: phoneNumberNA ? 'not-allowed' : 'text', opacity: phoneNumberNA ? 0.6 : 1 }} onFocus={e => { if (!phoneNumberNA) e.target.style.borderColor = 'var(--primary)' }} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div>
              <label style={labelStyle}>Position</label>
              <input type="text" value={draft.Position} onChange={e => setDraft(p => ({ ...p, Position: e.target.value }))} style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>LinkedIn *</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={linkedinNA} onChange={e => { setLinkedinNA(e.target.checked); if (e.target.checked) setDraft(p => ({ ...p, LinkedIn: '' })) }} style={{ width: '12px', height: '12px', cursor: 'pointer', accentColor: 'var(--primary)' }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>N/A</span>
                </label>
              </div>
              <input type="url" value={linkedinNA ? '' : (draft.LinkedIn || '')} disabled={linkedinNA} onChange={e => setDraft(p => ({ ...p, LinkedIn: e.target.value }))} placeholder={linkedinNA ? '' : 'https://linkedin.com/in/username'} style={{ ...inputStyle, background: linkedinNA ? 'var(--gray-50)' : 'var(--surface)', color: linkedinNA ? 'var(--text-muted)' : 'var(--text)', cursor: linkedinNA ? 'not-allowed' : 'text', opacity: linkedinNA ? 0.6 : 1 }} onFocus={e => { if (!linkedinNA) e.target.style.borderColor = 'var(--primary)' }} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div>
              <TagSelectField value={draft.Tags} onChange={v => setDraft(p => ({ ...p, Tags: v }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Call Notes</label>
              <textarea value={draft['Call Notes'] || ''} onChange={e => setDraft(p => ({ ...p, 'Call Notes': e.target.value }))} placeholder="Add notes from your call…" rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
          </div>
          {error && <p style={{ fontSize: '12px', color: 'var(--error-text)', marginBottom: '8px' }}>{error}</p>}
          <button onClick={handleSave} disabled={saving} style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 600, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={labelStyle}>Name</span>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: contact.Name ? 'var(--text)' : 'var(--text-muted)' }}>{contact.Name || '—'}</p>
          </div>
          <div>
            <span style={labelStyle}>Work Email</span>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: contact.Email && contact.Email !== 'NA' ? 'var(--text)' : 'var(--text-muted)' }}>
              {contact.Email === 'NA' ? <span style={{ fontStyle: 'italic' }}>Not available</span> : (contact.Email || '—')}
            </p>
          </div>
          <div>
            <span style={labelStyle}>Personal Email</span>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: contact['Personal Email'] && contact['Personal Email'] !== 'NA' ? 'var(--text)' : 'var(--text-muted)' }}>
              {contact['Personal Email'] === 'NA' ? <span style={{ fontStyle: 'italic' }}>Not available</span> : (contact['Personal Email'] || '—')}
            </p>
          </div>
          <div>
            <span style={labelStyle}>Email Name</span>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: contact['Email FNAME'] ? 'var(--text)' : 'var(--text-muted)' }}>{contact['Email FNAME'] || '—'}</p>
          </div>
          <div>
            <span style={labelStyle}>Phone Number</span>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: contact['Phone Number'] && contact['Phone Number'] !== 'NA' ? 'var(--text)' : 'var(--text-muted)' }}>
              {contact['Phone Number'] === 'NA' ? <span style={{ fontStyle: 'italic' }}>Not available</span> : (contact['Phone Number'] || '—')}
            </p>
          </div>
          <div>
            <span style={labelStyle}>Position</span>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: contact.Position ? 'var(--text)' : 'var(--text-muted)' }}>{contact.Position || '—'}</p>
          </div>
          <div>
            <span style={labelStyle}>LinkedIn</span>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: contact.LinkedIn && contact.LinkedIn !== 'NA' ? 'var(--text)' : 'var(--text-muted)' }}>
              {contact.LinkedIn === 'NA' ? <span style={{ fontStyle: 'italic' }}>Not available</span> : (contact.LinkedIn || '—')}
            </p>
          </div>
          <div>
            <span style={labelStyle}>Tags</span>
            {contact.Tags
              ? <span style={{ padding: '3px 10px', fontSize: '13px', fontWeight: 600, background: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: '8px', border: '1px solid var(--primary-light)' }}>{contact.Tags}</span>
              : <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>—</p>
            }
          </div>
          {contact['Call Notes'] && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={labelStyle}>Call Notes</span>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{contact['Call Notes']}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add Contact Form ─────────────────────────────────────────────────────────

interface NewContact {
  Name: string
  Email: string
  'Personal Email': string
  'Phone Number': string
  LinkedIn: string
  Position: string
  Tags: string
}

function AddContactForm({ companyRecordId, companyId, companyWebsite, onAdded }: { companyRecordId: string; companyId: string; companyWebsite: string; onAdded: () => void }) {
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('riseUser') || '{}') } catch { return {} } })()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<NewContact>({ Name: '', Email: '', 'Personal Email': '', 'Phone Number': '', LinkedIn: '', Position: '', Tags: '' })
  const [emailNA, setEmailNA] = useState(false)
  const [personalEmailNA, setPersonalEmailNA] = useState(false)
  const [phoneNumberNA, setPhoneNumberNA] = useState(false)
  const [linkedinNA, setLinkedinNA] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<'email' | 'personalEmail' | null>(null)
  const [emailFName, setEmailFName] = useState('')
  const [emailFNameLocked, setEmailFNameLocked] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field: keyof NewContact, value: string) {
    if (field === 'Name' && emailFNameLocked) {
      setEmailFName(value.trim().split(/\s+/)[0] || '')
    }
    setForm(p => ({ ...p, [field]: value }))
  }

  async function handleAdd() {
    const nameErr = isValidName(form.Name); if (nameErr) { setError(nameErr); return }
    if (!form.Position.trim() || !form.Tags) {
      setError('Position and Tags are required')
      return
    }
    if (!emailNA && !form.Email.trim()) {
      setError('Work Email is required (or mark as Not available)')
      return
    }
    if (!emailNA && companyWebsite && companyWebsite !== 'NA') {
      const domain = extractDomain(companyWebsite)
      if (domain && !emailMatchesDomain(form.Email, domain)) {
        setError(`Work Email must belong to the company domain (@${domain})`)
        return
      }
    }
    if (!linkedinNA && !form.LinkedIn.trim()) {
      setError('LinkedIn is required (or mark as Not available)')
      return
    }
    // Personal email: NA if work email is provided, or if personalEmailNA is checked
    const resolvedPersonalEmail = !emailNA ? 'NA' : (personalEmailNA ? 'NA' : form['Personal Email'].trim() || 'NA')
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyRecordId, companyId, Name: form.Name, Email: emailNA ? 'NA' : form.Email, EmailFName: emailFName || form.Name.trim().split(/\s+/)[0] || '', PersonalEmail: resolvedPersonalEmail, PhoneNumber: phoneNumberNA ? 'NA' : form['Phone Number'], LinkedIn: linkedinNA ? 'NA' : form.LinkedIn, Position: form.Position, Tags: form.Tags, createdBy: currentUser.name || '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add contact')
      setForm({ Name: '', Email: '', 'Personal Email': '', 'Phone Number': '', LinkedIn: '', Position: '', Tags: '' })
      setEmailNA(false)
      setPersonalEmailNA(false)
      setPhoneNumberNA(false)
      setLinkedinNA(false)
      setPendingConfirm(null)
      setEmailFName('')
      setEmailFNameLocked(true)
      setOpen(false)
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: '14px',
    border: '1.5px solid var(--border)', borderRadius: '6px',
    background: 'var(--surface)', color: 'var(--text)',
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700,
    color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: '4px',
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: 'none', color: 'var(--primary)', border: '1.5px dashed var(--primary-light)', borderRadius: '8px', cursor: 'pointer', width: '100%' }}
      >
        + Add Contact
      </button>
    )
  }

  return (
    <div className="card" style={{ marginBottom: 0, border: '1.5px dashed var(--primary-light)' }}>
      <p style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Contact</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Name *</label>
          <input type="text" value={form.Name} onChange={e => update('Name', e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>
            Email Name
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px', textTransform: 'none', letterSpacing: 0 }}>auto-derived from name</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              value={emailFName}
              readOnly={emailFNameLocked}
              onChange={e => setEmailFName(e.target.value)}
              placeholder={form.Name ? `Will be set to "${form.Name.trim().split(/\s+/)[0]}"` : 'Enter a name above…'}
              style={{ ...inputStyle, flex: 1, background: emailFNameLocked ? 'var(--gray-50)' : 'var(--surface)', color: emailFNameLocked ? 'var(--text-muted)' : 'var(--text)', border: `1.5px solid ${emailFNameLocked ? 'var(--border)' : 'var(--primary)'}`, fontStyle: emailFName ? 'normal' : 'italic', cursor: emailFNameLocked ? 'default' : 'text' }}
              onFocus={e => { if (!emailFNameLocked) e.target.style.borderColor = 'var(--primary)' }}
              onBlur={e => { if (!emailFNameLocked) e.target.style.borderColor = 'var(--border)' }}
            />
            <button type="button" title={emailFNameLocked ? 'Override value' : 'Lock to auto-derive'} onClick={() => {
              if (emailFNameLocked) { setEmailFNameLocked(false) }
              else { setEmailFNameLocked(true); setEmailFName(form.Name.trim().split(/\s+/)[0] || '') }
            }} style={{ flexShrink: 0, background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', cursor: 'pointer', color: emailFNameLocked ? 'var(--text-muted)' : 'var(--primary)', display: 'flex', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        </div>
        {/* Work Email confirmation popup */}
        {pendingConfirm === 'email' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
            <div style={{ background: 'var(--surface)', borderRadius: '12px', maxWidth: '380px', width: '100%', padding: '24px', boxShadow: 'var(--shadow-xl)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>No Work Email?</h4>
              <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>I confirm that this contact does not have a work email associated.</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setPendingConfirm(null)} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="button" onClick={() => { setEmailNA(true); update('Email', ''); setPersonalEmailNA(false); update('Personal Email', ''); setPendingConfirm(null) }} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '8px', background: 'var(--primary)', color: '#fff', cursor: 'pointer' }}>Accept</button>
              </div>
            </div>
          </div>
        )}
        {/* Personal Email confirmation popup */}
        {pendingConfirm === 'personalEmail' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
            <div style={{ background: 'var(--surface)', borderRadius: '12px', maxWidth: '380px', width: '100%', padding: '24px', boxShadow: 'var(--shadow-xl)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>No Personal Email?</h4>
              <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>I confirm that this contact does not have a personal email associated.</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setPendingConfirm(null)} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="button" onClick={() => { setPersonalEmailNA(true); update('Personal Email', ''); setPendingConfirm(null) }} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '8px', background: 'var(--primary)', color: '#fff', cursor: 'pointer' }}>Accept</button>
              </div>
            </div>
          </div>
        )}
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Work Email *</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="checkbox" checked={emailNA} onChange={e => { if (e.target.checked) setPendingConfirm('email'); else { setEmailNA(false); setPersonalEmailNA(false) } }} style={{ width: '12px', height: '12px', cursor: 'pointer', accentColor: 'var(--primary)' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>N/A</span>
            </label>
          </div>
          {(() => {
            const domain = companyWebsite && companyWebsite !== 'NA' ? extractDomain(companyWebsite) : ''
            const emailVal = emailNA ? '' : form.Email
            const emailDomainWarn = !emailNA && domain && emailVal && isValidEmail(emailVal) && !emailMatchesDomain(emailVal, domain)
            return (
              <>
                <input type="text" value={emailVal} disabled={emailNA} onChange={e => update('Email', e.target.value)} placeholder={emailNA ? '' : (domain ? `someone@${domain}` : 'work@company.com')} style={{ ...inputStyle, background: emailNA ? 'var(--gray-50)' : 'var(--surface)', color: emailNA ? 'var(--text-muted)' : 'var(--text)', cursor: emailNA ? 'not-allowed' : 'text', opacity: emailNA ? 0.6 : 1, borderColor: emailDomainWarn ? 'var(--error)' : undefined }} onFocus={e => { if (!emailNA) e.target.style.borderColor = emailDomainWarn ? 'var(--error)' : 'var(--primary)' }} onBlur={e => e.target.style.borderColor = emailDomainWarn ? 'var(--error)' : 'var(--border)'} />
                {emailDomainWarn && <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--error-text)' }}>Email must belong to @{domain}</p>}
              </>
            )
          })()}
        </div>
        {emailNA && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Personal Email *</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="checkbox" checked={personalEmailNA} onChange={e => { if (e.target.checked) setPendingConfirm('personalEmail'); else { setPersonalEmailNA(false); update('Personal Email', '') } }} style={{ width: '12px', height: '12px', cursor: 'pointer', accentColor: 'var(--primary)' }} />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>N/A</span>
              </label>
            </div>
            <input type="text" value={personalEmailNA ? '' : form['Personal Email']} disabled={personalEmailNA} onChange={e => update('Personal Email', e.target.value)} placeholder={personalEmailNA ? '' : 'personal@example.com'} style={{ ...inputStyle, background: personalEmailNA ? 'var(--gray-50)' : 'var(--surface)', color: personalEmailNA ? 'var(--text-muted)' : 'var(--text)', cursor: personalEmailNA ? 'not-allowed' : 'text', opacity: personalEmailNA ? 0.6 : 1 }} onFocus={e => { if (!personalEmailNA) e.target.style.borderColor = 'var(--primary)' }} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </div>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Phone Number</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="checkbox" checked={phoneNumberNA} onChange={e => { setPhoneNumberNA(e.target.checked); if (e.target.checked) update('Phone Number', '') }} style={{ width: '12px', height: '12px', cursor: 'pointer', accentColor: 'var(--primary)' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>N/A</span>
            </label>
          </div>
          <input type="text" value={phoneNumberNA ? '' : form['Phone Number']} disabled={phoneNumberNA} onChange={e => update('Phone Number', e.target.value)} placeholder={phoneNumberNA ? '' : '+1 234 567 8900'} style={{ ...inputStyle, background: phoneNumberNA ? 'var(--gray-50)' : 'var(--surface)', color: phoneNumberNA ? 'var(--text-muted)' : 'var(--text)', cursor: phoneNumberNA ? 'not-allowed' : 'text', opacity: phoneNumberNA ? 0.6 : 1 }} onFocus={e => { if (!phoneNumberNA) e.target.style.borderColor = 'var(--primary)' }} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>LinkedIn *</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="checkbox" checked={linkedinNA} onChange={e => { setLinkedinNA(e.target.checked); if (e.target.checked) update('LinkedIn', '') }} style={{ width: '12px', height: '12px', cursor: 'pointer', accentColor: 'var(--primary)' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>N/A</span>
            </label>
          </div>
          <input type="url" value={linkedinNA ? '' : form.LinkedIn} disabled={linkedinNA} onChange={e => update('LinkedIn', e.target.value)} placeholder={linkedinNA ? '' : 'https://linkedin.com/in/username'} style={{ ...inputStyle, background: linkedinNA ? 'var(--gray-50)' : 'var(--surface)', color: linkedinNA ? 'var(--text-muted)' : 'var(--text)', cursor: linkedinNA ? 'not-allowed' : 'text', opacity: linkedinNA ? 0.6 : 1 }} onFocus={e => { if (!linkedinNA) e.target.style.borderColor = 'var(--primary)' }} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>
        <div>
          <label style={labelStyle}>Position *</label>
          <input type="text" value={form.Position} onChange={e => update('Position', e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>
        <div>
          <TagSelectField value={form.Tags} onChange={v => update('Tags', v)} />
        </div>
      </div>
      {error && <p style={{ fontSize: '12px', color: 'var(--error-text)', marginBottom: '8px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleAdd} disabled={saving} style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 600, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Adding…' : 'Add Contact'}
        </button>
        <button onClick={() => { setOpen(false); setError(''); setEmailFName(''); setEmailFNameLocked(true); setEmailNA(false); setPersonalEmailNA(false); setPhoneNumberNA(false); setLinkedinNA(false); setPendingConfirm(null) }} style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 600, background: 'none', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompanyPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()

  const [company, setCompany] = useState<Company | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentCountry, setCurrentCountry] = useState('')

  useEffect(() => {
    const userStr = localStorage.getItem('riseUser')
    if (!userStr) { navigate('/'); return }
  }, [navigate])

  function loadCompany() {
    if (!companyId) return
    setLoading(true)
    fetch(`/api/company/${companyId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setCompany(data.company)
        setContacts(data.contacts)
        setCurrentCountry(data.company.Country || '')
      })
      .catch(() => setError('Failed to load company'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCompany() }, [companyId])

  async function saveCompanyField(field: keyof Company, value: string) {
    const res = await fetch(`/api/company/${companyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: { [field]: value }, contacts: {} }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to save')
    setCompany(prev => prev ? { ...prev, [field]: value } : prev)
    if (field === 'Country') setCurrentCountry(value)
  }

  async function saveContactField(contactRecordId: string, field: keyof Contact, value: string) {
    const res = await fetch(`/api/company/${companyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: {}, contacts: { [contactRecordId]: { [field]: value } } }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to save')
    setContacts(prev => prev.map(c => c.id === contactRecordId ? { ...c, [field]: value } : c))
  }

  async function deleteContact(contactRecordId: string) {
    const res = await fetch(`/api/contact/${contactRecordId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to delete')
    setContacts(prev => prev.filter(c => c.id !== contactRecordId))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
    </div>
  )

  if (error || !company) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--error-text)' }}>{error || 'Company not found'}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div className="dash-hero">
        <div className="dash-hero-badge">Lead Collection</div>
        <h1>{company['Company Name']}</h1>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontSize: '14px', padding: 0 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to search
        </button>
      </div>

      <div className="dash-body" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>

        {/* Company Details */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Company Details
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <EditableField label="Company Name" value={company['Company Name']} onSave={val => saveCompanyField('Company Name', val)} />
            <CountryEditableField
              value={company.Country}
              onSave={val => saveCompanyField('Country', val)}
              onCountryChange={setCurrentCountry}
            />
            <StateEditableField
              value={company.State}
              country={currentCountry || company.Country}
              onSave={async val => {
                await saveCompanyField('State', val)
              }}
            />
            <WebsiteEditableField value={company.Website} onSave={val => saveCompanyField('Website', val)} />
            <ReadOnlyField label="Created By" value={company.CreatedBy} />
            <div style={{ gridColumn: '1 / -1' }}>
              <QualificationField value={company.Qualification} onSave={val => saveCompanyField('Qualification', val)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <EditableField label="Notes" value={company.Notes} onSave={val => saveCompanyField('Notes', val)} multiline />
            </div>
          </div>
        </div>

        {/* Contacts */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Contacts ({contacts.length})
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {contacts.map((contact, i) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                index={i}
                companyId={companyId!}
                companyWebsite={company.Website || ''}
                onSaveField={saveContactField}
                onDelete={deleteContact}
              />
            ))}
            <AddContactForm
              companyRecordId={company.id}
              companyId={companyId!}
              companyWebsite={company.Website || ''}
              onAdded={loadCompany}
            />
          </div>
        </div>
      </div>

      <footer className="site-footer">© 2026 RISE Research — Internal Use Only</footer>
    </div>
  )
}
