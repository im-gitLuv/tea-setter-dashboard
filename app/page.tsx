'use client'

import { useState, useEffect, useCallback } from 'react'
import { SCRIPTS, PIPELINE_STEPS, Script, ScriptSection } from '@/data/scripts'

// ── Custom field IDs from FunnelUp (confirmed from API response) ──────────
// S7k7o99V2UuNQUQFL9lY → Fecha/hora de cita (e.g. "lunes, 6 de julio de 2026 8:00")
// BwZoWH4kcEuxWM8u676Y → Método de pago preferido
const CF_APPT_DATE = 'S7k7o99V2UuNQUQFL9lY'

type CustomField = { id: string; value: string | number }

type Opportunity = {
  id: string
  name: string
  contactId: string
  pipelineStageId: string
  status: string
  contact?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    timezone?: string
    dateAdded?: string
    customFields?: CustomField[]
  }
  monetaryValue?: number
  source?: string
  createdAt?: string
}

type Stage = { id: string; name: string }
type Note = { id: string; body: string; dateAdded: string }

// ── Variable resolution ───────────────────────────────────────────────────
function getCustomField(fields: CustomField[] | undefined, id: string): string {
  if (!fields) return ''
  const f = fields.find(f => f.id === id)
  return f ? String(f.value) : ''
}

function resolveVars(text: string, lead: Opportunity | null): string {
  if (!lead) return text
  const c = lead.contact ?? {}

  const firstName  = c.firstName  ?? ''
  const lastName   = c.lastName   ?? ''
  const email      = c.email      ?? ''
  const phone      = c.phone      ?? ''

  // Appointment date/time — custom field already formatted in Spanish
  // value: "lunes, 6 de julio de 2026 8:00"
  const apptRaw = getCustomField(c.customFields, CF_APPT_DATE)
  let apptDate = ''
  let apptTime = ''
  if (apptRaw) {
    // Split on last space-separated time component "8:00" or "08:00"
    const match = apptRaw.match(/^(.+?)\s+(\d{1,2}:\d{2})$/)
    if (match) {
      apptDate = match[1].trim()   // "lunes, 6 de julio de 2026"
      apptTime = match[2].trim()   // "8:00"
    } else {
      apptDate = apptRaw
    }
  }

  // Registration date from dateAdded
  const registrationDate = c.dateAdded
    ? new Date(c.dateAdded).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
    : ''

  const map: Record<string, string> = {
    '{Primer Nombre}'     : firstName,
    '{Apellido}'          : lastName,
    '{Nombre Completo}'   : `${firstName} ${lastName}`.trim(),
    '{Email}'             : email,
    '{Teléfono}'          : phone,
    '{Fecha de Cita}'     : apptDate,
    '{Hora de Cita}'      : apptTime,
    '{Fecha}'             : apptDate,   // generic {Fecha} also maps to appt date
    '{Hora}'              : apptTime,   // generic {Hora} also maps to appt time
    '{Fecha de Registro}' : registrationDate,
    '{Tu Número}'         : '+1 (XXX) XXX-XXXX',
  }

  return text.replace(/\{[^}]+\}/g, (match) => {
    const val = map[match]
    if (val === undefined || val === '') return match  // keep placeholder if no data
    return val
  })
}

// ── Brand colors ──────────────────────────────────────────────────────────
const C = {
  red: '#EA0029', blue: '#283A97', darkBlue: '#0F145B',
  lightBlue: '#4789C8', white: '#FFFFFF', bg: '#F4F6FB',
  sidebar: '#0F145B', sidebarActive: '#283A97',
  border: '#DDE3F0', text: '#1a1e3a',
  textMuted: '#6B7280', textLight: '#9CA3AF',
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
      if (data.stages?.length > 0 && !selectedStage) setSelectedStage(data.stages[0])
    } catch { showToast('Error cargando leads', 'error') }
    finally { setLoading(false) }
  }, [selectedStage])

  useEffect(() => { fetchLeads() }, [])

  const fetchNotes = useCallback(async (contactId: string) => {
    try {
      const res = await fetch(`/api/notes?contactId=${contactId}`)
      const data = await res.json()
      setNotes(data.notes || [])
    } catch { setNotes([]) }
  }, [])

  useEffect(() => {
    if (selectedLead?.contactId) fetchNotes(selectedLead.contactId)
  }, [selectedLead, fetchNotes])

  const leadsInStage = opportunities
    .filter(o => o.pipelineStageId === selectedStage?.id)
    .filter(o => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      const name = `${o.contact?.firstName ?? ''} ${o.contact?.lastName ?? ''}`.toLowerCase()
      return name.includes(q) || o.contact?.email?.toLowerCase().includes(q) || false
    })

  const getScriptForStage = (stageName: string): Script | null => {
    const n = stageName.toLowerCase()
    for (const [key, script] of Object.entries(SCRIPTS)) {
      if (n.includes(key.replace(/-/g, ' ').toLowerCase())) return script
      if (script.stepName.toLowerCase() === n) return script
    }
    const mappings: Record<string, string> = {
      'opt-in': 'opt-in-lead', 'optin': 'opt-in-lead',
      '48h qual': 'confirm-qual-48h', '48 hr qual': 'confirm-qual-48h', 'qual call 48': 'confirm-qual-48h',
      '24h qual': 'confirm-qual-24h', '24 hr qual': 'confirm-qual-24h', 'qual call 24': 'confirm-qual-24h',
      'day off qual': 'confirm-qual-dayoff', 'qual call day': 'confirm-qual-dayoff',
      'qualification call': 'qualification-call', 'rebook qual': 'rebook-qual-call',
      'qual follow': 'qual-call-followup', '48h sales': 'confirm-sales-48h',
      'sales call 48': 'confirm-sales-48h', '24h sales': 'confirm-sales-24h',
      'sales call 24': 'confirm-sales-24h', 'day off sales': 'confirm-sales-dayoff',
      'sales call day': 'confirm-sales-dayoff', 'sales call': 'sales-call',
      'rebook sales': 'rebook-sales-call', 'sales follow': 'sales-call-followup',
      'tea students': 'tea-students',
    }
    for (const [pattern, scriptKey] of Object.entries(mappings)) {
      if (n.includes(pattern)) return SCRIPTS[scriptKey]
    }
    return null
  }

  const currentScript = selectedStage ? getScriptForStage(selectedStage.name) : null

  const saveNote = async () => {
    if (!newNote.trim() || !selectedLead?.contactId) return
    setNoteSaving(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedLead.contactId, body: newNote }),
      })
      if (res.ok) { setNewNote(''); fetchNotes(selectedLead.contactId); showToast('Nota guardada') }
    } catch { showToast('Error guardando nota', 'error') }
    finally { setNoteSaving(false) }
  }

  const handleOutcome = async (action: string, label: string) => {
    if (!selectedLead) return
    if (action === 'not_available') { setShowNotAvailable(true); return }
    const noteText = `[${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}] ${label} — Paso: ${selectedStage?.name}`
    try {
      await fetch('/api/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedLead.contactId, body: noteText }),
      })
      showToast(`✓ Registrado: ${label}`)
      if (selectedLead.contactId) fetchNotes(selectedLead.contactId)
    } catch { showToast('Error registrando resultado', 'error') }
    setShowNotAnswered(false)
  }

  const confirmNotAvailable = async () => {
    if (!selectedLead || !notAvailableHours) return
    const noteText = `[${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}] No Disponible — Llamar en ${notAvailableHours} horas`
    await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: selectedLead.contactId, body: noteText }),
    })
    showToast(`Llamar en ${notAvailableHours} horas`)
    setShowNotAvailable(false); setNotAvailableHours('')
  }

  const getInitials = (opp: Opportunity) => {
    const f = opp.contact?.firstName?.[0] ?? ''
    const l = opp.contact?.lastName?.[0] ?? ''
    return (f + l).toUpperCase() || opp.name?.[0]?.toUpperCase() || '?'
  }

  const getFullName = (opp: Opportunity) => {
    if (opp.contact?.firstName || opp.contact?.lastName)
      return `${opp.contact.firstName ?? ''} ${opp.contact.lastName ?? ''}`.trim()
    return opp.name
  }

  const outcomeColor = (color: string) => ({
    green: '#16a34a', yellow: '#d97706', red: C.red, blue: C.blue,
  }[color] || C.textMuted)

  const stageLeadCount = (stageId: string) =>
    opportunities.filter(o => o.pipelineStageId === stageId).length

  // Render one script bubble with resolved variables
  const renderSection = (s: ScriptSection, i: number) => {
    const text = resolveVars(s.content, selectedLead)
    const isVoicemail = s.type === 'voicemail'
    const isBranch    = s.type === 'branch'
    const isNote      = s.type === 'note'

    const titleColor  = isVoicemail ? C.blue : isBranch ? '#059669' : isNote ? '#d97706' : C.red
    const bgColor     = isVoicemail ? '#EEF2FF' : isBranch ? '#ECFDF5' : isNote ? '#FFFBEB' : '#F8FAFF'
    const borderColor = isVoicemail ? '#C7D2FE' : isBranch ? '#A7F3D0' : isNote ? '#FDE68A' : '#DBEAFE'

    // Split into quoted speech vs stage directions
    const parts = text.split(/("(?:[^"\\]|\\.)*")/g)

    return (
      <div key={i} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 3, height: 16, background: titleColor, borderRadius: 2 }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: titleColor, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
            {s.title}
          </span>
        </div>
        <div style={{
          background: bgColor, border: `1px solid ${borderColor}`,
          borderRadius: '4px 16px 16px 16px', padding: '16px 20px',
          position: 'relative', boxShadow: '0 2px 6px rgba(40,58,151,0.06)',
        }}>
          {/* Bubble tail */}
          <div style={{ position: 'absolute', top: 0, left: -1, width: 0, height: 0, borderTop: `12px solid ${borderColor}`, borderRight: '12px solid transparent' }} />
          <div style={{ position: 'absolute', top: 1, left: 0, width: 0, height: 0, borderTop: `11px solid ${bgColor}`, borderRight: '11px solid transparent' }} />

          <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 15, lineHeight: 1.9, color: C.text, whiteSpace: 'pre-line' }}>
            {parts.map((part, pi) =>
              part.startsWith('"') && part.endsWith('"')
                ? <span key={pi} style={{ fontWeight: 700, color: C.darkBlue }}>{part}</span>
                : <span key={pi} style={{ color: C.textMuted, fontStyle: 'italic', fontSize: 13 }}>{part}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", overflow: 'hidden' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, background: toast.type === 'success' ? '#16a34a' : C.red, color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease' }}>
          {toast.msg}
        </div>
      )}

      {/* Modal no disponible */}
      {showNotAvailable && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,91,0.4)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: 340, boxShadow: '0 20px 60px rgba(15,20,91,0.2)' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.darkBlue, marginBottom: 4 }}>No Disponible</p>
            <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>¿En cuántas horas volver a llamar?</p>
            <input type="number" min="1" max="72" value={notAvailableHours} onChange={e => setNotAvailableHours(e.target.value)} placeholder="ej: 2"
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 14, marginBottom: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNotAvailable(false)} style={{ flex: 1, padding: '9px 0', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMuted, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 500 }}>Cancelar</button>
              <button onClick={confirmNotAvailable} style={{ flex: 1, padding: '9px 0', background: C.red, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 700 }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <div style={{ width: 224, background: C.sidebar, display: 'flex', flexDirection: 'column', flexShrink: 0, boxShadow: '2px 0 12px rgba(15,20,91,0.2)' }}>
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: C.red, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💬</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.05em', lineHeight: 1.2 }}>TALK ENGLISH</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em' }}>ACADEMY · PIPELINE</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          {loading
            ? <div style={{ padding: 16, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Cargando...</div>
            : stages.length === 0
              ? <div style={{ padding: 16, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Sin stages.</div>
              : stages.map(stage => {
                const count = stageLeadCount(stage.id)
                const isActive = selectedStage?.id === stage.id
                return (
                  <button key={stage.id} onClick={() => { setSelectedStage(stage); setSelectedLead(null) }}
                    style={{ width: '100%', textAlign: 'left', background: isActive ? C.sidebarActive : 'transparent', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', marginBottom: 2, color: isActive ? '#fff' : 'rgba(255,255,255,0.55)', fontSize: 11.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit', fontWeight: isActive ? 600 : 400 }}>
                    <span>{stage.name}</span>
                    {count > 0 && <span style={{ background: isActive ? C.red : 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, marginLeft: 4 }}>{count}</span>}
                  </button>
                )
              })}
        </div>
        <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={fetchLeads} style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 0', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* ── LEADS LIST ── */}
      <div style={{ width: 264, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, background: C.white }}>
        <div style={{ padding: '14px 12px 10px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: C.darkBlue, marginBottom: 8 }}>
            {selectedStage?.name ?? 'Selecciona un paso'}
            <span style={{ color: C.textLight, fontWeight: 400, marginLeft: 6, fontSize: 11 }}>{leadsInStage.length} leads</span>
          </p>
          <input placeholder="Buscar lead..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 10px', color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {leadsInStage.length === 0
            ? <div style={{ padding: 24, fontSize: 12, color: C.textLight, textAlign: 'center' as const }}>{selectedStage ? 'Sin leads en este paso' : 'Selecciona un paso'}</div>
            : leadsInStage.map(opp => {
              const isSelected = selectedLead?.id === opp.id
              return (
                <div key={opp.id} onClick={() => { setSelectedLead(opp); setActiveTab('script'); setShowVoicemail(false); setShowNotAnswered(false) }}
                  style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, background: isSelected ? '#EEF2FF' : 'transparent', borderLeft: isSelected ? `3px solid ${C.blue}` : '3px solid transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: isSelected ? C.blue : '#E8EDF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: isSelected ? '#fff' : C.blue, flexShrink: 0 }}>
                      {getInitials(opp)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: isSelected ? C.darkBlue : C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getFullName(opp)}</p>
                      <p style={{ fontSize: 10.5, color: C.textLight, marginTop: 1 }}>{opp.contact?.phone ?? '—'}</p>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* ── MAIN PANEL ── */}
      {selectedLead ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg }}>

          {/* Header */}
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, background: C.white, boxShadow: '0 1px 4px rgba(40,58,151,0.06)' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {getInitials(selectedLead)}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.darkBlue }}>{getFullName(selectedLead)}</p>
              <p style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
                {selectedLead.contact?.email ?? '—'} · {selectedLead.contact?.phone ?? '—'}
                {(() => {
                  const appt = getCustomField(selectedLead.contact?.customFields, CF_APPT_DATE)
                  return appt ? <span style={{ marginLeft: 8, color: C.blue, fontWeight: 600 }}>📅 {appt}</span> : null
                })()}
              </p>
            </div>
            <a href={`https://app.funnelup.io/v2/location/${process.env.NEXT_PUBLIC_GHL_LOCATION_ID}/contacts/detail/${selectedLead.contactId}`}
              target="_blank" rel="noopener noreferrer"
              style={{ padding: '7px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.blue, fontSize: 11.5, cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit', fontWeight: 600 }}>
              Ver en FunnelUp ↗
            </a>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, padding: '0 20px', background: C.white }}>
            {(['script', 'activity', 'info'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: '11px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === tab ? `2px solid ${C.red}` : '2px solid transparent', color: activeTab === tab ? C.red : C.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase' as const, marginBottom: '-1px' }}>
                {tab === 'script' ? 'Guion' : tab === 'activity' ? 'Notas' : 'Info'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

            {/* SCRIPT TAB */}
            {activeTab === 'script' && (
              <div>
                {currentScript ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 14px', background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(40,58,151,0.05)' }}>
                      <span style={{ background: C.darkBlue, color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 10.5, fontWeight: 700 }}>{currentScript.stepName}</span>
                      <span style={{ background: '#EEF2FF', color: C.blue, borderRadius: 6, padding: '3px 10px', fontSize: 10.5, fontWeight: 600 }}>⏱ {currentScript.duration}</span>
                      <button onClick={() => setShowVoicemail(!showVoicemail)}
                        style={{ marginLeft: 'auto', background: showVoicemail ? C.blue : C.bg, border: `1px solid ${showVoicemail ? C.blue : C.border}`, borderRadius: 8, padding: '5px 12px', color: showVoicemail ? '#fff' : C.blue, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                        {showVoicemail ? '← Guion' : '📱 Mensaje de Voz'}
                      </button>
                    </div>

                    {showVoicemail
                      ? currentScript.sections.filter(s => s.type === 'voicemail').map((s, i) => renderSection(s, i))
                      : currentScript.sections.filter(s => s.type !== 'voicemail').map((s, i) => renderSection(s, i))
                    }

                    {!showVoicemail && currentScript.answeredOutcomes.length > 0 && (
                      <div style={{ marginTop: 24, background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: '16px 18px' }}>
                        {!showNotAnswered ? (
                          <>
                            <p style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.08em', marginBottom: 12, fontWeight: 700, textTransform: 'uppercase' as const }}>¿Contestó?</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
                              {currentScript.answeredOutcomes.map((o, i) => (
                                <button key={i} onClick={() => handleOutcome(o.action, o.label)}
                                  style={{ padding: '10px 12px', background: `${outcomeColor(o.color)}15`, border: `1.5px solid ${outcomeColor(o.color)}`, borderRadius: 8, color: outcomeColor(o.color), fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                                  {o.label}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => setShowNotAnswered(true)}
                              style={{ width: '100%', padding: '9px 0', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMuted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                              No contestó →
                            </button>
                          </>
                        ) : (
                          <>
                            <p style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.08em', marginBottom: 12, fontWeight: 700, textTransform: 'uppercase' as const }}>No Contestó — ¿Qué Pasó?</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
                              {currentScript.notAnsweredOutcomes.map((o, i) => (
                                <button key={i} onClick={() => handleOutcome(o.action, o.label)}
                                  style={{ padding: '10px 12px', background: `${outcomeColor(o.color)}15`, border: `1.5px solid ${outcomeColor(o.color)}`, borderRadius: 8, color: outcomeColor(o.color), fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                                  {o.label}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => setShowNotAnswered(false)}
                              style={{ width: '100%', padding: '9px 0', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMuted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                              ← Contestó
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: 32, textAlign: 'center' as const, color: C.textLight, fontSize: 13, background: C.white, borderRadius: 12, border: `1px solid ${C.border}` }}>
                    No hay guion para este paso.<br />
                    <span style={{ fontSize: 11, display: 'block', marginTop: 6 }}>Stage: {selectedStage?.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* NOTES TAB */}
            {activeTab === 'activity' && (
              <div>
                <div style={{ marginBottom: 16, background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 16px' }}>
                  <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Escribir nota sobre este lead..." rows={3}
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' as const }} />
                  <button onClick={saveNote} disabled={noteSaving || !newNote.trim()}
                    style={{ marginTop: 8, padding: '8px 18px', background: newNote.trim() ? C.blue : C.bg, border: `1px solid ${newNote.trim() ? C.blue : C.border}`, borderRadius: 8, color: newNote.trim() ? '#fff' : C.textLight, fontSize: 12, cursor: newNote.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 700 }}>
                    {noteSaving ? 'Guardando...' : 'Guardar nota'}
                  </button>
                </div>
                {notes.length === 0
                  ? <p style={{ fontSize: 12, color: C.textLight, textAlign: 'center' as const, paddingTop: 20 }}>Sin notas aún</p>
                  : notes.map(note => (
                    <div key={note.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                      <p style={{ fontSize: 11, color: C.textLight, marginBottom: 6 }}>
                        {new Date(note.dateAdded).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{note.body}</p>
                    </div>
                  ))}
              </div>
            )}

            {/* INFO TAB */}
            {activeTab === 'info' && (
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                {[
                  ['Nombre', getFullName(selectedLead)],
                  ['Email', selectedLead.contact?.email ?? '—'],
                  ['Teléfono', selectedLead.contact?.phone ?? '—'],
                  ['Zona Horaria', selectedLead.contact?.timezone ?? '—'],
                  ['Fecha de Cita', getCustomField(selectedLead.contact?.customFields, CF_APPT_DATE) || '—'],
                  ['Fuente', selectedLead.source ?? '—'],
                  ['Pipeline Stage', selectedStage?.name ?? '—'],
                  ['Valor', selectedLead.monetaryValue ? `$${selectedLead.monetaryValue}` : '$0'],
                  ['Status', selectedLead.status ?? '—'],
                  ['Creado', selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString('es-ES') : '—'],
                ].map(([label, value], idx) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '11px 16px', borderBottom: idx < 9 ? `1px solid ${C.border}` : 'none', background: idx % 2 === 0 ? C.white : '#FAFBFF' }}>
                    <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 12, color: C.darkBlue, fontWeight: 600, textAlign: 'right' as const, maxWidth: '60%' }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, background: C.bg }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.white, border: `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📞</div>
          <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 500 }}>Selecciona un lead para comenzar</p>
          <p style={{ fontSize: 11, color: C.textLight }}>Talk English Academy · Setter Dashboard</p>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #DDE3F0; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #4789C8; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        input::placeholder, textarea::placeholder { color: #9CA3AF; }
      `}</style>
    </div>
  )
}