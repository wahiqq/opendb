import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import AddLeadModal from '../components/AddLeadModal'
import { IconSearch, IconDatabase } from '../components/Icons'

interface Company {
  id: string
  CompanyID: string
  'Company Name': string
  Country: string
  State: string
  CreatedBy: string
  Notes: string
}

interface Contact {
  id: string
  ContactID: string
  Name: string
  Email: string
  'Phone Number': string
  Position?: string
  Tags: string
  CompanyID?: string
  Company?: {
    id: string
    CompanyID: string
    'Company Name': string
    Country: string
    State: string
    CreatedBy: string
    Notes: string
  }
}

interface SearchResults {
  companies: Company[]
  contacts: Contact[]
}

export default function SearchDashboard() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAddLeadModal, setShowAddLeadModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null)

  // Check authentication on mount
  useEffect(() => {
    const userStr = localStorage.getItem('riseUser')
    if (!userStr) {
      navigate('/')
      return
    }
    const user = JSON.parse(userStr)
    setCurrentUser({ name: user.name, email: user.email })
  }, [navigate])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    setResults(null)

    try {
      const res = await fetch(`/api/search-leads?q=${encodeURIComponent(query)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div className="dash-hero">
        <div className="dash-hero-badge">
          RISE Research · Lead Collection
        </div>
        <h1>Search Dashboard</h1>
        <p>Search companies and contacts in your lead collection database.</p>
      </div>

      <div className="dash-body">
        <form onSubmit={handleSearch} style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            gap: '1rem',
            maxWidth: '600px',
            margin: '0 auto',
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by company name, contact name, or contact email..."
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  fontSize: '15px',
                  border: '2px solid var(--gray-300)',
                  borderRadius: '10px',
                  outline: 'none',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
              />
              <IconSearch style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '18px',
                height: '18px',
                color: 'var(--text-muted)',
              }} />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="btn btn-primary"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Add Lead Button */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button
            onClick={() => setShowAddLeadModal(true)}
            className="btn btn-outline-green"
          >
            + Add Lead
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card" style={{ marginBottom: '1rem', opacity: 1 }}>
                <div style={{
                  height: '20px',
                  width: `${55 + i * 10}%`,
                  background: 'var(--gray-200)',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  animation: 'skeleton-pulse 1.4s ease-in-out infinite',
                }} />
                <div style={{
                  height: '14px',
                  width: '40%',
                  background: 'var(--gray-200)',
                  borderRadius: '6px',
                  animation: 'skeleton-pulse 1.4s ease-in-out infinite',
                  animationDelay: '0.2s',
                }} />
              </div>
            ))}
          </div>
        )}

        {!loading && results && (
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Companies Section */}
            {results.companies.length > 0 && (
              <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                  <IconDatabase style={{ width: '20px', height: '20px', color: 'var(--green-600)' }} />
                  Companies ({results.companies.length})
                </h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {results.companies.map((company) => (
                    <div
                      key={company.id}
                      className="card"
                      style={{ marginBottom: 0 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                          {company['Company Name']}
                        </h3>
                        <span style={{
                          padding: '4px 12px',
                          background: 'var(--green-50)',
                          color: 'var(--green-700)',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          border: '1px solid var(--green-200)',
                        }}>
                          {company.CompanyID}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
                        {company.Country && (
                          <div>
                            <strong style={{ color: 'var(--text)' }}>Country:</strong> {company.Country}
                          </div>
                        )}
                        {company.State && (
                          <div>
                            <strong style={{ color: 'var(--text)' }}>State:</strong> {company.State}
                          </div>
                        )}
                        {company.CreatedBy && (
                          <div>
                            <strong style={{ color: 'var(--text)' }}>Created By:</strong> {company.CreatedBy}
                          </div>
                        )}
                      </div>
                      {company.Notes && (
                        <div style={{ marginTop: '12px', padding: '12px', background: 'var(--gray-50)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px', color: 'var(--text-muted)' }}>
                          <strong style={{ color: 'var(--text)' }}>Notes:</strong> {company.Notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contacts Section - Grouped by Company */}
            {results.contacts.length > 0 && (
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                  <IconDatabase style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
                  Contacts ({results.contacts.length})
                </h2>
                
                {/* Group contacts by company */}
                {Array.from(
                  results.contacts.reduce((acc, contact) => {
                    const companyId = contact.Company?.id || 'no-company'
                    if (!acc.has(companyId)) {
                      acc.set(companyId, {
                        company: contact.Company,
                        contacts: [],
                      })
                    }
                    acc.get(companyId)!.contacts.push(contact)
                    return acc
                  }, new Map())
                ).map(([companyId, group]) => (
                  <div key={companyId} style={{ marginBottom: '2rem' }}>
                    {/* Company Header */}
                    {group.company ? (
                      <div
                        className="card"
                        style={{
                          marginBottom: '1rem',
                          background: 'var(--primary-bg)',
                          borderLeft: '4px solid var(--primary)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>
                            {group.company['Company Name']}
                          </h3>
                          <span style={{
                            padding: '4px 12px',
                            background: 'var(--primary)',
                            color: 'var(--text-on-primary)',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: 700,
                          }}>
                            {group.company.CompanyID}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {group.company.Country && (
                            <div>
                              <strong style={{ color: 'var(--text)' }}>Country:</strong> {group.company.Country}
                            </div>
                          )}
                          {group.company.State && (
                            <div>
                              <strong style={{ color: 'var(--text)' }}>State:</strong> {group.company.State}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '12px',
                        background: 'var(--error-bg)',
                        border: '1px solid var(--error-border)',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        color: 'var(--error-text)',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}>
                        ⚠ Contact not linked to any company
                      </div>
                    )}

                    {/* Contacts under this company */}
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {group.contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="card"
                          style={{
                            marginBottom: 0,
                            padding: '14px 16px',
                            borderLeft: '3px solid var(--primary-light)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                                {contact.Name || 'No name'}
                              </h4>
                              {contact.Position && (
                                <p style={{ margin: '0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                  {contact.Position}
                                </p>
                              )}
                            </div>
                            <span style={{
                              padding: '3px 10px',
                              background: 'var(--gray-100)',
                              color: 'var(--text-secondary)',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}>
                              {contact.ContactID}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                            {contact.Email && (
                              <div>
                                <strong style={{ color: 'var(--text)' }}>Email:</strong> {contact.Email}
                              </div>
                            )}
                            {contact['Phone Number'] && (
                              <div>
                                <strong style={{ color: 'var(--text)' }}>Phone:</strong> {contact['Phone Number']}
                              </div>
                            )}
                            {contact.Tags && (
                              <div>
                                <strong style={{ color: 'var(--text)' }}>Tags:</strong> <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  background: 'var(--primary-bg)',
                                  color: 'var(--primary)',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                }}>{contact.Tags}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {results.companies.length === 0 && results.contacts.length === 0 && (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
              }}>
                No results found for "<strong>{query}</strong>"
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="site-footer">© 2026 RISE Research — Internal Use Only</footer>

      {/* Add Lead Modal */}
      {showAddLeadModal && currentUser && (
        <AddLeadModal
          onClose={() => setShowAddLeadModal(false)}
          onSuccess={() => {
            setShowAddLeadModal(false)
            // You can optionally refresh search results or show a success message
            alert('Lead added successfully!')
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}
