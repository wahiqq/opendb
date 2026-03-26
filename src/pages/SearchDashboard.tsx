import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import AddLeadModal from '../components/AddLeadModal'
import { CountrySelect } from '../components/CountryStateFields'
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

const TAG_OPTIONS = ['IECA', 'HECA', 'NACAC', 'WACAC', 'School', 'Community', 'Homeschool']

export default function SearchDashboard() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAddLeadModal, setShowAddLeadModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null)
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set())

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const [filterCountry, setFilterCountry] = useState('')
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set())

  const activeFilterCount = (filterCountry.trim() ? 1 : 0) + filterTags.size

  function toggleTag(tag: string) {
    setFilterTags(prev => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }

  function clearFilters() {
    setFilterCountry('')
    setFilterTags(new Set())
  }

  function toggleCompany(id: string) {
    setExpandedCompanies(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  useEffect(() => {
    const userStr = localStorage.getItem('riseUser')
    if (!userStr) { navigate('/'); return }
    const user = JSON.parse(userStr)
    setCurrentUser({ name: user.name, email: user.email })
  }, [navigate])

  async function doSearch(q: string) {
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const res = await fetch(`/api/search-leads?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  // Debounced search on query change (only when query is non-empty)
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) { setResults(null); setError(''); return }
    const timer = setTimeout(() => doSearch(trimmed), 400)
    return () => clearTimeout(timer)
  }, [query])

  // Apply client-side filters to results
  function applyFilters(results: SearchResults): SearchResults {
    const countryFilter = filterCountry.trim()
    const tagsActive = filterTags.size > 0

    let companies = results.companies
    let contacts = results.contacts

    if (countryFilter) {
      companies = companies.filter(c => c.Country === countryFilter)
      contacts = contacts.filter(c => c.Company?.Country === countryFilter)
    }

    if (tagsActive) {
      // Keep a company if any of its contacts has one of the selected tags
      const companiesWithMatchingTag = new Set(
        contacts
          .filter(c => filterTags.has(c.Tags))
          .map(c => c.Company?.id)
          .filter(Boolean) as string[]
      )
      companies = companies.filter(c => companiesWithMatchingTag.has(c.id))
      contacts = contacts.filter(c => filterTags.has(c.Tags))
    }

    return { companies, contacts }
  }

  const filtered = results ? applyFilters(results) : null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div className="dash-hero" style={{ position: 'relative' }}>
        <button
          onClick={() => setShowAddLeadModal(true)}
          style={{
            position: 'absolute',
            top: '20px',
            right: '24px',
            padding: '10px 20px',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          + Add Lead
        </button>
        <div className="dash-hero-badge">
          RISE Research · Lead Collection
        </div>
        <h1>Search Dashboard</h1>
        <p>Search companies and contacts in your lead collection database.</p>

        {/* Search + Filter row */}
        <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
            {/* Search input */}
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by company name, contact name, or email..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 20px 14px 46px',
                  fontSize: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  outline: 'none',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  backdropFilter: 'blur(10px)',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.7)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
              />
              <IconSearch style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '18px',
                height: '18px',
                color: 'rgba(255,255,255,0.7)',
                pointerEvents: 'none',
              }} />
            </div>

            {/* Filter button */}
            <button
              ref={filterBtnRef}
              onClick={() => setFilterOpen(p => !p)}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '0 18px',
                fontSize: '14px',
                fontWeight: 700,
                background: filterOpen ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
                border: `2px solid ${activeFilterCount > 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'}`,
                borderRadius: '12px',
                color: '#fff',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="11" y1="18" x2="13" y2="18" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span style={{
                  background: '#fff',
                  color: 'var(--primary)',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '1px 7px',
                  lineHeight: '1.4',
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Search button row */}
          {activeFilterCount > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setFilterOpen(false); doSearch(query) }}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 700,
                  background: '#fff',
                  color: 'var(--primary)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                <IconSearch style={{ width: '15px', height: '15px' }} />
                Search with filters
              </button>
            </div>
          )}

          {/* Backdrop to close panel */}
          {filterOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setFilterOpen(false)} />
          )}
          {/* Filter panel — fixed to escape overflow:hidden on dash-hero */}
          {filterOpen && (() => {
            const rect = filterBtnRef.current?.getBoundingClientRect()
            const top = rect ? rect.bottom + 10 : 180
            const right = rect ? window.innerWidth - rect.right : 24
            return (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed',
                top,
                right,
                width: '340px',
                maxHeight: `calc(100vh - ${top + 16}px)`,
                overflowY: 'auto',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                padding: '20px',
                zIndex: 100,
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Filters
                </span>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Clear all
                  </button>
                )}
              </div>

              {/* Country filter */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Country
                </label>
                <CountrySelect
                  value={filterCountry}
                  onChange={setFilterCountry}
                  small
                />
              </div>

              {/* Tags filter */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Contact Tags
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {TAG_OPTIONS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '5px 12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: filterTags.has(tag) ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                        background: filterTags.has(tag) ? 'var(--primary-bg)' : 'var(--surface)',
                        color: filterTags.has(tag) ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            )
          })()}
        </div>
      </div>

      <div className="dash-body">
        {error && (
          <div className="alert alert-error" style={{ maxWidth: '900px', margin: '0 auto 2rem' }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card" style={{ marginBottom: '1rem', opacity: 1 }}>
                <div style={{ height: '20px', width: `${55 + i * 10}%`, background: 'var(--gray-200)', borderRadius: '6px', marginBottom: '12px', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
                <div style={{ height: '14px', width: '40%', background: 'var(--gray-200)', borderRadius: '6px', animation: 'skeleton-pulse 1.4s ease-in-out infinite', animationDelay: '0.2s' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>

            {/* Active filter summary */}
            {activeFilterCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Filtered by:</span>
                {filterCountry.trim() && (
                  <span style={{ padding: '3px 10px', background: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, border: '1px solid var(--primary-light)' }}>
                    Country: {filterCountry.trim()}
                  </span>
                )}
                {Array.from(filterTags).map(tag => (
                  <span key={tag} style={{ padding: '3px 10px', background: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, border: '1px solid var(--primary-light)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Companies Section */}
            {filtered.companies.length > 0 && (
              <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                  <IconDatabase style={{ width: '20px', height: '20px', color: 'var(--green-600)' }} />
                  Companies ({filtered.companies.length})
                </h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {filtered.companies.map((company) => {
                    const isExpanded = expandedCompanies.has(company.id)
                    const linkedContacts = filtered.contacts.filter(c => c.Company?.id === company.id)
                    return (
                      <div key={company.id} className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden' }}>
                        <button
                          onClick={() => toggleCompany(company.id)}
                          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '12px' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {company['Company Name']}
                            </h3>
                            <span style={{ flexShrink: 0, padding: '3px 10px', background: 'var(--green-50)', color: 'var(--green-700)', borderRadius: '12px', fontSize: '12px', fontWeight: 700, border: '1px solid var(--green-200)' }}>
                              {company.CompanyID}
                            </span>
                            {linkedContacts.length > 0 && (
                              <span style={{ flexShrink: 0, padding: '3px 10px', background: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                                {linkedContacts.length} contact{linkedContacts.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                            style={{ flexShrink: 0, width: '18px', height: '18px', color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                          <span
                            onClick={e => { e.stopPropagation(); navigate(`/company/${company.CompanyID}`) }}
                            title="View company page"
                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: 'var(--primary-bg)', border: '1px solid var(--primary-light)', borderRadius: '6px', cursor: 'pointer', color: 'var(--primary)' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </span>
                        </button>

                        {isExpanded && (
                          <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                            {linkedContacts.length > 0 && (
                              <div style={{ marginTop: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                                  Contacts
                                </div>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                  {linkedContacts.map(contact => (
                                    <div key={contact.id} style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', borderLeft: '3px solid var(--primary-light)' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                                        <div>
                                          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{contact.Name || '—'}</span>
                                          {contact.Position && <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '8px' }}>{contact.Position}</span>}
                                        </div>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{contact.ContactID}</span>
                                      </div>
                                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-muted)' }}>
                                        {contact['Phone Number'] && <span>{contact['Phone Number']}</span>}
                                        {contact.Tags && (
                                          <span style={{ padding: '1px 8px', background: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                                            {contact.Tags}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Contacts Section - only contacts NOT already shown inside a matched company */}
            {filtered.contacts.filter(c => !filtered.companies.some(co => co.id === c.Company?.id)).length > 0 && (
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                  <IconDatabase style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
                  Contacts ({filtered.contacts.filter(c => !filtered.companies.some(co => co.id === c.Company?.id)).length})
                </h2>

                {Array.from(
                  filtered.contacts.filter(c => !filtered.companies.some(co => co.id === c.Company?.id)).reduce((acc, contact) => {
                    const companyId = contact.Company?.id || 'no-company'
                    if (!acc.has(companyId)) acc.set(companyId, { company: contact.Company, contacts: [] })
                    acc.get(companyId)!.contacts.push(contact)
                    return acc
                  }, new Map())
                ).map(([companyId, group]) => (
                  <div key={companyId} style={{ marginBottom: '2rem' }}>
                    {group.company ? (
                      <div className="card" style={{ marginBottom: '1rem', background: 'var(--primary-bg)', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>
                            {group.company['Company Name']}
                          </h3>
                          <span style={{ padding: '4px 12px', background: 'var(--primary)', color: 'var(--text-on-primary)', borderRadius: '12px', fontSize: '13px', fontWeight: 700 }}>
                            {group.company.CompanyID}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '12px', background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: '8px', marginBottom: '1rem', color: 'var(--error-text)', fontSize: '13px', fontWeight: 600 }}>
                        ⚠ Contact not linked to any company
                      </div>
                    )}

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {group.contacts.map((contact) => (
                        <div key={contact.id} className="card" style={{ marginBottom: 0, padding: '14px 16px', borderLeft: '3px solid var(--primary-light)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{contact.Name || 'No name'}</h4>
                              {contact.Position && <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{contact.Position}</p>}
                            </div>
                            <span style={{ padding: '3px 10px', background: 'var(--gray-100)', color: 'var(--text-secondary)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {contact.ContactID}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-muted)' }}>
                            {contact['Phone Number'] && <span><strong style={{ color: 'var(--text)' }}>Phone:</strong> {contact['Phone Number']}</span>}
                            {contact.Tags && (
                              <span style={{ padding: '2px 8px', background: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                                {contact.Tags}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filtered.companies.length === 0 && filtered.contacts.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                {activeFilterCount > 0
                  ? <>No results match the active filters. <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: 'inherit' }}>Clear filters</button></>
                  : <>No results found for "<strong>{query}</strong>"</>
                }
              </div>
            )}
          </div>
        )}


      </div>

      <footer className="site-footer">© 2026 RISE Research — Internal Use Only</footer>

      {showAddLeadModal && currentUser && (
        <AddLeadModal
          onClose={() => setShowAddLeadModal(false)}
          onSuccess={() => { setShowAddLeadModal(false); alert('Lead added successfully!') }}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}
