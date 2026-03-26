import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { CountrySelect, StateField } from '../components/CountryStateFields'

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
  'Phone Number': string
  Position: string
  Tags: string
}

const QUALIFICATION_OPTIONS = [
  { value: 'Small', label: 'Small (1-2 people)' },
  { value: 'MSME', label: 'MSME (less than 20 people)' },
  { value: 'Enterprise', label: 'Enterprise (more than 30 people)' },
]

const TAG_OPTIONS = ['IECA', 'HECA', 'NACAC', 'WACAC', 'School', 'Community', 'Homeschool']

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
  onSaveField: (contactId: string, field: keyof Contact, value: string) => Promise<void>
  onDelete: (contactId: string) => Promise<void>
}

function ContactCard({ contact, index, onSaveField, onDelete }: ContactCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ ...contact })
  const [emailFNameLocked, setEmailFNameLocked] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      for (const field of ['Name', 'Email', 'Email FNAME', 'Phone Number', 'Position', 'Tags'] as (keyof Contact)[]) {
        if (draft[field] !== contact[field]) {
          await onSaveField(contact.id, field, draft[field] as string)
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
            <div>
              <label style={labelStyle}>Email</label>
              <input type="text" value={draft.Email} onChange={e => setDraft(p => ({ ...p, Email: e.target.value }))} style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input type="text" value={draft['Phone Number']} onChange={e => setDraft(p => ({ ...p, 'Phone Number': e.target.value }))} style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div>
              <label style={labelStyle}>Position</label>
              <input type="text" value={draft.Position} onChange={e => setDraft(p => ({ ...p, Position: e.target.value }))} style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div>
              <TagSelectField value={draft.Tags} onChange={v => setDraft(p => ({ ...p, Tags: v }))} />
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
            <span style={labelStyle}>Email</span>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: contact.Email ? 'var(--text)' : 'var(--text-muted)' }}>{contact.Email || '—'}</p>
          </div>
          <div>
            <span style={labelStyle}>Email Name</span>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: contact['Email FNAME'] ? 'var(--text)' : 'var(--text-muted)' }}>{contact['Email FNAME'] || '—'}</p>
          </div>
          <div>
            <span style={labelStyle}>Phone Number</span>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: contact['Phone Number'] ? 'var(--text)' : 'var(--text-muted)' }}>{contact['Phone Number'] || '—'}</p>
          </div>
          <div>
            <span style={labelStyle}>Position</span>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: contact.Position ? 'var(--text)' : 'var(--text-muted)' }}>{contact.Position || '—'}</p>
          </div>
          <div>
            <span style={labelStyle}>Tags</span>
            {contact.Tags
              ? <span style={{ padding: '3px 10px', fontSize: '13px', fontWeight: 600, background: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: '8px', border: '1px solid var(--primary-light)' }}>{contact.Tags}</span>
              : <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>—</p>
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Add Contact Form ─────────────────────────────────────────────────────────

interface NewContact {
  Name: string
  Email: string
  'Phone Number': string
  Position: string
  Tags: string
}

function AddContactForm({ companyRecordId, companyId, onAdded }: { companyRecordId: string; companyId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<NewContact>({ Name: '', Email: '', 'Phone Number': '', Position: '', Tags: '' })
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
    if (!form.Name.trim() || !form.Email.trim() || !form.Position.trim() || !form.Tags) {
      setError('Name, Email, Position, and Tags are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyRecordId, companyId, Name: form.Name, Email: form.Email, EmailFName: emailFName || form.Name.trim().split(/\s+/)[0] || '', PhoneNumber: form['Phone Number'], Position: form.Position, Tags: form.Tags }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add contact')
      setForm({ Name: '', Email: '', 'Phone Number': '', Position: '', Tags: '' })
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
        <div>
          <label style={labelStyle}>Email *</label>
          <input type="text" value={form.Email} onChange={e => update('Email', e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>
        <div>
          <label style={labelStyle}>Phone Number</label>
          <input type="text" value={form['Phone Number']} onChange={e => update('Phone Number', e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
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
        <button onClick={() => { setOpen(false); setError(''); setEmailFName(''); setEmailFNameLocked(true) }} style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 600, background: 'none', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
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
            <EditableField label="Website" value={company.Website} onSave={val => saveCompanyField('Website', val)} />
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
                onSaveField={saveContactField}
                onDelete={deleteContact}
              />
            ))}
            <AddContactForm
              companyRecordId={company.id}
              companyId={companyId!}
              onAdded={loadCompany}
            />
          </div>
        </div>
      </div>

      <footer className="site-footer">© 2026 RISE Research — Internal Use Only</footer>
    </div>
  )
}
