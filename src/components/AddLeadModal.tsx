import { useState, FormEvent } from 'react'
import { IconX, IconCheck } from './Icons'

interface POC {
  id: string
  name: string
  email: string
  emailFName: string
  phoneNumber: string
  tags: string
  position: string
}

interface AddLeadModalProps {
  onClose: () => void
  onSuccess: () => void
  currentUser: {
    name: string
    email: string
  }
}

const TAG_OPTIONS = ['IECA', 'HECA', 'NACAC', 'WACAC', 'School', 'Community', 'Homeschool']
const QUALIFICATION_OPTIONS = [
  { value: 'Small', label: 'Small (1-2 people)' },
  { value: 'MSME', label: 'MSME (less than 20 people)' },
  { value: 'Enterprise', label: 'Enterprise (more than 30 people)' },
]

export default function AddLeadModal({ onClose, onSuccess, currentUser }: AddLeadModalProps) {
  const [companyName, setCompanyName] = useState('')
  const [country, setCountry] = useState('')
  const [state, setState] = useState('')
  const [website, setWebsite] = useState('')
  const [qualification, setQualification] = useState('')
  const [notes, setNotes] = useState('')
  const [pocs, setPocs] = useState<POC[]>([])
  const [showPocForm, setShowPocForm] = useState(false)

  // POC form fields
  const [pocName, setPocName] = useState('')
  const [pocEmail, setPocEmail] = useState('')
  const [pocPhone, setPocPhone] = useState('')
  const [pocPosition, setPocPosition] = useState('')
  const [pocTags, setPocTags] = useState('')
  const [pocEmailFName, setPocEmailFName] = useState('')
  const [pocEmailFNameLocked, setPocEmailFNameLocked] = useState(true)

  function deriveFName(name: string) {
    return name.trim().split(/\s+/)[0] || ''
  }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function addPoc() {
    if (!pocName.trim() || !pocEmail.trim() || !pocPosition.trim() || !pocTags) {
      setError('Name, Email, Position, and Tags are required for POC')
      return
    }

    const newPoc: POC = {
      id: Date.now().toString(),
      name: pocName.trim(),
      email: pocEmail.trim(),
      emailFName: pocEmailFName.trim() || deriveFName(pocName),
      phoneNumber: pocPhone.trim(),
      position: pocPosition.trim(),
      tags: pocTags,
    }

    setPocs([...pocs, newPoc])

    // Reset POC form
    setPocName('')
    setPocEmail('')
    setPocPhone('')
    setPocPosition('')
    setPocTags('')
    setPocEmailFName('')
    setPocEmailFNameLocked(true)
    setShowPocForm(false)
    setError('')
  }

  function removePoc(id: string) {
    setPocs(pocs.filter(p => p.id !== id))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!companyName.trim() || !country.trim() || !qualification || !notes.trim()) {
      setError('Company Name, Country, Qualification, and Notes are required')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/add-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          country: country.trim(),
          state: state.trim(),
          website: website.trim(),
          qualification: qualification,
          notes: notes.trim(),
          createdBy: currentUser.name,
          pocs: pocs.map(p => ({
            name: p.name,
            email: p.email,
            emailFName: p.emailFName,
            phoneNumber: p.phoneNumber,
            position: p.position,
            tags: p.tags,
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
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: 'var(--text-muted)',
            }}
          >
            <IconX style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: '8px',
            }}>
              Company Name <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                border: '2px solid var(--gray-300)',
                borderRadius: '10px',
                outline: 'none',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '8px',
              }}>
                Country <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '2px solid var(--gray-300)',
                  borderRadius: '10px',
                  outline: 'none',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '8px',
              }}>
                State (Optional)
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '2px solid var(--gray-300)',
                  borderRadius: '10px',
                  outline: 'none',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: '8px',
            }}>
              Website <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                border: '2px solid var(--gray-300)',
                borderRadius: '10px',
                outline: 'none',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: '8px',
            }}>
              Qualification <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                border: '2px solid var(--gray-300)',
                borderRadius: '10px',
                outline: 'none',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
            >
              <option value="">Select company size</option>
              {QUALIFICATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: '8px',
            }}>
              Notes <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                border: '2px solid var(--gray-300)',
                borderRadius: '10px',
                outline: 'none',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: '8px',
            }}>
              Created By
            </label>
            <div style={{
              padding: '12px 16px',
              background: 'var(--gray-50)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              fontSize: '15px',
              color: 'var(--text-muted)',
            }}>
              {currentUser.name}
            </div>
          </div>

          {/* POCs Section */}
          <div style={{
            marginBottom: '24px',
            padding: '20px',
            background: 'var(--gray-50)',
            borderRadius: '10px',
            border: '1px solid var(--border)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
              Points of Contact (POCs)
            </h3>

            {pocs.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                {pocs.map((poc) => (
                  <div
                    key={poc.id}
                    style={{
                      padding: '12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                        {poc.name} • {poc.position}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {poc.email}
                        {poc.phoneNumber && ` • ${poc.phoneNumber}`}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <span style={{
                          padding: '2px 8px',
                          background: 'var(--green-100)',
                          color: 'var(--green-700)',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          {poc.tags}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePoc(poc.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: 'var(--error)',
                      }}
                    >
                      <IconX style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showPocForm ? (
              <div style={{
                padding: '16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: '6px',
                  }}>
                    Name <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={pocName}
                    onChange={(e) => {
                      setPocName(e.target.value)
                      if (pocEmailFNameLocked) setPocEmailFName(deriveFName(e.target.value))
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '2px solid var(--gray-300)',
                      borderRadius: '8px',
                      outline: 'none',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontFamily: 'inherit',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: '6px',
                  }}>
                    Email Name
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>auto-derived from name</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      flex: 1,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                    }}>
                      <input
                        type="text"
                        value={pocEmailFName}
                        readOnly={pocEmailFNameLocked}
                        onChange={(e) => setPocEmailFName(e.target.value)}
                        placeholder={pocName ? `Will be set to "${deriveFName(pocName)}"` : 'Enter a name above…'}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          border: `2px solid ${pocEmailFNameLocked ? 'var(--border)' : 'var(--primary)'}`,
                          borderRadius: '8px',
                          outline: 'none',
                          background: pocEmailFNameLocked ? 'var(--gray-50)' : 'var(--surface)',
                          color: pocEmailFNameLocked ? 'var(--text-muted)' : 'var(--text)',
                          fontFamily: 'inherit',
                          fontStyle: pocEmailFName ? 'normal' : 'italic',
                          cursor: pocEmailFNameLocked ? 'default' : 'text',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      title={pocEmailFNameLocked ? 'Override value' : 'Lock to auto-derive'}
                      onClick={() => {
                        if (pocEmailFNameLocked) {
                          setPocEmailFNameLocked(false)
                        } else {
                          setPocEmailFNameLocked(true)
                          setPocEmailFName(deriveFName(pocName))
                        }
                      }}
                      style={{
                        flexShrink: 0,
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '8px',
                        cursor: 'pointer',
                        color: pocEmailFNameLocked ? 'var(--text-muted)' : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {/* Pencil icon */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: '6px',
                  }}>
                    Email <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={pocEmail}
                    onChange={(e) => setPocEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '2px solid var(--gray-300)',
                      borderRadius: '8px',
                      outline: 'none',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontFamily: 'inherit',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: '6px',
                  }}>
                    Position <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={pocPosition}
                    onChange={(e) => setPocPosition(e.target.value)}
                    placeholder="e.g., Director, Manager, etc."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '2px solid var(--gray-300)',
                      borderRadius: '8px',
                      outline: 'none',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontFamily: 'inherit',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: '6px',
                  }}>
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={pocPhone}
                    onChange={(e) => setPocPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '2px solid var(--gray-300)',
                      borderRadius: '8px',
                      outline: 'none',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontFamily: 'inherit',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: '6px',
                  }}>
                    Tags <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <select
                    value={pocTags}
                    onChange={(e) => setPocTags(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '2px solid var(--gray-300)',
                      borderRadius: '8px',
                      outline: 'none',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
                  >
                    <option value="">Select a tag</option>
                    {TAG_OPTIONS.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={addPoc}
                    className="btn btn-primary btn-sm"
                  >
                    <IconCheck style={{ width: 14, height: 14 }} />
                    Add POC
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPocForm(false)
                      setPocName('')
                      setPocEmail('')
                      setPocPhone('')
                      setPocPosition('')
                      setPocTags('')
                      setPocEmailFName('')
                      setPocEmailFNameLocked(true)
                      setError('')
                    }}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPocForm(true)}
                className="btn btn-outline-green btn-sm"
                style={{ width: '100%' }}
              >
                + Add Point of Contact
              </button>
            )}
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Adding Lead...' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
