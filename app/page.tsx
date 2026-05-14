'use client'

import { useState, useEffect, useCallback } from 'react'
import { SCRIPTS, Script, ScriptSection, WidgetType } from '@/data/scripts'

// ── Constants ─────────────────────────────────────────────────────────────
const CF_APPT_DATE  = 'S7k7o99V2UuNQUQFL9lY'
const CAL_QUAL_ID   = 'F2w9oEqTQjYlwpieh0mc'
const CAL_SALES_ID  = 'DX1pbtzm6YUeytHYMjzW'
const TRIGGER_4STEP = '{{trigger_link.1fTRhi46XGaSg3L7dQNV}}'

// Stage name → ID mapping (populated from API)
// Outcome → tags mapping
const OUTCOME_TAGS: Record<string, string[]> = {
  appt_booked_qual:  ['lead_booked_qual', 'call_answered'],
  appt_booked_sales: ['lead_booked_sales', 'call_answered', 'salescall-confirmed'],
  not_available:     ['call_answered'],
  not_interested:    ['call_not_interested', 'lead_closed_lost'],
  wrong_number:      ['call_wrong_number'],
  confirmed:         ['call_answered'],
  reschedule:        ['call_answered'],
  no_show_qual:      ['lead_no_show_qual', 'call_no_answer'],
  no_show_sales:     ['lead_no_show_sales', 'call_no_answer'],
  left_message:      ['call_left_voicemail'],
  hung_up:           ['call_no_answer'],
  inscribed:         ['lead_closed_won', 'tea-student'],
  qualified:         ['califica', 'lead_qualified'],
  not_qualified:     ['no califica', 'lead_not_qualified'],
}

const PAYMENT_MESSAGES = {
  zelle: (name: string) =>
`💳 *Datos de Pago — Zelle*

Hola ${name}, aquí están los datos para procesar tu pago:

*Zelle*
👤 Nombre: Orlando Garrido
📧 Email: orlandogarrido1310@gmail.com
📱 Teléfono: +1 689 280 9986

✅ Una vez realizado el pago, envíame la captura de pantalla de la confirmación por este WhatsApp y te doy acceso inmediato al Portal de Miembros.

¡Gracias ${name}! Estamos muy emocionados de trabajar contigo. 🚀`,
  paypal: (name: string) =>
`💳 *Datos de Pago — PayPal*

Hola ${name}, aquí están los datos para procesar tu pago:

*PayPal*
🔗 Link: https://www.paypal.me/LuisGnzlz

✅ Una vez realizado el pago, envíame la captura de pantalla de la confirmación por este WhatsApp y te doy acceso inmediato al Portal de Miembros.

¡Gracias ${name}! Estamos muy emocionados de trabajar contigo. 🚀`,
  binance: (name: string) =>
`💳 *Datos de Pago — Binance Pay*

Hola ${name}, aquí están los datos para procesar tu pago:

*Binance Pay*
📧 Email / ID: personal.luissmedia@gmail.com
🆔 Usuario: User-e2da7

Pasos:
1. Abre tu app de Binance
2. Ve a "Pay" → "Enviar"
3. Busca el email o escanea el QR
4. Ingresa el monto acordado y confirma

✅ Una vez realizado el pago, envíame la captura de pantalla de la confirmación por este WhatsApp y te doy acceso inmediato al Portal de Miembros.

¡Gracias ${name}! Estamos muy emocionados de trabajar contigo. 🚀`,
}

// ── Types ─────────────────────────────────────────────────────────────────
type CustomField = { id: string; value: string | number }
type Opportunity = {
  id: string; name: string; contactId: string; pipelineStageId: string; status: string
  contact?: { firstName?: string; lastName?: string; email?: string; phone?: string; timezone?: string; dateAdded?: string; customFields?: CustomField[] }
  monetaryValue?: number; source?: string; createdAt?: string
}
type Stage = { id: string; name: string }
type Note  = { id: string; body: string; dateAdded: string }

// Dial session stats
type DialStats = {
  total: number; answered: number; notAnswered: number; booked: number
  notInterested: number; voicemail: number; wrongNumber: number; noAvailable: number
  startTime: number; endTime?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────
function getCF(fields: CustomField[] | undefined, id: string): string {
  return fields?.find(f => f.id === id) ? String(fields.find(f => f.id === id)!.value) : ''
}

function resolveVars(text: string, lead: Opportunity | null): string {
  if (!lead) return text
  const c = lead.contact ?? {}
  const firstName = c.firstName ?? ''
  const lastName  = c.lastName  ?? ''
  const apptRaw   = getCF(c.customFields, CF_APPT_DATE)
  let apptDate = '', apptTime = ''
  if (apptRaw) {
    const m = apptRaw.match(/^(.+?)\s+(\d{1,2}:\d{2})$/)
    if (m) { apptDate = m[1].trim(); apptTime = m[2].trim() }
    else apptDate = apptRaw
  }
  const regDate = c.dateAdded
    ? new Date(c.dateAdded).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const map: Record<string,string> = {
    '{Primer Nombre}': firstName, '{Apellido}': lastName,
    '{Nombre Completo}': `${firstName} ${lastName}`.trim(),
    '{Email}': c.email ?? '', '{Teléfono}': c.phone ?? '',
    '{Fecha de Cita}': apptDate, '{Hora de Cita}': apptTime,
    '{Fecha}': apptDate, '{Hora}': apptTime,
    '{Fecha de Registro}': regDate, '{Tu Número}': '+1 689-280-9986',
  }
  return text.replace(/\{[^}]+\}/g, m => { const v = map[m]; return (v === undefined || v === '') ? m : v })
}

// Calculate target stage based on appointment date
function getTargetStageFromAppt(apptRaw: string, stages: Stage[], isQual: boolean): Stage | null {
  if (!apptRaw) return null
  // Parse "lunes, 6 de julio de 2026 8:00"
  const m = apptRaw.match(/^(.+?)\s+(\d{1,2}:\d{2})$/)
  if (!m) return null
  const dateStr = m[1].trim()
  const timeStr = m[2].trim()
  // Build a parseable date
  const monthMap: Record<string,string> = {
    'enero':'01','febrero':'02','marzo':'03','abril':'04','mayo':'05','junio':'06',
    'julio':'07','agosto':'08','septiembre':'09','octubre':'10','noviembre':'11','diciembre':'12'
  }
  const parts = dateStr.replace(/^[^,]+,\s*/, '').split(' de ')
  if (parts.length < 3) return null
  const day = parts[0].trim().padStart(2, '0')
  const month = monthMap[parts[1].trim().toLowerCase()] || '01'
  const year = parts[2].trim()
  const apptDate = new Date(`${year}-${month}-${day}T${timeStr.padStart(5,'0')}:00`)
  const now = new Date()
  const diffHours = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60)

  const prefix = isQual ? 'qual' : 'sales'
  if (diffHours >= 36) return stages.find(s => s.name.toLowerCase().includes(`48`) && s.name.toLowerCase().includes(prefix)) ?? null
  if (diffHours >= 12) return stages.find(s => s.name.toLowerCase().includes(`24`) && s.name.toLowerCase().includes(prefix)) ?? null
  return stages.find(s => s.name.toLowerCase().includes(`day`) && s.name.toLowerCase().includes(prefix)) ?? null
}

function parse4StepProgress(notes: Note[]): number {
  let maxStep = 0
  for (const note of notes) {
    const b = note.body.toLowerCase()
    if (b.includes('logged in') || b.includes('inició sesión')) maxStep = Math.max(maxStep, 1)
    if (b.includes('paso 1') || b.includes('step 1') || b.includes('prostep-1')) maxStep = Math.max(maxStep, 1)
    if (b.includes('paso 2') || b.includes('step 2') || b.includes('prostep-2')) maxStep = Math.max(maxStep, 2)
    if (b.includes('paso 3') || b.includes('step 3') || b.includes('prostep-3')) maxStep = Math.max(maxStep, 3)
    if (b.includes('paso 4') || b.includes('step 4') || b.includes('cita confirmada') || b.includes('salescall-confirmed')) maxStep = Math.max(maxStep, 4)
  }
  return maxStep
}

const C = {
  red:'#EA0029', blue:'#283A97', darkBlue:'#0F145B', white:'#FFFFFF', bg:'#F4F6FB',
  sidebar:'#0F145B', sidebarActive:'#283A97', border:'#DDE3F0',
  text:'#1a1e3a', textMuted:'#6B7280', textLight:'#9CA3AF', green:'#16a34a',
}
const outcomeColor = (color: string) =>
  ({ green:C.green, yellow:'#d97706', red:C.red, blue:C.blue }[color] || C.textMuted)

// ── 4-Step Widget ─────────────────────────────────────────────────────────
function FourStepWidget({ completedStep }: { completedStep: number }) {
  const steps = ['Descripción General','Requisitos','Cuestionario','Cita Confirmada']
  return (
    <div style={{ background:'#F0F9FF', border:'1px solid #BAE6FD', borderRadius:10, padding:'12px 16px', marginBottom:16 }}>
      <p style={{ fontSize:10, fontWeight:700, color:'#0369A1', letterSpacing:'0.08em', textTransform:'uppercase' as const, marginBottom:10 }}>📋 Portal de Miembros — Progreso</p>
      <div style={{ display:'flex', gap:6 }}>
        {steps.map((step, i) => {
          const num = i+1; const done = num <= completedStep; const current = num === completedStep+1
          return (
            <div key={i} style={{ flex:1, textAlign:'center' as const }}>
              <div style={{ width:28, height:28, borderRadius:'50%', margin:'0 auto 4px', background:done?C.green:current?'#FEF3C7':'#E5E7EB', border:`2px solid ${done?C.green:current?'#F59E0B':'#D1D5DB'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:done?'#fff':current?'#92400E':C.textLight }}>
                {done?'✓':num}
              </div>
              <p style={{ fontSize:9, color:done?C.green:current?'#92400E':C.textLight, lineHeight:1.3, fontWeight:done?700:400 }}>{step}</p>
            </div>
          )
        })}
      </div>
      {completedStep===4 && <div style={{ marginTop:8, background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:6, padding:'6px 10px', fontSize:11, color:'#166534', fontWeight:600, textAlign:'center' as const }}>✅ Portal completo — ¡Listo para la llamada!</div>}
    </div>
  )
}

// ── Booking Modal ─────────────────────────────────────────────────────────
function BookingModal({ calId, lead, onClose, title }: { calId:string; lead:Opportunity; onClose:()=>void; title:string }) {
  const { firstName='', lastName='', email='', phone='' } = lead.contact ?? {}
  const url = `https://api.funnelup.io/widget/booking/${calId}?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,20,91,0.5)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
      <div style={{ background:C.white, borderRadius:16, width:'90%', maxWidth:720, height:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(15,20,91,0.3)', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:`1px solid ${C.border}`, background:C.darkBlue }}>
          <div>
            <p style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{title}</p>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:2 }}>{firstName} {lastName} · {email}</p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, padding:'6px 12px', color:'#fff', cursor:'pointer', fontSize:13, fontFamily:'inherit', fontWeight:600 }}>✕ Cerrar</button>
        </div>
        <iframe src={url} style={{ flex:1, border:'none', width:'100%' }} title="Booking Calendar" />
      </div>
    </div>
  )
}

// ── Dial Session Stats Screen ─────────────────────────────────────────────
function DialStatsScreen({ stats, onClose }: { stats: DialStats; onClose: () => void }) {
  const duration = stats.endTime ? Math.round((stats.endTime - stats.startTime) / 60000) : 0
  const convRate = stats.total > 0 ? Math.round((stats.booked / stats.total) * 100) : 0
  const answerRate = stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0

  const items = [
    { label: 'Total llamados', value: stats.total, color: C.darkBlue },
    { label: 'Contestaron', value: stats.answered, color: C.green },
    { label: 'No contestaron', value: stats.notAnswered, color: C.textMuted },
    { label: 'Citas agendadas', value: stats.booked, color: '#7C3AED' },
    { label: 'No interesados', value: stats.notInterested, color: C.red },
    { label: 'Buzón de voz', value: stats.voicemail, color: '#d97706' },
    { label: 'No disponibles', value: stats.noAvailable, color: '#0284C7' },
    { label: 'Número equivocado', value: stats.wrongNumber, color: C.textMuted },
  ]

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,20,91,0.6)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }}>
      <div style={{ background:C.white, borderRadius:20, width:'90%', maxWidth:520, padding:32, boxShadow:'0 32px 80px rgba(15,20,91,0.35)' }}>
        <div style={{ textAlign:'center' as const, marginBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>📊</div>
          <p style={{ fontSize:20, fontWeight:800, color:C.darkBlue }}>Sesión Completada</p>
          <p style={{ fontSize:13, color:C.textMuted, marginTop:4 }}>Duración total: <strong>{duration} minutos</strong></p>
        </div>

        {/* Key metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
          {[
            { label: 'Tasa de respuesta', value: `${answerRate}%`, color: C.green },
            { label: 'Conversión', value: `${convRate}%`, color: '#7C3AED' },
            { label: 'Citas', value: stats.booked, color: C.blue },
          ].map((m, i) => (
            <div key={i} style={{ background:C.bg, borderRadius:12, padding:'14px 10px', textAlign:'center' as const, border:`2px solid ${m.color}20` }}>
              <p style={{ fontSize:24, fontWeight:800, color:m.color }}>{m.value}</p>
              <p style={{ fontSize:10, color:C.textMuted, marginTop:2, lineHeight:1.3 }}>{m.label}</p>
            </div>
          ))}
        </div>

        {/* Detail list */}
        <div style={{ background:C.bg, borderRadius:12, overflow:'hidden', marginBottom:20 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 16px', borderBottom:i<items.length-1?`1px solid ${C.border}`:'none' }}>
              <span style={{ fontSize:12, color:C.textMuted }}>{item.label}</span>
              <span style={{ fontSize:14, fontWeight:700, color:item.color }}>{item.value}</span>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ width:'100%', padding:'12px 0', background:C.blue, border:'none', borderRadius:12, color:'#fff', fontSize:14, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

// ── Dial Session Selector ─────────────────────────────────────────────────
function DialSessionSelector({ leads, stageName, onStart, onCancel }: {
  leads: Opportunity[]; stageName: string; onStart: (selected: Opportunity[]) => void; onCancel: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => selected.size === leads.length ? setSelected(new Set()) : setSelected(new Set(leads.map(l => l.id)))
  const selectedLeads = leads.filter(l => selected.has(l.id))
  const estMin = selectedLeads.length * 3 // ~3 min per lead

  const getName = (o: Opportunity) => (o.contact?.firstName || o.contact?.lastName)
    ? `${o.contact?.firstName ?? ''} ${o.contact?.lastName ?? ''}`.trim() : o.name

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,20,91,0.6)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }}>
      <div style={{ background:C.white, borderRadius:20, width:'90%', maxWidth:480, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(15,20,91,0.35)', overflow:'hidden' }}>
        <div style={{ padding:'20px 24px 16px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <span style={{ fontSize:22 }}>📞</span>
            <p style={{ fontSize:16, fontWeight:800, color:C.darkBlue }}>Nueva Dial Session</p>
          </div>
          <p style={{ fontSize:12, color:C.textMuted }}>Paso: <strong>{stageName}</strong> · {leads.length} leads disponibles</p>
        </div>

        {/* Select all */}
        <div style={{ padding:'10px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:12, fontWeight:600, color:C.darkBlue }}>
            <input type="checkbox" checked={selected.size===leads.length && leads.length>0} onChange={toggleAll}
              style={{ width:16, height:16, cursor:'pointer' }} />
            Seleccionar todos
          </label>
          {selected.size > 0 && (
            <span style={{ fontSize:11, color:C.blue, fontWeight:600 }}>
              {selected.size} seleccionados · ~{estMin} min
            </span>
          )}
        </div>

        {/* Lead list */}
        <div style={{ overflowY:'auto', flex:1 }}>
          {leads.map(lead => {
            const isSel = selected.has(lead.id)
            const appt = getCF(lead.contact?.customFields, CF_APPT_DATE)
            return (
              <label key={lead.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 24px', borderBottom:`1px solid ${C.border}`, cursor:'pointer', background:isSel?'#EEF2FF':'transparent' }}>
                <input type="checkbox" checked={isSel} onChange={() => toggle(lead.id)} style={{ width:16, height:16, cursor:'pointer', flexShrink:0 }} />
                <div style={{ width:32, height:32, borderRadius:'50%', background:isSel?C.blue:'#E8EDF8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:isSel?'#fff':C.blue, flexShrink:0 }}>
                  {((lead.contact?.firstName?.[0]??'')+(lead.contact?.lastName?.[0]??'')).toUpperCase() || '?'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:isSel?C.darkBlue:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{getName(lead)}</p>
                  <p style={{ fontSize:10, color:C.textLight }}>{lead.contact?.phone ?? '—'}{appt ? ` · 📅 ${appt}` : ''}</p>
                </div>
                {lead.contact?.phone && (
                  <a href={`tel:${lead.contact.phone}`} onClick={e => e.stopPropagation()}
                    style={{ padding:'4px 10px', background:C.green, borderRadius:6, color:'#fff', fontSize:10, fontWeight:700, textDecoration:'none', flexShrink:0, whiteSpace:'nowrap' as const }}>
                    📞
                  </a>
                )}
              </label>
            )
          })}
        </div>

        <div style={{ padding:'16px 24px', borderTop:`1px solid ${C.border}`, display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:'11px 0', background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, color:C.textMuted, cursor:'pointer', fontSize:13, fontFamily:'inherit', fontWeight:600 }}>Cancelar</button>
          <button onClick={() => onStart(selectedLeads)} disabled={selected.size===0}
            style={{ flex:2, padding:'11px 0', background:selected.size>0?C.red:'#D1D5DB', border:'none', borderRadius:10, color:'#fff', cursor:selected.size>0?'pointer':'not-allowed', fontSize:13, fontFamily:'inherit', fontWeight:700 }}>
            {selected.size > 0 ? `▶ Iniciar sesión (${selected.size} leads)` : 'Selecciona leads'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stages, setStages]               = useState<Stage[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [selectedLead, setSelectedLead]   = useState<Opportunity | null>(null)
  const [activeTab, setActiveTab]         = useState<'script'|'activity'|'info'>('script')
  const [notes, setNotes]                 = useState<Note[]>([])
  const [newNote, setNewNote]             = useState('')
  const [loading, setLoading]             = useState(true)
  const [noteSaving, setNoteSaving]       = useState(false)
  const [showVoicemail, setShowVoicemail] = useState(false)
  const [showNotAnswered, setShowNotAnswered] = useState(false)
  const [notAvailHours, setNotAvailHours] = useState('')
  const [showNotAvail, setShowNotAvail]   = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')
  const [toast, setToast]                 = useState<{msg:string;type:'success'|'error'}|null>(null)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [moveTargetStage, setMoveTargetStage] = useState<Stage|null>(null)
  const [moving, setMoving]               = useState(false)
  const [bookingModal, setBookingModal]   = useState<{calId:string;title:string}|null>(null)
  const [sendingWA, setSendingWA]         = useState<string|null>(null)
  const [refreshing, setRefreshing]       = useState(false)
  // Dial session state
  const [showDialSelector, setShowDialSelector]   = useState(false)
  const [dialQueue, setDialQueue]                 = useState<Opportunity[]>([])
  const [dialIndex, setDialIndex]                 = useState(0)
  const [dialActive, setDialActive]               = useState(false)
  const [dialStats, setDialStats]                 = useState<DialStats|null>(null)
  const [showDialStats, setShowDialStats]         = useState(false)
  const [currentDialStats, setCurrentDialStats]   = useState<DialStats>({ total:0, answered:0, notAnswered:0, booked:0, notInterested:0, voicemail:0, wrongNumber:0, noAvailable:0, startTime:0 })

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const fetchLeads = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    try {
      const res = await fetch('/api/leads')
      const data = await res.json()
      const newOpps: Opportunity[] = data.opportunities || []
      const newStages: Stage[] = data.stages || []
      setStages(newStages)
      setOpportunities(newOpps)
      if (newStages.length > 0 && !selectedStage) setSelectedStage(newStages[0])
      setSelectedLead(prev => prev ? (newOpps.find(o => o.id === prev.id) ?? prev) : prev)
      if (isRefresh) showToast('✓ Datos actualizados')
    } catch { showToast('Error cargando leads', 'error') }
    finally { if (isRefresh) setRefreshing(false); else setLoading(false) }
  }, [selectedStage])

  useEffect(() => { fetchLeads() }, [])

  const fetchNotes = useCallback(async (contactId: string) => {
    try { const r = await fetch(`/api/notes?contactId=${contactId}`); const d = await r.json(); setNotes(d.notes||[]) }
    catch { setNotes([]) }
  }, [])

  useEffect(() => { if (selectedLead?.contactId) fetchNotes(selectedLead.contactId) }, [selectedLead, fetchNotes])

  const leadsInStage = opportunities
    .filter(o => o.pipelineStageId === selectedStage?.id)
    .filter(o => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      const n = `${o.contact?.firstName??''} ${o.contact?.lastName??''}`.toLowerCase()
      return n.includes(q) || o.contact?.email?.toLowerCase().includes(q) || false
    })

  const getScriptForStage = (stageName: string): Script | null => {
    const n = stageName.toLowerCase()
    for (const [key, script] of Object.entries(SCRIPTS)) {
      if (n.includes(key.replace(/-/g,' ').toLowerCase())) return script
      if (script.stepName.toLowerCase() === n) return script
    }
    const m: Record<string,string> = {
      'opt-in':'opt-in-lead','optin':'opt-in-lead',
      '48h qual':'confirm-qual-48h','qual call 48':'confirm-qual-48h',
      '24h qual':'confirm-qual-24h','qual call 24':'confirm-qual-24h',
      'day off qual':'confirm-qual-dayoff','qual call day':'confirm-qual-dayoff',
      'qualification call':'qualification-call','rebook qual':'rebook-qual-call',
      'qual follow':'qual-call-followup','48h sales':'confirm-sales-48h',
      'sales call 48':'confirm-sales-48h','24h sales':'confirm-sales-24h',
      'sales call 24':'confirm-sales-24h','day off sales':'confirm-sales-dayoff',
      'sales call day':'confirm-sales-dayoff','sales call':'sales-call',
      'rebook sales':'rebook-sales-call','sales follow':'sales-call-followup',
      'tea students':'tea-students',
    }
    for (const [p,k] of Object.entries(m)) if (n.includes(p)) return SCRIPTS[k]
    return null
  }

  const currentScript = selectedStage ? getScriptForStage(selectedStage.name) : null
  const fourStepProgress = parse4StepProgress(notes)
  const showFourStep = selectedStage ? ['qualification call','confirm: sales','sales call','rebook sales','qual call follow','tea students'].some(k => selectedStage.name.toLowerCase().includes(k.toLowerCase())) : false

  // ── Move lead ─────────────────────────────────────────────────────────
  const initiateMove = (stage: Stage) => { setMoveTargetStage(stage); setShowMoveModal(true) }
  const confirmMove  = async () => {
    if (!selectedLead || !moveTargetStage) return
    setMoving(true)
    try {
      const res = await fetch('/api/opportunity', {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ opportunityId: selectedLead.id, stageId: moveTargetStage.id }),
      })
      if (!res.ok) throw new Error()
      setOpportunities(prev => prev.map(o => o.id===selectedLead.id ? {...o, pipelineStageId:moveTargetStage.id} : o))
      setSelectedLead(prev => prev ? {...prev, pipelineStageId:moveTargetStage.id} : prev)
      setSelectedStage(moveTargetStage)
      showToast(`✓ Movido a: ${moveTargetStage.name}`)
    } catch { showToast('Error al mover el lead', 'error') }
    finally { setMoving(false); setShowMoveModal(false); setMoveTargetStage(null) }
  }

  // ── Add tags ──────────────────────────────────────────────────────────
  const addTags = async (contactId: string, tags: string[]) => {
    if (!tags.length) return
    await fetch('/api/tags', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ contactId, tags }),
    }).catch(() => {})
  }

  // ── Auto-move after outcome ───────────────────────────────────────────
  const autoMoveAfterOutcome = async (lead: Opportunity, action: string) => {
    const stageName = selectedStage?.name.toLowerCase() ?? ''
    const isQualStep = stageName.includes('opt-in') || stageName.includes('qual')
    const isSalesStep = stageName.includes('sales') && !stageName.includes('qual')

    let targetStage: Stage | null = null

    if (action === 'appt_booked' || action === 'appt_booked_qual') {
      const appt = getCF(lead.contact?.customFields, CF_APPT_DATE)
      targetStage = getTargetStageFromAppt(appt, stages, true)
    } else if (action === 'appt_booked_sales') {
      const appt = getCF(lead.contact?.customFields, CF_APPT_DATE)
      targetStage = getTargetStageFromAppt(appt, stages, false)
    } else if (action === 'no_show') {
      if (isQualStep) targetStage = stages.find(s => s.name.toLowerCase().includes('rebook qual')) ?? null
      if (isSalesStep) targetStage = stages.find(s => s.name.toLowerCase().includes('rebook sales')) ?? null
    } else if (action === 'inscribed') {
      targetStage = stages.find(s => s.name.toLowerCase().includes('tea student')) ?? null
    }

    if (targetStage && targetStage.id !== lead.pipelineStageId) {
      await fetch('/api/opportunity', {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ opportunityId: lead.id, stageId: targetStage.id }),
      }).catch(() => {})
      setOpportunities(prev => prev.map(o => o.id===lead.id ? {...o, pipelineStageId:targetStage!.id} : o))
      if (selectedLead?.id === lead.id) {
        setSelectedLead(prev => prev ? {...prev, pipelineStageId:targetStage!.id} : prev)
        setSelectedStage(targetStage)
      }
      showToast(`↗ Movido a: ${targetStage.name}`)
    }
  }

  // ── Notes ─────────────────────────────────────────────────────────────
  const saveNote = async () => {
    if (!newNote.trim() || !selectedLead?.contactId) return
    setNoteSaving(true)
    try {
      const res = await fetch('/api/notes', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contactId: selectedLead.contactId, body: newNote }),
      })
      if (res.ok) { setNewNote(''); fetchNotes(selectedLead.contactId); showToast('Nota guardada') }
    } catch { showToast('Error','error') }
    finally { setNoteSaving(false) }
  }

  // ── Outcome handler ───────────────────────────────────────────────────
  const handleOutcome = async (action: string, label: string, lead?: Opportunity) => {
    const targetLead = lead ?? selectedLead
    if (!targetLead) return
    if (action === 'not_available') { setShowNotAvail(true); return }

    const stageName = selectedStage?.name ?? ''
    const txt = `[${new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}] ${label} — ${stageName}`

    // Determine tag key
    const isQual = stageName.toLowerCase().includes('qual') || stageName.toLowerCase().includes('opt')
    const isSales = stageName.toLowerCase().includes('sales')
    let tagKey = action
    if (action === 'appt_booked' && isQual) tagKey = 'appt_booked_qual'
    if (action === 'appt_booked' && isSales) tagKey = 'appt_booked_sales'
    if (action === 'no_show' && isQual) tagKey = 'no_show_qual'
    if (action === 'no_show' && isSales) tagKey = 'no_show_sales'

    // Save note + add tags in parallel
    await Promise.all([
      fetch('/api/notes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contactId: targetLead.contactId, body: txt }) }),
      addTags(targetLead.contactId, OUTCOME_TAGS[tagKey] ?? []),
    ])

    // Auto-move
    await autoMoveAfterOutcome(targetLead, tagKey)

    showToast(`✓ ${label}`)
    if (targetLead.contactId) fetchNotes(targetLead.contactId)
    setShowNotAnswered(false)

    // Update dial stats if in session
    if (dialActive) {
      setCurrentDialStats(prev => {
        const isAnswered = !['left_message','no_show_qual','no_show_sales','hung_up'].includes(tagKey)
        return {
          ...prev,
          answered: isAnswered ? prev.answered+1 : prev.answered,
          notAnswered: !isAnswered ? prev.notAnswered+1 : prev.notAnswered,
          booked: (tagKey==='appt_booked_qual'||tagKey==='appt_booked_sales') ? prev.booked+1 : prev.booked,
          notInterested: tagKey==='not_interested' ? prev.notInterested+1 : prev.notInterested,
          voicemail: tagKey==='left_message' ? prev.voicemail+1 : prev.voicemail,
          wrongNumber: tagKey==='wrong_number' ? prev.wrongNumber+1 : prev.wrongNumber,
          noAvailable: tagKey==='not_available' ? prev.noAvailable+1 : prev.noAvailable,
        }
      })
      // Advance to next lead in dial
      advanceDialQueue()
    }
  }

  // ── No Disponible confirm ─────────────────────────────────────────────
  const confirmNotAvail = async () => {
    if (!selectedLead || !notAvailHours) return
    const hours = parseFloat(notAvailHours)
    const txt = `[${new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}] No Disponible — Llamar en ${notAvailHours} horas`

    await Promise.all([
      fetch('/api/notes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contactId: selectedLead.contactId, body: txt }) }),
      addTags(selectedLead.contactId, OUTCOME_TAGS['not_available'] ?? []),
      fetch('/api/reminder', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          leadName: `${selectedLead.contact?.firstName??''} ${selectedLead.contact?.lastName??''}`.trim() || selectedLead.name,
          leadPhone: selectedLead.contact?.phone ?? '—',
          stepName: selectedStage?.name ?? '—',
          hours,
          contactId: selectedLead.contactId,
        }),
      }),
    ])

    showToast(`⏰ Recordatorio en ${notAvailHours}h enviado a tu WhatsApp`)
    setShowNotAvail(false); setNotAvailHours('')

    if (dialActive) advanceDialQueue()
  }

  // ── WhatsApp send ──────────────────────────────────────────────────────
  const sendWhatsApp = async (type: 'zelle'|'paypal'|'binance'|'4step') => {
    if (!selectedLead?.contactId) return
    const firstName = selectedLead.contact?.firstName ?? 'estudiante'
    setSendingWA(type)
    let message = type === '4step'
      ? `Hola ${firstName}, aquí está el enlace para acceder al Portal de Miembros de Talk English Academy:\n\n${TRIGGER_4STEP}\n\nHaz clic en el enlace, ingresa con tu correo y completa los 4 pasos antes de tu próxima cita. ¡Cualquier duda me avisas!`
      : PAYMENT_MESSAGES[type](firstName)
    try {
      const res = await fetch('/api/whatsapp', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contactId: selectedLead.contactId, phone: selectedLead.contact?.phone, message }),
      })
      if (res.ok) showToast(`✓ WhatsApp enviado (${type==='4step'?'Portal':type.toUpperCase()})`)
      else showToast('Error enviando WhatsApp', 'error')
    } catch { showToast('Error enviando WhatsApp', 'error') }
    finally { setSendingWA(null) }
  }

  // ── Dial Session ──────────────────────────────────────────────────────
  const startDialSession = (selected: Opportunity[]) => {
    setDialQueue(selected)
    setDialIndex(0)
    setDialActive(true)
    setShowDialSelector(false)
    setCurrentDialStats({ total: selected.length, answered:0, notAnswered:0, booked:0, notInterested:0, voicemail:0, wrongNumber:0, noAvailable:0, startTime: Date.now() })
    const first = selected[0]
    if (first) { setSelectedLead(first); setActiveTab('script'); setShowVoicemail(false); setShowNotAnswered(false) }
  }

  const advanceDialQueue = () => {
    const nextIndex = dialIndex + 1
    if (nextIndex >= dialQueue.length) {
      // Session complete
      setDialActive(false)
      setCurrentDialStats(prev => { const final = {...prev, endTime: Date.now()}; setDialStats(final); setShowDialStats(true); return final })
      return
    }
    setDialIndex(nextIndex)
    const next = dialQueue[nextIndex]
    setSelectedLead(next); setActiveTab('script'); setShowVoicemail(false); setShowNotAnswered(false)
    setNotes([])
    if (next.contactId) fetchNotes(next.contactId)
  }

  const endDialEarly = () => {
    setDialActive(false)
    const final = {...currentDialStats, endTime: Date.now(), total: dialIndex}
    setDialStats(final); setShowDialStats(true)
  }

  const getInitials = (o: Opportunity) => ((o.contact?.firstName?.[0]??'')+(o.contact?.lastName?.[0]??'')).toUpperCase() || o.name?.[0]?.toUpperCase() || '?'
  const getFullName = (o: Opportunity) => (o.contact?.firstName||o.contact?.lastName) ? `${o.contact?.firstName??''} ${o.contact?.lastName??''}`.trim() : o.name
  const stageCount  = (id: string) => opportunities.filter(o => o.pipelineStageId === id).length

  // ── Inline widget renderer ────────────────────────────────────────────
  const renderWidget = (widget: WidgetType) => {
    if (!selectedLead) return null
    const firstName = selectedLead.contact?.firstName ?? 'el lead'
    if (widget === 'book-qual-call') return (
      <div style={{ marginTop:12, padding:'10px 14px', background:'#EEF2FF', border:'1px solid #C7D2FE', borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:18 }}>📅</span>
        <div style={{ flex:1 }}><p style={{ fontSize:11, fontWeight:700, color:C.blue, marginBottom:2 }}>Agendar Llamada de Calificación</p><p style={{ fontSize:10, color:C.textMuted }}>A nombre de {firstName}</p></div>
        <button onClick={() => setBookingModal({ calId:CAL_QUAL_ID, title:'Agendar Llamada de Calificación' })} style={{ padding:'7px 14px', background:C.blue, border:'none', borderRadius:8, color:'#fff', fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>Abrir Calendario</button>
      </div>
    )
    if (widget === 'reschedule-qual') return (
      <div style={{ marginTop:12, padding:'10px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:18 }}>🔄</span>
        <div style={{ flex:1 }}><p style={{ fontSize:11, fontWeight:700, color:'#92400E', marginBottom:2 }}>Reagendar Llamada de Calificación</p><p style={{ fontSize:10, color:C.textMuted }}>Cambiar la fecha de cita de calificación</p></div>
        <button onClick={() => setBookingModal({ calId:CAL_QUAL_ID, title:'Reagendar Llamada de Calificación' })} style={{ padding:'7px 14px', background:'#D97706', border:'none', borderRadius:8, color:'#fff', fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>Reagendar</button>
      </div>
    )
    if (widget === 'book-sales-call') return (
      <div style={{ marginTop:12, padding:'10px 14px', background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:18 }}>🚀</span>
        <div style={{ flex:1 }}><p style={{ fontSize:11, fontWeight:700, color:'#065F46', marginBottom:2 }}>Agendar Llamada de Ventas</p><p style={{ fontSize:10, color:C.textMuted }}>Sesión Estratégica — a nombre de {firstName}</p></div>
        <button onClick={() => setBookingModal({ calId:CAL_SALES_ID, title:'Agendar Llamada de Ventas' })} style={{ padding:'7px 14px', background:'#059669', border:'none', borderRadius:8, color:'#fff', fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>Abrir Calendario</button>
      </div>
    )
    if (widget === 'reschedule-sales') return (
      <div style={{ marginTop:12, padding:'10px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:18 }}>🔄</span>
        <div style={{ flex:1 }}><p style={{ fontSize:11, fontWeight:700, color:'#92400E', marginBottom:2 }}>Reagendar Llamada de Ventas</p><p style={{ fontSize:10, color:C.textMuted }}>Cambiar la fecha de cita de ventas</p></div>
        <button onClick={() => setBookingModal({ calId:CAL_SALES_ID, title:'Reagendar Llamada de Ventas' })} style={{ padding:'7px 14px', background:'#D97706', border:'none', borderRadius:8, color:'#fff', fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>Reagendar</button>
      </div>
    )
    if (widget === 'send-4step-link') return (
      <div style={{ marginTop:12, padding:'10px 14px', background:'#F0F9FF', border:'1px solid #BAE6FD', borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:18 }}>🔑</span>
        <div style={{ flex:1 }}><p style={{ fontSize:11, fontWeight:700, color:'#0369A1', marginBottom:2 }}>Enviar Link del Portal (4-Step)</p><p style={{ fontSize:10, color:C.textMuted }}>Magic link por WhatsApp a {firstName}</p></div>
        <button onClick={() => sendWhatsApp('4step')} disabled={sendingWA==='4step'} style={{ padding:'7px 14px', background:sendingWA==='4step'?'#6B7280':'#0284C7', border:'none', borderRadius:8, color:'#fff', fontSize:11, cursor:sendingWA==='4step'?'not-allowed':'pointer', fontFamily:'inherit', fontWeight:700 }}>
          {sendingWA==='4step'?'Enviando...':'Enviar por WhatsApp'}
        </button>
      </div>
    )
    if (widget === 'pay-zelle' || widget === 'pay-paypal' || widget === 'pay-binance') return (
      <div style={{ marginTop:12, padding:'12px 14px', background:'#F8FAFF', border:`1px solid ${C.border}`, borderRadius:10 }}>
        <p style={{ fontSize:11, fontWeight:700, color:C.darkBlue, marginBottom:10 }}>💳 Enviar Datos de Pago por WhatsApp</p>
        <div style={{ display:'flex', gap:8 }}>
          {(['zelle','paypal','binance'] as const).map(method => (
            <button key={method} onClick={() => sendWhatsApp(method)} disabled={!!sendingWA}
              style={{ flex:1, padding:'9px 6px', background:sendingWA===method?'#6B7280':method==='zelle'?'#7C3AED':method==='paypal'?'#003087':'#F0B90B', border:'none', borderRadius:8, color:method==='binance'?'#000':'#fff', fontSize:11, cursor:sendingWA?'not-allowed':'pointer', fontFamily:'inherit', fontWeight:700 }}>
              {sendingWA===method?'...':method==='zelle'?'⚡ Zelle':method==='paypal'?'🅿 PayPal':'🟡 Binance'}
            </button>
          ))}
        </div>
      </div>
    )
    return null
  }

  // ── Script bubble renderer ────────────────────────────────────────────
  const renderSection = (s: ScriptSection, i: number) => {
    const text = resolveVars(s.content, selectedLead)
    const vm = s.type==='voicemail', br = s.type==='branch', nt = s.type==='note'
    const tc = vm?C.blue:br?'#059669':nt?'#d97706':C.red
    const bg = vm?'#EEF2FF':br?'#ECFDF5':nt?'#FFFBEB':'#F8FAFF'
    const bd = vm?'#C7D2FE':br?'#A7F3D0':nt?'#FDE68A':'#DBEAFE'
    const parts = text.split(/("(?:[^"\\]|\\.)*")/g)
    return (
      <div key={i} style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <div style={{ width:3, height:16, background:tc, borderRadius:2 }}/>
          <span style={{ fontSize:10, fontWeight:700, color:tc, textTransform:'uppercase' as const, letterSpacing:'0.08em' }}>{s.title}</span>
        </div>
        <div style={{ background:bg, border:`1px solid ${bd}`, borderRadius:'4px 16px 16px 16px', padding:'16px 20px', position:'relative', boxShadow:'0 2px 6px rgba(40,58,151,0.06)' }}>
          <div style={{ position:'absolute', top:0, left:-1, width:0, height:0, borderTop:`12px solid ${bd}`, borderRight:'12px solid transparent' }}/>
          <div style={{ position:'absolute', top:1, left:0, width:0, height:0, borderTop:`11px solid ${bg}`, borderRight:'11px solid transparent' }}/>
          <div style={{ fontFamily:"'Times New Roman',Times,serif", fontSize:15, lineHeight:1.9, color:C.text, whiteSpace:'pre-line' }}>
            {parts.map((p,pi) =>
              p.startsWith('"')&&p.endsWith('"')
                ? <span key={pi} style={{ fontWeight:700, color:C.darkBlue }}>{p}</span>
                : <span key={pi} style={{ color:C.textMuted, fontStyle:'italic', fontSize:13 }}>{p}</span>
            )}
          </div>
        </div>
        {s.widget && renderWidget(s.widget)}
      </div>
    )
  }

  const activeLead = dialActive ? dialQueue[dialIndex] : selectedLead

  // ── UI ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', height:'100vh', background:C.bg, color:C.text, fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", overflow:'hidden' }}>

      {/* Toast */}
      {toast && <div style={{ position:'fixed', top:16, right:16, zIndex:9999, background:toast.type==='success'?C.green:C.red, color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:600, boxShadow:'0 4px 20px rgba(0,0,0,0.2)', animation:'fadeIn 0.2s ease' }}>{toast.msg}</div>}

      {/* Booking Modal */}
      {bookingModal && activeLead && <BookingModal calId={bookingModal.calId} lead={activeLead} title={bookingModal.title} onClose={() => setBookingModal(null)} />}

      {/* Dial Session Selector */}
      {showDialSelector && <DialSessionSelector leads={leadsInStage} stageName={selectedStage?.name??''} onStart={startDialSession} onCancel={() => setShowDialSelector(false)} />}

      {/* Dial Stats */}
      {showDialStats && dialStats && <DialStatsScreen stats={dialStats} onClose={() => { setShowDialStats(false); setDialStats(null); setDialActive(false) }} />}

      {/* Move Modal */}
      {showMoveModal && moveTargetStage && activeLead && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,20,91,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(3px)' }}>
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width:380, boxShadow:'0 24px 60px rgba(15,20,91,0.25)' }}>
            <div style={{ width:48, height:48, background:'#FEF3C7', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:14 }}>⚠️</div>
            <p style={{ fontSize:16, fontWeight:700, color:C.darkBlue, marginBottom:6 }}>¿Mover lead?</p>
            <div style={{ background:C.bg, borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13 }}>
              <span style={{ color:C.textMuted }}>Desde: </span><span style={{ fontWeight:600, color:C.darkBlue }}>{selectedStage?.name}</span>
              <span style={{ color:C.textMuted, margin:'0 8px' }}>→</span>
              <span style={{ fontWeight:700, color:C.blue }}>{moveTargetStage.name}</span>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>{setShowMoveModal(false);setMoveTargetStage(null)}} style={{ flex:1, padding:'10px 0', background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, color:C.textMuted, cursor:'pointer', fontSize:13, fontFamily:'inherit', fontWeight:600 }}>Cancelar</button>
              <button onClick={confirmMove} disabled={moving} style={{ flex:1, padding:'10px 0', background:moving?'#6B7280':C.blue, border:'none', borderRadius:10, color:'#fff', cursor:moving?'not-allowed':'pointer', fontSize:13, fontFamily:'inherit', fontWeight:700 }}>{moving?'Moviendo...':'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* No disponible modal */}
      {showNotAvail && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,20,91,0.4)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(2px)' }}>
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width:340, boxShadow:'0 20px 60px rgba(15,20,91,0.2)' }}>
            <p style={{ fontSize:15, fontWeight:700, color:C.darkBlue, marginBottom:4 }}>No Disponible</p>
            <p style={{ fontSize:12, color:C.textMuted, marginBottom:16 }}>¿En cuántas horas volver a llamar? Te enviaré un recordatorio por WhatsApp.</p>
            <input type="number" min="0.5" max="72" step="0.5" value={notAvailHours} onChange={e=>setNotAvailHours(e.target.value)} placeholder="ej: 2"
              style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', color:C.text, fontSize:14, marginBottom:16, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const }}/>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setShowNotAvail(false)} style={{ flex:1, padding:'9px 0', background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, color:C.textMuted, cursor:'pointer', fontSize:12, fontFamily:'inherit', fontWeight:500 }}>Cancelar</button>
              <button onClick={confirmNotAvail} style={{ flex:1, padding:'9px 0', background:C.red, border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:12, fontFamily:'inherit', fontWeight:700 }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <div style={{ width:224, background:C.sidebar, display:'flex', flexDirection:'column', flexShrink:0, boxShadow:'2px 0 12px rgba(15,20,91,0.2)' }}>
        <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, background:C.red, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>💬</div>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:'#fff', letterSpacing:'0.05em', lineHeight:1.2 }}>TALK ENGLISH</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.45)', letterSpacing:'0.1em' }}>ACADEMY · PIPELINE</div>
            </div>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'10px 8px' }}>
          {loading
            ? <div style={{ padding:16, fontSize:11, color:'rgba(255,255,255,0.3)' }}>Cargando...</div>
            : stages.map(stage => {
              const count = stageCount(stage.id); const isActive = selectedStage?.id===stage.id
              return (
                <button key={stage.id} onClick={()=>{ if(!dialActive){setSelectedStage(stage);setSelectedLead(null)} }}
                  style={{ width:'100%', textAlign:'left', background:isActive?C.sidebarActive:'transparent', border:'none', borderRadius:8, padding:'8px 10px', cursor:dialActive?'default':'pointer', marginBottom:2, color:isActive?'#fff':'rgba(255,255,255,0.55)', fontSize:11.5, display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:'inherit', fontWeight:isActive?600:400 }}>
                  <span>{stage.name}</span>
                  {count>0&&<span style={{ background:isActive?C.red:'rgba(255,255,255,0.12)', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:700, marginLeft:4 }}>{count}</span>}
                </button>
              )
            })}
        </div>
        <div style={{ padding:'10px 8px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column', gap:6 }}>
          <button onClick={()=>fetchLeads(true)} disabled={refreshing||loading}
            style={{ width:'100%', background:refreshing?'rgba(71,137,200,0.25)':'rgba(255,255,255,0.07)', border:`1px solid ${refreshing?'rgba(71,137,200,0.5)':'rgba(255,255,255,0.12)'}`, borderRadius:8, padding:'9px 0', color:refreshing?'#4789C8':'rgba(255,255,255,0.6)', cursor:refreshing?'not-allowed':'pointer', fontSize:11, fontFamily:'inherit', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <span style={{ display:'inline-block', animation:refreshing?'spin 1s linear infinite':'none' }}>↻</span>
            {refreshing?'Actualizando...':'Actualizar'}
          </button>
        </div>
      </div>

      {/* ── LEADS LIST ── */}
      <div style={{ width:264, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flexShrink:0, background:C.white }}>
        <div style={{ padding:'14px 12px 10px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <p style={{ fontSize:12.5, fontWeight:700, color:C.darkBlue }}>
              {selectedStage?.name??'Selecciona un paso'}
              <span style={{ color:C.textLight, fontWeight:400, marginLeft:6, fontSize:11 }}>{leadsInStage.length}</span>
            </p>
            {!dialActive && leadsInStage.length > 0 && (
              <button onClick={() => setShowDialSelector(true)}
                style={{ background:C.red, border:'none', borderRadius:6, padding:'4px 10px', color:'#fff', fontSize:10, cursor:'pointer', fontFamily:'inherit', fontWeight:700, whiteSpace:'nowrap' as const }}>
                📞 Dial
              </button>
            )}
          </div>
          {/* Dial session progress bar */}
          {dialActive && (
            <div style={{ marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <span style={{ fontSize:10, fontWeight:700, color:C.red }}>📞 SESIÓN ACTIVA</span>
                <span style={{ fontSize:10, color:C.textMuted }}>{dialIndex+1}/{dialQueue.length}</span>
              </div>
              <div style={{ height:4, background:'#E5E7EB', borderRadius:2 }}>
                <div style={{ height:'100%', background:C.red, borderRadius:2, width:`${((dialIndex+1)/dialQueue.length)*100}%`, transition:'width 0.3s' }}/>
              </div>
              <button onClick={endDialEarly} style={{ marginTop:6, width:'100%', background:'transparent', border:`1px solid ${C.border}`, borderRadius:6, padding:'4px 0', color:C.textMuted, fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>
                Terminar sesión
              </button>
            </div>
          )}
          <input placeholder="Buscar lead..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
            style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px', color:C.text, fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const }}/>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          {leadsInStage.length===0
            ? <div style={{ padding:24, fontSize:12, color:C.textLight, textAlign:'center' as const }}>{selectedStage?'Sin leads':'Selecciona un paso'}</div>
            : leadsInStage.map(opp => {
              const isActiveDial = dialActive && dialQueue[dialIndex]?.id===opp.id
              const sel = !dialActive && selectedLead?.id===opp.id || isActiveDial
              return (
                <div key={opp.id} onClick={()=>{ if(!dialActive){ setSelectedLead(opp); setActiveTab('script'); setShowVoicemail(false); setShowNotAnswered(false) } }}
                  style={{ padding:'10px 12px', cursor:dialActive?'default':'pointer', borderBottom:`1px solid ${C.border}`, background:isActiveDial?'#FFF1F2':sel?'#EEF2FF':'transparent', borderLeft:isActiveDial?`3px solid ${C.red}`:sel?`3px solid ${C.blue}`:'3px solid transparent' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:isActiveDial?C.red:sel?C.blue:'#E8EDF8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:sel||isActiveDial?'#fff':C.blue, flexShrink:0 }}>
                      {getInitials(opp)}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:sel?C.darkBlue:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{getFullName(opp)}</p>
                      <p style={{ fontSize:10.5, color:C.textLight, marginTop:1 }}>{opp.contact?.phone??'—'}</p>
                    </div>
                    {isActiveDial && <span style={{ fontSize:10, background:C.red, color:'#fff', borderRadius:4, padding:'2px 6px', fontWeight:700, flexShrink:0 }}>EN CURSO</span>}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* ── MAIN PANEL ── */}
      {activeLead ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:C.bg }}>
          {/* Dial session header banner */}
          {dialActive && (
            <div style={{ background:C.red, padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#fff' }}>📞 DIAL SESSION · Lead {dialIndex+1} de {dialQueue.length}</span>
              <div style={{ display:'flex', gap:8 }}>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.8)' }}>Citas: {currentDialStats.booked} · Respuestas: {currentDialStats.answered}</span>
              </div>
            </div>
          )}

          {/* Header */}
          <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12, background:C.white, boxShadow:'0 1px 4px rgba(40,58,151,0.06)' }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', flexShrink:0 }}>
              {getInitials(activeLead)}
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:15, fontWeight:700, color:C.darkBlue }}>{getFullName(activeLead)}</p>
              <p style={{ fontSize:11, color:C.textMuted, marginTop:1, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span>{activeLead.contact?.email??'—'}</span>
                <span>·</span>
                <span>{activeLead.contact?.phone??'—'}</span>
                {getCF(activeLead.contact?.customFields,CF_APPT_DATE)&&<span style={{ background:'#EEF2FF', color:C.blue, borderRadius:6, padding:'1px 8px', fontWeight:600, fontSize:10.5 }}>📅 {getCF(activeLead.contact?.customFields,CF_APPT_DATE)}</span>}
              </p>
            </div>
            {!dialActive && (
              <select onChange={e=>{ const t=stages.find(s=>s.id===e.target.value); if(t&&t.id!==selectedStage?.id) initiateMove(t); e.target.value='' }} defaultValue=""
                style={{ padding:'7px 12px', background:C.white, border:`1px solid ${C.border}`, borderRadius:8, color:C.blue, fontSize:11.5, cursor:'pointer', fontFamily:'inherit', fontWeight:600, outline:'none' }}>
                <option value="" disabled>↕ Mover a...</option>
                {stages.filter(s=>s.id!==selectedStage?.id).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {activeLead.contact?.phone && (
              <a href={`tel:${activeLead.contact.phone}`}
                style={{ padding:'7px 14px', background:C.green, border:'none', borderRadius:8, color:'#fff', fontSize:11.5, textDecoration:'none', fontFamily:'inherit', fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                📞 {activeLead.contact.phone}
              </a>
            )}
            <a href={`https://app.funnelup.io/v2/location/${process.env.NEXT_PUBLIC_GHL_LOCATION_ID}/contacts/detail/${activeLead.contactId}`}
              target="_blank" rel="noopener noreferrer"
              style={{ padding:'7px 14px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, color:C.blue, fontSize:11.5, textDecoration:'none', fontFamily:'inherit', fontWeight:600 }}>
              Ver ↗
            </a>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, padding:'0 20px', background:C.white }}>
            {(['script','activity','info'] as const).map(tab=>(
              <button key={tab} onClick={()=>setActiveTab(tab)}
                style={{ padding:'11px 16px', background:'transparent', border:'none', borderBottom:activeTab===tab?`2px solid ${C.red}`:'2px solid transparent', color:activeTab===tab?C.red:C.textMuted, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.04em', textTransform:'uppercase' as const, marginBottom:'-1px' }}>
                {tab==='script'?'Guion':tab==='activity'?'Notas':'Info'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
            {activeTab==='script'&&(
              <div>
                {showFourStep && <FourStepWidget completedStep={fourStepProgress}/>}
                {currentScript?(
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, padding:'10px 14px', background:C.white, borderRadius:10, border:`1px solid ${C.border}` }}>
                      <span style={{ background:C.darkBlue, color:'#fff', borderRadius:6, padding:'3px 10px', fontSize:10.5, fontWeight:700 }}>{currentScript.stepName}</span>
                      <span style={{ background:'#EEF2FF', color:C.blue, borderRadius:6, padding:'3px 10px', fontSize:10.5, fontWeight:600 }}>⏱ {currentScript.duration}</span>
                      <button onClick={()=>setShowVoicemail(!showVoicemail)}
                        style={{ marginLeft:'auto', background:showVoicemail?C.blue:C.bg, border:`1px solid ${showVoicemail?C.blue:C.border}`, borderRadius:8, padding:'5px 12px', color:showVoicemail?'#fff':C.blue, fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
                        {showVoicemail?'← Guion':'📱 Voz'}
                      </button>
                    </div>
                    {showVoicemail
                      ? currentScript.sections.filter(s=>s.type==='voicemail').map((s,i)=>renderSection(s,i))
                      : currentScript.sections.filter(s=>s.type!=='voicemail').map((s,i)=>renderSection(s,i))
                    }
                    {!showVoicemail&&currentScript.answeredOutcomes.length>0&&(
                      <div style={{ marginTop:24, background:C.white, borderRadius:12, border:`1px solid ${C.border}`, padding:'16px 18px' }}>
                        {!showNotAnswered?(
                          <>
                            <p style={{ fontSize:10, color:C.textMuted, letterSpacing:'0.08em', marginBottom:12, fontWeight:700, textTransform:'uppercase' as const }}>¿Contestó?</p>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:10 }}>
                              {currentScript.answeredOutcomes.map((o,i)=>(
                                <button key={i} onClick={()=>handleOutcome(o.action,o.label)}
                                  style={{ padding:'10px 12px', background:`${outcomeColor(o.color)}15`, border:`1.5px solid ${outcomeColor(o.color)}`, borderRadius:8, color:outcomeColor(o.color), fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>
                                  {o.label}
                                </button>
                              ))}
                            </div>
                            <button onClick={()=>setShowNotAnswered(true)}
                              style={{ width:'100%', padding:'9px 0', background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, color:C.textMuted, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                              No contestó →
                            </button>
                          </>
                        ):(
                          <>
                            <p style={{ fontSize:10, color:C.textMuted, letterSpacing:'0.08em', marginBottom:12, fontWeight:700, textTransform:'uppercase' as const }}>No Contestó</p>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:10 }}>
                              {currentScript.notAnsweredOutcomes.map((o,i)=>(
                                <button key={i} onClick={()=>handleOutcome(o.action,o.label)}
                                  style={{ padding:'10px 12px', background:`${outcomeColor(o.color)}15`, border:`1.5px solid ${outcomeColor(o.color)}`, borderRadius:8, color:outcomeColor(o.color), fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>
                                  {o.label}
                                </button>
                              ))}
                            </div>
                            <button onClick={()=>setShowNotAnswered(false)}
                              style={{ width:'100%', padding:'9px 0', background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, color:C.textMuted, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                              ← Contestó
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ):(
                  <div style={{ padding:32, textAlign:'center' as const, color:C.textLight, fontSize:13, background:C.white, borderRadius:12, border:`1px solid ${C.border}` }}>
                    No hay guion para este paso.<br/><span style={{ fontSize:11, display:'block', marginTop:6 }}>{selectedStage?.name}</span>
                  </div>
                )}
              </div>
            )}
            {activeTab==='activity'&&(
              <div>
                {showFourStep&&<FourStepWidget completedStep={fourStepProgress}/>}
                <div style={{ marginBottom:16, background:C.white, borderRadius:12, border:`1px solid ${C.border}`, padding:'14px 16px' }}>
                  <textarea value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Escribir nota..." rows={3}
                    style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', color:C.text, fontSize:13, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' as const }}/>
                  <button onClick={saveNote} disabled={noteSaving||!newNote.trim()}
                    style={{ marginTop:8, padding:'8px 18px', background:newNote.trim()?C.blue:C.bg, border:`1px solid ${newNote.trim()?C.blue:C.border}`, borderRadius:8, color:newNote.trim()?'#fff':C.textLight, fontSize:12, cursor:newNote.trim()?'pointer':'not-allowed', fontFamily:'inherit', fontWeight:700 }}>
                    {noteSaving?'Guardando...':'Guardar nota'}
                  </button>
                </div>
                {notes.length===0?<p style={{ fontSize:12, color:C.textLight, textAlign:'center' as const, paddingTop:20 }}>Sin notas</p>
                  :notes.map(note=>(
                    <div key={note.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px', marginBottom:8 }}>
                      <p style={{ fontSize:11, color:C.textLight, marginBottom:6 }}>{new Date(note.dateAdded).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                      <p style={{ fontSize:13, color:C.text, lineHeight:1.7, whiteSpace:'pre-line' }}>{note.body}</p>
                    </div>
                  ))}
              </div>
            )}
            {activeTab==='info'&&(
              <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                {[
                  ['Nombre',getFullName(activeLead)],['Email',activeLead.contact?.email??'—'],
                  ['Teléfono',activeLead.contact?.phone??'—'],['Zona Horaria',activeLead.contact?.timezone??'—'],
                  ['Fecha de Cita',getCF(activeLead.contact?.customFields,CF_APPT_DATE)||'—'],
                  ['Fuente',activeLead.source??'—'],['Stage',selectedStage?.name??'—'],['Status',activeLead.status??'—'],
                  ['Creado',activeLead.createdAt?new Date(activeLead.createdAt).toLocaleDateString('es-ES'):'—'],
                ].map(([label,value],idx)=>(
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'11px 16px', borderBottom:idx<8?`1px solid ${C.border}`:'none', background:idx%2===0?C.white:'#FAFBFF' }}>
                    <span style={{ fontSize:12, color:C.textMuted, fontWeight:500 }}>{label}</span>
                    <span style={{ fontSize:12, color:C.darkBlue, fontWeight:600, textAlign:'right' as const, maxWidth:'60%' }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ):(
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14, background:C.bg }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:C.white, border:`2px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>📞</div>
          <p style={{ fontSize:14, color:C.textMuted, fontWeight:500 }}>Selecciona un lead para comenzar</p>
          <p style={{ fontSize:11, color:C.textLight }}>Talk English Academy · Setter Dashboard</p>
        </div>
      )}

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#DDE3F0;border-radius:3px}::-webkit-scrollbar-thumb:hover{background:#4789C8}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        input::placeholder,textarea::placeholder{color:#9CA3AF}
        select option{color:#1a1e3a}
      `}</style>
    </div>
  )
}