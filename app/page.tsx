'use client'

import { useState, useEffect, useCallback } from 'react'
import { SCRIPTS, PIPELINE_STEPS, Script, ScriptSection } from '@/data/scripts'

type Opportunity = {
  id: string
  name: string
  contactId: string
  pipelineStageId: string
  status: string
  contact?: {
    firstName: string
    lastName: string
    email: string
    phone: string
    timezone: string
  }
  monetaryValue?: number
  source?: string
  assignedTo?: string
  createdAt?: string
  updatedAt?: string
}

type Stage = {
  id: string
  name: string
}

type Note = {
  id: string
  body: string
  dateAdded: string
}

export default function Dashboard() {
  const [stages, setStages] = useState<Stage[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [selectedLead, setSelectedLead] = useState<Opportunity | null>(null)
  const [activeTab, setActiveTab] = useState<'script' | 'activity' | 'info'>('script')
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [noteSaving, setNoteSaving] = useState(false)
  const [showVoicemail, setShowVoicemail] = useState(false)
  const [showNotAnswered, setShowNotAnswered] = useState(false)
  const [notAvailableHours, setNotAvailableHours] = useState('')
  const [showNotAvailable, setShowNotAvailable] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/leads')
      const data = await res.json()
      setStages(data.stages || [])
      setOpportunities(data.opportunities || [])
      if (data.stages?.length > 0 && !selectedStage) {
        setSelectedStage(data.stages[0])
      }
    } catch {
      showToast('Error cargando leads', 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedStage])

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchNotes = useCallback(async (contactId: string) => {
    try {
      const res = await fetch(`/api/notes?contactId=${contactId}`)
      const data = await res.json()
      setNotes(data.notes || [])
    } catch {
      setNotes([])
    }
  }, [])

  useEffect(() => {
    if (selectedLead?.contactId) {
      fetchNotes(selectedLead.contactId)
    }
  }, [selectedLead, fetchNotes])

  const leadsInStage = opportunities.filter(
    o => o.pipelineStageId === selectedStage?.id
  ).filter(o => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const name = `${o.contact?.firstName ?? ''} ${o.contact?.lastName ?? ''}`.toLowerCase()
    return name.includes(q) || o.contact?.email?.toLowerCase().includes(q) || false
  })

  const getScriptForStage = (stageName: string): Script | null => {
    const normalized = stageName.toLowerCase()
    for (const [key, script] of Object.entries(SCRIPTS)) {
      if (normalized.includes(key.replace(/-/g, ' ').toLowerCase())) return script
      if (script.stepName.toLowerCase() === normalized) return script
    }
    const mappings: Record<string, string> = {
      'opt-in': 'opt-in-lead',
      'optin': 'opt-in-lead',
      '48h qual': 'confirm-qual-48h',
      '48 hr qual': 'confirm-qual-48h',
      'qual call 48': 'confirm-qual-48h',
      '24h qual': 'confirm-qual-24h',
      '24 hr qual': 'confirm-qual-24h',
      'qual call 24': 'confirm-qual-24h',
      'day off qual': 'confirm-qual-dayoff',
      'qual call day': 'confirm-qual-dayoff',
      'qualification call': 'qualification-call',
      'rebook qual': 'rebook-qual-call',
      'qual follow': 'qual-call-followup',
      '48h sales': 'confirm-sales-48h',
      'sales call 48': 'confirm-sales-48h',
      '24h sales': 'confirm-sales-24h',
      'sales call 24': 'confirm-sales-24h',
      'day off sales': 'confirm-sales-dayoff',
      'sales call day': 'confirm-sales-dayoff',
      'sales call': 'sales-call',
      'rebook sales': 'rebook-sales-call',
      'sales follow': 'sales-call-followup',
      'tea students': 'tea-students',
    }
    for (const [pattern, scriptKey] of Object.entries(mappings)) {
      if (normalized.includes(pattern)) return SCRIPTS[scriptKey]
    }
    return null
  }

  const currentScript = selectedStage ? getScriptForStage(selectedStage.name) : null

  const saveNote = async () => {
    if (!newNote.trim() || !selectedLead?.contactId) return
    setNoteSaving(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedLead.contactId, body: newNote }),
      })
      if (res.ok) {
        setNewNote('')
        fetchNotes(selectedLead.contactId)
        showToast('Nota guardada')
      }
    } catch {
      showToast('Error guardando nota', 'error')
    } finally {
      setNoteSaving(false)
    }
  }

  const handleOutcome = async (action: string, label: string) => {
    if (!selectedLead) return
    if (action === 'not_available') {
      setShowNotAvailable(true)
      return
    }
    const noteText = `[${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}] ${label} — Paso: ${selectedStage?.name}`
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedLead.contactId, body: noteText }),
      })
      showToast(`✓ Registrado: ${label}`)
      if (selectedLead.contactId) fetchNotes(selectedLead.contactId)
    } catch {
      showToast('Error registrando resultado', 'error')
    }
    setShowNotAnswered(false)
  }

  const confirmNotAvailable = async () => {
    if (!selectedLead || !notAvailableHours) return
    const noteText = `[${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}] No Disponible — Llamar en ${notAvailableHours} horas`
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: selectedLead.contactId, body: noteText }),
    })
    showToast(`Llamar en ${notAvailableHours} horas`)
    setShowNotAvailable(false)
    setNotAvailableHours('')
  }

  const getInitials = (opp: Opportunity) => {
    const f = opp.contact?.firstName?.[0] ?? ''
    const l = opp.contact?.lastName?.[0] ?? ''
    return (f + l).toUpperCase() || opp.name?.[0]?.toUpperCase() || '?'
  }

  const getFullName = (opp: Opportunity) => {
    if (opp.contact?.firstName || opp.contact?.lastName) {
      return `${opp.contact.firstName ?? ''} ${opp.contact.lastName ?? ''}`.trim()
    }
    return opp.name
  }

  const getSectionBg = (type: ScriptSection['type']) => {
    if (type === 'voicemail') return '#1a1a2e'
    if (type === 'branch') return '#1a2e1a'
    if (type === 'note') return '#2e1a00'
    return 'transparent'
  }

  const getSectionBorder = (type: ScriptSection['type']) => {
    if (type === 'voicemail') return '#283A97'
    if (type === 'branch') return '#1D9E75'
    if (type === 'note') return '#BA7517'
    return '#2a2a2a'
  }

  const outcomeColor = (color: string) => {
    const map: Record<string, string> = {
      green: '#1D9E75',
      yellow: '#BA7517',
      red: '#e80f40',
      blue: '#283A97',
    }
    return map[color] || '#666'
  }

  const stageLeadCount = (stageId: string) =>
    opportunities.filter(o => o.pipelineStageId === stageId).length

  const getPipelineStepMeta = (stageName: string) => {
    const n = stageName.toLowerCase()
    return PIPELINE_STEPS.find(s =>
      n.includes(s.key.replace(/-/g, ' ')) || s.label.toLowerCase() === n
    )
  }

  return (
    <div style={{
      display: 'flex', height: '100vh', background: '#0a0a0a',
      color: '#e8e8e8', fontFamily: "'DM Mono', 'Fira Code', monospace",
      overflow: 'hidden', position: 'relative'
    }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          background: toast.type === 'success' ? '#1D9E75' : '#e80f40',
          color: '#fff', padding: '10px 18px', borderRadius: 8,
          fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.2s ease'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Not Available Modal */}
      {showNotAvailable && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#141414', border: '1px solid #333', borderRadius: 12,
            padding: 28, width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No Disponible</p>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>¿En cuántas horas volver a llamar?</p>
            <input
              type="number" min="1" max="72"
              value={notAvailableHours}
              onChange={e => setNotAvailableHours(e.target.value)}
              placeholder="ej: 2"
              style={{
                width: '100%', background: '#1a1a1a', border: '1px solid #333',
                borderRadius: 6, padding: '8px 12px', color: '#e8e8e8',
                fontSize: 14, marginBottom: 16, fontFamily: 'inherit'
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNotAvailable(false)} style={{
                flex: 1, padding: '8px 0', background: 'transparent',
                border: '1px solid #333', borderRadius: 6, color: '#888',
                cursor: 'pointer', fontSize: 12, fontFamily: 'inherit'
              }}>Cancelar</button>
              <button onClick={confirmNotAvailable} style={{
                flex: 1, padding: '8px 0', background: '#e80f40',
                border: 'none', borderRadius: 6, color: '#fff',
                cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600
              }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR — Pipeline Steps */}
      <div style={{
        width: 220, borderRight: '1px solid #1e1e1e',
        overflowY: 'auto', flexShrink: 0, background: '#0d0d0d'
      }}>
        <div style={{
          padding: '16px 14px 10px', borderBottom: '1px solid #1e1e1e',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: '#e80f40',
            boxShadow: '0 0 8px #e80f40'
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#e80f40', letterSpacing: '0.08em' }}>
            TEA PIPELINE
          </span>
        </div>

        <div style={{ padding: '8px 8px' }}>
          {loading ? (
            <div style={{ padding: 16, fontSize: 11, color: '#555' }}>Cargando...</div>
          ) : stages.length === 0 ? (
            <div style={{ padding: 16, fontSize: 11, color: '#555' }}>
              Sin stages. Verifica el Pipeline ID en Vercel.
            </div>
          ) : (
            stages.map(stage => {
              const meta = getPipelineStepMeta(stage.name)
              const count = stageLeadCount(stage.id)
              const isActive = selectedStage?.id === stage.id
              return (
                <button
                  key={stage.id}
                  onClick={() => { setSelectedStage(stage); setSelectedLead(null) }}
                  style={{
                    width: '100%', textAlign: 'left', background: isActive ? '#181818' : 'transparent',
                    border: isActive ? `1px solid ${meta?.color ?? '#333'}` : '1px solid transparent',
                    borderRadius: 6, padding: '7px 10px', cursor: 'pointer',
                    marginBottom: 2, color: isActive ? '#e8e8e8' : '#666',
                    fontSize: 11, display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', transition: 'all 0.15s', fontFamily: 'inherit'
                  }}
                >
                  <span style={{ lineHeight: 1.4 }}>{stage.name}</span>
                  {count > 0 && (
                    <span style={{
                      background: isActive ? (meta?.color ?? '#e80f40') : '#1e1e1e',
                      color: isActive ? '#fff' : '#555',
                      borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 600,
                      flexShrink: 0, marginLeft: 4
                    }}>{count}</span>
                  )}
                </button>
              )
            })
          )}
        </div>

        <div style={{ padding: '8px 14px', borderTop: '1px solid #1e1e1e', marginTop: 4 }}>
          <button
            onClick={fetchLeads}
            style={{
              width: '100%', background: 'transparent', border: '1px solid #2a2a2a',
              borderRadius: 6, padding: '6px 0', color: '#555', cursor: 'pointer',
              fontSize: 11, fontFamily: 'inherit'
            }}
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* LEADS LIST */}
      <div style={{
        width: 260, borderRight: '1px solid #1e1e1e',
        display: 'flex', flexDirection: 'column', flexShrink: 0, background: '#0d0d0d'
      }}>
        <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid #1e1e1e' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#e8e8e8', marginBottom: 8 }}>
            {selectedStage?.name ?? 'Selecciona un paso'}
            <span style={{ color: '#555', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
              {leadsInStage.length} leads
            </span>
          </p>
          <input
            placeholder="Buscar lead..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', background: '#141414', border: '1px solid #2a2a2a',
              borderRadius: 6, padding: '6px 10px', color: '#e8e8e8',
              fontSize: 11, fontFamily: 'inherit', outline: 'none'
            }}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {leadsInStage.length === 0 ? (
            <div style={{ padding: 20, fontSize: 11, color: '#444', textAlign: 'center' }}>
              {selectedStage ? 'Sin leads en este paso' : 'Selecciona un paso del pipeline'}
            </div>
          ) : (
            leadsInStage.map(opp => {
              const isSelected = selectedLead?.id === opp.id
              return (
                <div
                  key={opp.id}
                  onClick={() => { setSelectedLead(opp); setActiveTab('script'); setShowVoicemail(false); setShowNotAnswered(false) }}
                  style={{
                    padding: '10px 12px', cursor: 'pointer',
                    borderBottom: '1px solid #141414',
                    background: isSelected ? '#141414' : 'transparent',
                    borderLeft: isSelected ? '2px solid #e80f40' : '2px solid transparent',
                    transition: 'all 0.1s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: isSelected ? '#e80f4020' : '#1a1a1a',
                      border: `1px solid ${isSelected ? '#e80f40' : '#2a2a2a'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 600,
                      color: isSelected ? '#e80f40' : '#555', flexShrink: 0
                    }}>
                      {getInitials(opp)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontSize: 12, fontWeight: 500,
                        color: isSelected ? '#e8e8e8' : '#aaa',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {getFullName(opp)}
                      </p>
                      <p style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
                        {opp.contact?.phone ?? opp.source ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* MAIN PANEL */}
      {selectedLead ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Lead Header */}
          <div style={{
            padding: '12px 18px', borderBottom: '1px solid #1e1e1e',
            display: 'flex', alignItems: 'center', gap: 12, background: '#0d0d0d'
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: '#e80f4018', border: '1px solid #e80f4040',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, color: '#e80f40', flexShrink: 0
            }}>
              {getInitials(selectedLead)}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8' }}>
                {getFullName(selectedLead)}
              </p>
              <p style={{ fontSize: 11, color: '#555', marginTop: 1 }}>
                {selectedLead.contact?.email ?? '—'} · {selectedLead.contact?.phone ?? '—'} · {selectedLead.contact?.timezone ?? ''}
              </p>
            </div>
            <a
              href={`https://app.funnelup.io/v2/location/${process.env.NEXT_PUBLIC_GHL_LOCATION_ID}/contacts/detail/${selectedLead.contactId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '6px 12px', background: 'transparent',
                border: '1px solid #2a2a2a', borderRadius: 6,
                color: '#555', fontSize: 11, cursor: 'pointer',
                textDecoration: 'none', fontFamily: 'inherit'
              }}
            >
              Ver en FunnelUp ↗
            </a>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', borderBottom: '1px solid #1e1e1e',
            padding: '0 18px', background: '#0d0d0d'
          }}>
            {(['script', 'activity', 'info'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 14px', background: 'transparent',
                  border: 'none', borderBottom: activeTab === tab ? '2px solid #e80f40' : '2px solid transparent',
                  color: activeTab === tab ? '#e80f40' : '#555',
                  fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit', letterSpacing: '0.05em',
                  textTransform: 'uppercase', marginBottom: '-1px'
                }}
              >
                {tab === 'script' ? 'Guion' : tab === 'activity' ? 'Notas' : 'Info'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

            {/* SCRIPT TAB */}
            {activeTab === 'script' && (
              <div>
                {currentScript ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <p style={{ fontSize: 11, color: '#555', fontWeight: 500 }}>
                        {currentScript.stepName}
                      </p>
                      <span style={{
                        background: '#1a1a1a', border: '1px solid #2a2a2a',
                        borderRadius: 4, padding: '2px 8px', fontSize: 10, color: '#666'
                      }}>
                        {currentScript.duration}
                      </span>
                      <button
                        onClick={() => setShowVoicemail(!showVoicemail)}
                        style={{
                          marginLeft: 'auto', background: 'transparent',
                          border: '1px solid #283A97', borderRadius: 6,
                          padding: '4px 10px', color: '#283A97', fontSize: 10,
                          cursor: 'pointer', fontFamily: 'inherit'
                        }}
                      >
                        {showVoicemail ? '← Guion' : '📱 Mensaje de Voz'}
                      </button>
                    </div>

                    {showVoicemail ? (
                      <div>
                        {currentScript.sections.filter(s => s.type === 'voicemail').map((s, i) => (
                          <div key={i} style={{
                            background: '#0d0d1e', border: '1px solid #283A97',
                            borderRadius: 8, padding: '14px 16px', marginBottom: 12
                          }}>
                            <p style={{ fontSize: 10, color: '#283A97', fontWeight: 600, marginBottom: 10, letterSpacing: '0.06em' }}>
                              {s.title}
                            </p>
                            <p style={{ fontSize: 12, lineHeight: 1.8, color: '#bbb', whiteSpace: 'pre-line' }}>
                              {s.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        {currentScript.sections.filter(s => s.type !== 'voicemail').map((s, i) => (
                          <div key={i} style={{
                            background: getSectionBg(s.type),
                            border: `1px solid ${getSectionBorder(s.type)}`,
                            borderRadius: 8, padding: '12px 14px', marginBottom: 10
                          }}>
                            <p style={{
                              fontSize: 10, fontWeight: 600, marginBottom: 8, letterSpacing: '0.06em',
                              color: s.type === 'branch' ? '#1D9E75' : s.type === 'note' ? '#BA7517' : '#e80f40'
                            }}>
                              {s.title}
                            </p>
                            <p style={{ fontSize: 12, lineHeight: 1.9, color: '#ccc', whiteSpace: 'pre-line' }}>
                              {s.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Outcome Buttons */}
                    {!showVoicemail && currentScript.answeredOutcomes.length > 0 && (
                      <div style={{ marginTop: 20 }}>
                        {!showNotAnswered ? (
                          <>
                            <p style={{ fontSize: 10, color: '#555', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 600 }}>
                              ¿CONTESTÓ?
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
                              {currentScript.answeredOutcomes.map((o, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleOutcome(o.action, o.label)}
                                  style={{
                                    padding: '9px 12px', background: `${outcomeColor(o.color)}18`,
                                    border: `1px solid ${outcomeColor(o.color)}`,
                                    borderRadius: 6, color: outcomeColor(o.color),
                                    fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                                    fontWeight: 500, transition: 'all 0.15s'
                                  }}
                                >
                                  {o.label}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setShowNotAnswered(true)}
                              style={{
                                width: '100%', padding: '8px 0', background: 'transparent',
                                border: '1px solid #2a2a2a', borderRadius: 6,
                                color: '#555', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit'
                              }}
                            >
                              No contestó →
                            </button>
                          </>
                        ) : (
                          <>
                            <p style={{ fontSize: 10, color: '#555', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 600 }}>
                              NO CONTESTÓ — ¿QUÉ PASÓ?
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
                              {currentScript.notAnsweredOutcomes.map((o, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleOutcome(o.action, o.label)}
                                  style={{
                                    padding: '9px 12px', background: `${outcomeColor(o.color)}18`,
                                    border: `1px solid ${outcomeColor(o.color)}`,
                                    borderRadius: 6, color: outcomeColor(o.color),
                                    fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500
                                  }}
                                >
                                  {o.label}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setShowNotAnswered(false)}
                              style={{
                                width: '100%', padding: '8px 0', background: 'transparent',
                                border: '1px solid #2a2a2a', borderRadius: 6,
                                color: '#555', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit'
                              }}
                            >
                              ← Contestó
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: 24, textAlign: 'center', color: '#444', fontSize: 12 }}>
                    No hay guion para este paso.<br />
                    <span style={{ fontSize: 10, color: '#333', marginTop: 6, display: 'block' }}>
                      Stage: {selectedStage?.name}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* NOTES TAB */}
            {activeTab === 'activity' && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Escribir nota sobre este lead..."
                    rows={3}
                    style={{
                      width: '100%', background: '#141414', border: '1px solid #2a2a2a',
                      borderRadius: 8, padding: '10px 12px', color: '#e8e8e8',
                      fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none'
                    }}
                  />
                  <button
                    onClick={saveNote}
                    disabled={noteSaving || !newNote.trim()}
                    style={{
                      marginTop: 8, padding: '7px 16px', background: newNote.trim() ? '#e80f40' : '#1a1a1a',
                      border: 'none', borderRadius: 6, color: newNote.trim() ? '#fff' : '#444',
                      fontSize: 11, cursor: newNote.trim() ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit', fontWeight: 500
                    }}
                  >
                    {noteSaving ? 'Guardando...' : 'Guardar nota'}
                  </button>
                </div>

                {notes.length === 0 ? (
                  <p style={{ fontSize: 11, color: '#444', textAlign: 'center', paddingTop: 20 }}>
                    Sin notas aún
                  </p>
                ) : (
                  notes.map(note => (
                    <div key={note.id} style={{
                      background: '#0d0d0d', border: '1px solid #1e1e1e',
                      borderRadius: 8, padding: '10px 12px', marginBottom: 8
                    }}>
                      <p style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>
                        {new Date(note.dateAdded).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                      <p style={{ fontSize: 12, color: '#bbb', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                        {note.body}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* INFO TAB */}
            {activeTab === 'info' && (
              <div>
                {[
                  ['Nombre', getFullName(selectedLead)],
                  ['Email', selectedLead.contact?.email ?? '—'],
                  ['Teléfono', selectedLead.contact?.phone ?? '—'],
                  ['Zona Horaria', selectedLead.contact?.timezone ?? '—'],
                  ['Fuente', selectedLead.source ?? '—'],
                  ['Pipeline Stage', selectedStage?.name ?? '—'],
                  ['Valor', selectedLead.monetaryValue ? `$${selectedLead.monetaryValue}` : '$0'],
                  ['Status', selectedLead.status ?? '—'],
                  ['Creado', selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString('es-ES') : '—'],
                ].map(([label, value]) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: '1px solid #141414'
                  }}>
                    <span style={{ fontSize: 11, color: '#555' }}>{label}</span>
                    <span style={{ fontSize: 11, color: '#bbb', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            border: '1px solid #e80f4030',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24
          }}>
            📞
          </div>
          <p style={{ fontSize: 13, color: '#333' }}>Selecciona un lead para comenzar</p>
          <p style={{ fontSize: 11, color: '#222' }}>TEA Setter Dashboard</p>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        input::placeholder, textarea::placeholder { color: #333; }
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
      `}</style>
    </div>
  )
}
