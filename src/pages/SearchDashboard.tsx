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
  ContactId: string
  'Email Name': string
  'Phone Number': string
  Tags: string
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
                placeholder="Search by company name, email, or contact ID..."
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  fontSize: '15px',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '10px',
                  outline: 'none',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--green-600)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-strong)'}
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

        {results && (
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

            {/* Contacts Section */}
            {results.contacts.length > 0 && (
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                  <IconDatabase style={{ width: '20px', height: '20px', color: 'var(--green-600)' }} />
                  Contacts ({results.contacts.length})
                </h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {results.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="card"
                      style={{ marginBottom: 0 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                          {contact['Email Name'] || 'No email'}
                        </h3>
                        <span style={{
                          padding: '4px 12px',
                          background: 'var(--green-100)',
                          color: 'var(--green-700)',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          border: '1px solid var(--green-200)',
                        }}>
                          {contact.ContactId}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
                        {contact['Phone Number'] && (
                          <div>
                            <strong style={{ color: 'var(--text)' }}>Phone:</strong> {contact['Phone Number']}
                          </div>
                        )}
                        {contact.Tags && (
                          <div>
                            <strong style={{ color: 'var(--text)' }}>Tags:</strong> <span style={{
                              padding: '2px 8px',
                              background: 'var(--green-100)',
                              color: 'var(--green-700)',
                              borderRadius: '4px',
                              fontSize: '13px',
                              fontWeight: 600,
                            }}>{contact.Tags}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
