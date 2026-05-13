'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { SCRIPTS, Script, ScriptSection, WidgetType } from '@/data/scripts'

// ── Constants ─────────────────────────────────────────────────────────────
const CF_APPT_DATE   = 'S7k7o99V2UuNQUQFL9lY'
const CAL_QUAL_ID    = 'F2w9oEqTQjYlwpieh0mc'
const CAL_SALES_ID   = 'DX1pbtzm6YUeytHYMjzW'
const TEA_WA         = '+16892809986'
const TRIGGER_4STEP  = '{{trigger_link.1fTRhi46XGaSg3L7dQNV}}'

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
3. Busca el email o escanea el QR que te comparto
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

// Parse 4-step progress from notes
function parse4StepProgress(notes: Note[]): number {
  let maxStep = 0
  for (const note of notes) {
    const b = note.body.toLowerCase()
    // Look for patterns like "paso 1", "step 1", "paso 2 completado", etc.
    const m = b.match(/paso\s*(\d)/i) || b.match(/step\s*(\d)/i) || b.match(/p(\d)\s*(completado|complete)/i)
    if (m) {
      const n = parseInt(m[1])
      if (n > maxStep) maxStep = n
    }
    // Also check for "logged in" type notes from funnel
    if (b.includes('logged in') || b.includes('inició sesión')) maxStep = Math.max(maxStep, 1)
    if (b.includes('paso 1') || b.includes('step 1')) maxStep = Math.max(maxStep, 1)
    if (b.includes('paso 2') || b.includes('step 2')) maxStep = Math.max(maxStep, 2)
    if (b.includes('paso 3') || b.includes('step 3')) maxStep = Math.max(maxStep, 3)
    if (b.includes('paso 4') || b.includes('step 4') || b.includes('cita confirmada')) maxStep = Math.max(maxStep, 4)
  }
  return maxStep
}

// Brand colors
const C = {
  red:'#EA0029', blue:'#283A97', darkBlue:'#0F145B', white:'#FFFFFF', bg:'#F4F6FB',
  sidebar:'#0F145B', sidebarActive:'#283A97', border:'#DDE3F0',
  text:'#1a1e3a', textMuted:'#6B7280', textLight:'#9CA3AF', green:'#16a34a',
}

const outcomeColor = (color: string) =>
  ({ green:C.green, yellow:'#d97706', red:C.red, blue:C.blue }[color] || C.textMuted)

// ── 4-Step Progress Widget ────────────────────────────────────────────────
function FourStepWidget({ completedStep }: { completedStep: number }) {
  const steps = [
    'Descripción General',
    'Requisitos de la Academia',
    'Cuestionario',
    'Cita Confirmada',
  ]
  return (
    <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#0369A1', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 10 }}>
        📋 Portal de Miembros — Progreso
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        {steps.map((step, i) => {
          const num = i + 1
          const done = num <= completedStep
          const current = num === completedStep + 1
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center' as const }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
                background: done ? C.green : current ? '#FEF3C7' : '#E5E7EB',
                border: `2px solid ${done ? C.green : current ? '#F59E0B' : '#D1D5DB'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                color: done ? '#fff' : current ? '#92400E' : C.textLight,
              }}>
                {done ? '✓' : num}
              </div>
              <p style={{ fontSize: 9, color: done ? C.green : current ? '#92400E' : C.textLight, lineHeight: 1.3, fontWeight: done ? 700 : 400 }}>
                {step}
              </p>
            </div>
          )
        })}
      </div>
      {completedStep === 4 && (
        <div style={{ marginTop: 8, background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#166534', fontWeight: 600, textAlign: 'center' as const }}>
          ✅ Portal completo — ¡Listo para la llamada!
        </div>
      )}
    </div>
  )
}

// ── Booking Modal ─────────────────────────────────────────────────────────
function BookingModal({ calId, lead, onClose, title }: {
  calId: string; lead: Opportunity; onClose: () => void; title: string
}) {
  const firstName = lead.contact?.firstName ?? ''
  const lastName  = lead.contact?.lastName  ?? ''
  const email     = lead.contact?.email     ?? ''
  const phone     = lead.contact?.phone     ?? ''
  const url = `https://api.funnelup.io/widget/booking/${calId}?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,91,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: C.white, borderRadius: 16, width: '90%', maxWidth: 720, height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(15,20,91,0.3)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: C.darkBlue }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{title}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
              {firstName} {lastName} · {email}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}>
            ✕ Cerrar
          </button>
        </div>
        <iframe src={url} style={{ flex: 1, border: 'none', width: '100%' }} title="Booking Calendar" />
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
  const [moveTargetStage, setMoveTargetStage] = useState<Stage | null>(null)
  const [moving, setMoving]               = useState(false)
  const [bookingModal, setBookingModal]   = useState<{calId:string;title:string}|null>(null)
  const [sendingWA, setSendingWA]         = useState<string|null>(null)
  const pollRef   = useRef<ReturnType<typeof setInterval>|null>(null)
  const moveLockRef = useRef(false)

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const fetchLeads = useCallback(async (silent = false) => {
    if (moveLockRef.current) return   // don't poll while move is locked
    if (!silent) setLoading(true)
    try {
      const res  = await fetch('/api/leads')
      const data = await res.json()
      const newOpps: Opportunity[] = data.opportunities || []
      const newStages: Stage[]     = data.stages || []
      setStages(newStages)
      setOpportunities(newOpps)
      if (newStages.length > 0 && !selectedStage) setSelectedStage(newStages[0])
      setSelectedLead(prev => prev ? (newOpps.find(o => o.id === prev.id) ?? prev) : prev)
    } catch { if (!silent) showToast('Error cargando leads', 'error') }
    finally { if (!silent) setLoading(false) }
  }, [selectedStage])

  useEffect(() => { fetchLeads() }, [])

  useEffect(() => {
    pollRef.current = setInterval(() => fetchLeads(true), 30_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchLeads])

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

  // Show 4-step widget for stages from Qual Call onwards
  const showFourStep = selectedStage ? ['qualification call','confirm: sales','sales call','rebook sales','qual call follow','tea students'].some(k => selectedStage.name.toLowerCase().includes(k.toLowerCase())) : false

  // ── Move lead ─────────────────────────────────────────────────────────
  const initiateMove = (stage: Stage) => { setMoveTargetStage(stage); setShowMoveModal(true) }
  const confirmMove  = async () => {
    if (!selectedLead || !moveTargetStage) return
    setMoving(true)
    moveLockRef.current = true
    try {
      const res = await fetch('/api/opportunity', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: selectedLead.id, stageId: moveTargetStage.id }),
      })
      if (!res.ok) throw new Error()
      setOpportunities(prev => prev.map(o => o.id === selectedLead.id ? { ...o, pipelineStageId: moveTargetStage.id } : o))
      setSelectedLead(prev => prev ? { ...prev, pipelineStageId: moveTargetStage.id } : prev)
      setSelectedStage(moveTargetStage)
      showToast(`✓ Movido a: ${moveTargetStage.name}`)
      // Release poll lock after 90s (enough time for FunnelUp to sync)
      setTimeout(() => { moveLockRef.current = false }, 90_000)
    } catch { showToast('Error al mover el lead', 'error'); moveLockRef.current = false }
    finally { setMoving(false); setShowMoveModal(false); setMoveTargetStage(null) }
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

  const handleOutcome = async (action: string, label: string) => {
    if (!selectedLead) return
    if (action === 'not_available') { setShowNotAvail(true); return }
    const txt = `[${new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}] ${label} — Paso: ${selectedStage?.name}`
    try {
      await fetch('/api/notes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contactId: selectedLead.contactId, body: txt }) })
      showToast(`✓ ${label}`)
      fetchNotes(selectedLead.contactId)
    } catch { showToast('Error','error') }
    setShowNotAnswered(false)
  }

  const confirmNotAvail = async () => {
    if (!selectedLead || !notAvailHours) return
    const txt = `[${new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}] No Disponible — Llamar en ${notAvailHours} horas`
    await fetch('/api/notes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contactId: selectedLead.contactId, body: txt }) })
    showToast(`Llamar en ${notAvailHours} horas`)
    setShowNotAvail(false); setNotAvailHours('')
  }

  // ── WhatsApp send ──────────────────────────────────────────────────────
  const sendWhatsApp = async (type: 'zelle'|'paypal'|'binance'|'4step') => {
    if (!selectedLead?.contactId) return
    const firstName = selectedLead.contact?.firstName ?? 'estudiante'
    setSendingWA(type)
    let message = ''
    if (type === '4step') {
      message = `Hola ${firstName}, aquí está el enlace para acceder al Portal de Miembros de Talk English Academy:\n\n${TRIGGER_4STEP}\n\nHaz clic en el enlace, ingresa con tu correo y completa los 4 pasos antes de tu próxima cita. ¡Cualquier duda me avisas!`
    } else {
      message = PAYMENT_MESSAGES[type](firstName)
    }
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedLead.contactId, phone: selectedLead.contact?.phone, message }),
      })
      if (res.ok) showToast(`✓ WhatsApp enviado (${type === '4step' ? 'Portal' : type.toUpperCase()})`)
      else showToast('Error enviando WhatsApp', 'error')
    } catch { showToast('Error enviando WhatsApp', 'error') }
    finally { setSendingWA(null) }
  }

  const getInitials = (o: Opportunity) => ((o.contact?.firstName?.[0]??'')+(o.contact?.lastName?.[0]??'')).toUpperCase() || o.name?.[0]?.toUpperCase() || '?'
  const getFullName = (o: Opportunity) => (o.contact?.firstName||o.contact?.lastName) ? `${o.contact?.firstName??''} ${o.contact?.lastName??''}`.trim() : o.name
  const stageCount  = (id: string) => opportunities.filter(o => o.pipelineStageId === id).length

  // ── Inline widget renderer ─────────────────────────────────────────────
  const renderWidget = (widget: WidgetType) => {
    if (!selectedLead) return null
    const firstName = selectedLead.contact?.firstName ?? 'el lead'

    if (widget === 'book-qual-call') return (
      <div style={{ marginTop: 12, padding: '10px 14px', background: '#EEF2FF', border: `1px solid #C7D2FE`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>📅</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 2 }}>Agendar Llamada de Calificación</p>
          <p style={{ fontSize: 10, color: C.textMuted }}>Abre el calendario a nombre de {firstName}</p>
        </div>
        <button onClick={() => setBookingModal({ calId: CAL_QUAL_ID, title: 'Agendar Llamada de Calificación' })}
          style={{ padding: '7px 14px', background: C.blue, border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, flexShrink: 0 }}>
          Abrir Calendario
        </button>
      </div>
    )

    if (widget === 'reschedule-qual') return (
      <div style={{ marginTop: 12, padding: '10px 14px', background: '#FFFBEB', border: `1px solid #FDE68A`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🔄</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 2 }}>Reagendar Llamada de Calificación</p>
          <p style={{ fontSize: 10, color: C.textMuted }}>Cambia la fecha de la cita de calificación</p>
        </div>
        <button onClick={() => setBookingModal({ calId: CAL_QUAL_ID, title: 'Reagendar Llamada de Calificación' })}
          style={{ padding: '7px 14px', background: '#D97706', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, flexShrink: 0 }}>
          Reagendar
        </button>
      </div>
    )

    if (widget === 'book-sales-call') return (
      <div style={{ marginTop: 12, padding: '10px 14px', background: '#ECFDF5', border: `1px solid #A7F3D0`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🚀</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#065F46', marginBottom: 2 }}>Agendar Llamada de Ventas</p>
          <p style={{ fontSize: 10, color: C.textMuted }}>Sesión Estratégica — agenda a nombre de {firstName}</p>
        </div>
        <button onClick={() => setBookingModal({ calId: CAL_SALES_ID, title: 'Agendar Llamada de Ventas (Sesión Estratégica)' })}
          style={{ padding: '7px 14px', background: '#059669', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, flexShrink: 0 }}>
          Abrir Calendario
        </button>
      </div>
    )

    if (widget === 'reschedule-sales') return (
      <div style={{ marginTop: 12, padding: '10px 14px', background: '#FFFBEB', border: `1px solid #FDE68A`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🔄</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 2 }}>Reagendar Llamada de Ventas</p>
          <p style={{ fontSize: 10, color: C.textMuted }}>Cambia la fecha de la cita de ventas</p>
        </div>
        <button onClick={() => setBookingModal({ calId: CAL_SALES_ID, title: 'Reagendar Llamada de Ventas' })}
          style={{ padding: '7px 14px', background: '#D97706', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, flexShrink: 0 }}>
          Reagendar
        </button>
      </div>
    )

    if (widget === 'send-4step-link') return (
      <div style={{ marginTop: 12, padding: '10px 14px', background: '#F0F9FF', border: `1px solid #BAE6FD`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🔑</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', marginBottom: 2 }}>Enviar Link del Portal (4-Step)</p>
          <p style={{ fontSize: 10, color: C.textMuted }}>Envía el magic link por WhatsApp a {firstName}</p>
        </div>
        <button onClick={() => sendWhatsApp('4step')} disabled={sendingWA === '4step'}
          style={{ padding: '7px 14px', background: sendingWA==='4step'?'#6B7280':'#0284C7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, cursor: sendingWA==='4step'?'not-allowed':'pointer', fontFamily: 'inherit', fontWeight: 700, flexShrink: 0 }}>
          {sendingWA === '4step' ? 'Enviando...' : 'Enviar por WhatsApp'}
        </button>
      </div>
    )

    if (widget === 'pay-zelle' || widget === 'pay-paypal' || widget === 'pay-binance') return (
      <div style={{ marginTop: 12, padding: '12px 14px', background: '#F8FAFF', border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.darkBlue, marginBottom: 10 }}>💳 Enviar Datos de Pago por WhatsApp</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['zelle','paypal','binance'] as const).map(method => (
            <button key={method} onClick={() => sendWhatsApp(method)} disabled={!!sendingWA}
              style={{
                flex: 1, padding: '9px 6px',
                background: sendingWA===method ? '#6B7280' : method==='zelle' ? '#7C3AED' : method==='paypal' ? '#003087' : '#F0B90B',
                border: 'none', borderRadius: 8, color: method==='binance'?'#000':'#fff',
                fontSize: 11, cursor: sendingWA?'not-allowed':'pointer', fontFamily: 'inherit', fontWeight: 700,
              }}>
              {sendingWA===method ? '...' : method==='zelle'?'⚡ Zelle':method==='paypal'?'🅿 PayPal':'🟡 Binance'}
            </button>
          ))}
        </div>
      </div>
    )

    return null
  }

  // ── Script bubble renderer ─────────────────────────────────────────────
  const renderSection = (s: ScriptSection, i: number) => {
    const text = resolveVars(s.content, selectedLead)
    const vm = s.type==='voicemail', br = s.type==='branch', nt = s.type==='note'
    const tc = vm?C.blue:br?'#059669':nt?'#d97706':C.red
    const bg = vm?'#EEF2FF':br?'#ECFDF5':nt?'#FFFBEB':'#F8FAFF'
    const bd = vm?'#C7D2FE':br?'#A7F3D0':nt?'#FDE68A':'#DBEAFE'
    const parts = text.split(/("(?:[^"\\]|\\.)*")/g)
    return (
      <div key={i} style={{ marginBottom: 20 }}>
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

  // ── UI ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', height:'100vh', background:C.bg, color:C.text, fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", overflow:'hidden' }}>

      {/* Toast */}
      {toast && <div style={{ position:'fixed', top:16, right:16, zIndex:9999, background:toast.type==='success'?C.green:C.red, color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:600, boxShadow:'0 4px 20px rgba(0,0,0,0.2)', animation:'fadeIn 0.2s ease' }}>{toast.msg}</div>}

      {/* Booking Modal */}
      {bookingModal && selectedLead && (
        <BookingModal calId={bookingModal.calId} lead={selectedLead} title={bookingModal.title} onClose={() => setBookingModal(null)} />
      )}

      {/* Move Modal */}
      {showMoveModal && moveTargetStage && selectedLead && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,20,91,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(3px)' }}>
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width:380, boxShadow:'0 24px 60px rgba(15,20,91,0.25)' }}>
            <div style={{ width:48, height:48, background:'#FEF3C7', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:14 }}>⚠️</div>
            <p style={{ fontSize:16, fontWeight:700, color:C.darkBlue, marginBottom:6 }}>¿Mover lead?</p>
            <p style={{ fontSize:13, color:C.textMuted, marginBottom:4 }}>Vas a mover a <strong style={{ color:C.darkBlue }}>{getFullName(selectedLead)}</strong>:</p>
            <div style={{ background:C.bg, borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13 }}>
              <span style={{ color:C.textMuted }}>Desde: </span><span style={{ fontWeight:600, color:C.darkBlue }}>{selectedStage?.name}</span>
              <span style={{ color:C.textMuted, margin:'0 8px' }}>→</span>
              <span style={{ fontWeight:700, color:C.blue }}>{moveTargetStage.name}</span>
            </div>
            <p style={{ fontSize:12, color:C.textMuted, marginBottom:18 }}>Este cambio también se reflejará en FunnelUp.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>{setShowMoveModal(false);setMoveTargetStage(null)}} style={{ flex:1, padding:'10px 0', background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, color:C.textMuted, cursor:'pointer', fontSize:13, fontFamily:'inherit', fontWeight:600 }}>Cancelar</button>
              <button onClick={confirmMove} disabled={moving} style={{ flex:1, padding:'10px 0', background:moving?'#6B7280':C.blue, border:'none', borderRadius:10, color:'#fff', cursor:moving?'not-allowed':'pointer', fontSize:13, fontFamily:'inherit', fontWeight:700 }}>
                {moving ? 'Moviendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No disponible modal */}
      {showNotAvail && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,20,91,0.4)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(2px)' }}>
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width:340, boxShadow:'0 20px 60px rgba(15,20,91,0.2)' }}>
            <p style={{ fontSize:15, fontWeight:700, color:C.darkBlue, marginBottom:4 }}>No Disponible</p>
            <p style={{ fontSize:12, color:C.textMuted, marginBottom:16 }}>¿En cuántas horas volver a llamar?</p>
            <input type="number" min="1" max="72" value={notAvailHours} onChange={e=>setNotAvailHours(e.target.value)} placeholder="ej: 2"
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
              const count = stageCount(stage.id)
              const isActive = selectedStage?.id === stage.id
              return (
                <button key={stage.id} onClick={()=>{ setSelectedStage(stage); setSelectedLead(null) }}
                  style={{ width:'100%', textAlign:'left', background:isActive?C.sidebarActive:'transparent', border:'none', borderRadius:8, padding:'8px 10px', cursor:'pointer', marginBottom:2, color:isActive?'#fff':'rgba(255,255,255,0.55)', fontSize:11.5, display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:'inherit', fontWeight:isActive?600:400 }}>
                  <span>{stage.name}</span>
                  {count>0 && <span style={{ background:isActive?C.red:'rgba(255,255,255,0.12)', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:700, marginLeft:4 }}>{count}</span>}
                </button>
              )
            })}
        </div>
        <div style={{ padding:'10px 8px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={()=>fetchLeads(false)} style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'7px 0', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:11, fontFamily:'inherit' }}>
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* ── LEADS LIST ── */}
      <div style={{ width:264, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flexShrink:0, background:C.white }}>
        <div style={{ padding:'14px 12px 10px', borderBottom:`1px solid ${C.border}` }}>
          <p style={{ fontSize:12.5, fontWeight:700, color:C.darkBlue, marginBottom:8 }}>
            {selectedStage?.name ?? 'Selecciona un paso'}
            <span style={{ color:C.textLight, fontWeight:400, marginLeft:6, fontSize:11 }}>{leadsInStage.length} leads</span>
          </p>
          <input placeholder="Buscar lead..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
            style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px', color:C.text, fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const }}/>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          {leadsInStage.length===0
            ? <div style={{ padding:24, fontSize:12, color:C.textLight, textAlign:'center' as const }}>{selectedStage?'Sin leads en este paso':'Selecciona un paso'}</div>
            : leadsInStage.map(opp => {
              const sel = selectedLead?.id === opp.id
              return (
                <div key={opp.id} onClick={()=>{ setSelectedLead(opp); setActiveTab('script'); setShowVoicemail(false); setShowNotAnswered(false) }}
                  style={{ padding:'10px 12px', cursor:'pointer', borderBottom:`1px solid ${C.border}`, background:sel?'#EEF2FF':'transparent', borderLeft:sel?`3px solid ${C.blue}`:'3px solid transparent' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:sel?C.blue:'#E8EDF8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:sel?'#fff':C.blue, flexShrink:0 }}>
                      {getInitials(opp)}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:sel?C.darkBlue:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{getFullName(opp)}</p>
                      <p style={{ fontSize:10.5, color:C.textLight, marginTop:1 }}>{opp.contact?.phone ?? '—'}</p>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* ── MAIN PANEL ── */}
      {selectedLead ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:C.bg }}>

          {/* Header */}
          <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12, background:C.white, boxShadow:'0 1px 4px rgba(40,58,151,0.06)' }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', flexShrink:0 }}>
              {getInitials(selectedLead)}
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:15, fontWeight:700, color:C.darkBlue }}>{getFullName(selectedLead)}</p>
              <p style={{ fontSize:11, color:C.textMuted, marginTop:1, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span>{selectedLead.contact?.email??'—'}</span>
                <span>·</span>
                <span>{selectedLead.contact?.phone??'—'}</span>
                {getCF(selectedLead.contact?.customFields,CF_APPT_DATE) && (
                  <span style={{ background:'#EEF2FF', color:C.blue, borderRadius:6, padding:'1px 8px', fontWeight:600, fontSize:10.5 }}>
                    📅 {getCF(selectedLead.contact?.customFields,CF_APPT_DATE)}
                  </span>
                )}
              </p>
            </div>
            <select onChange={e=>{ const t=stages.find(s=>s.id===e.target.value); if(t&&t.id!==selectedStage?.id) initiateMove(t); e.target.value='' }} defaultValue=""
              style={{ padding:'7px 12px', background:C.white, border:`1px solid ${C.border}`, borderRadius:8, color:C.blue, fontSize:11.5, cursor:'pointer', fontFamily:'inherit', fontWeight:600, outline:'none' }}>
              <option value="" disabled>↕ Mover a...</option>
              {stages.filter(s=>s.id!==selectedStage?.id).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <a href={`https://app.funnelup.io/v2/location/${process.env.NEXT_PUBLIC_GHL_LOCATION_ID}/contacts/detail/${selectedLead.contactId}`}
              target="_blank" rel="noopener noreferrer"
              style={{ padding:'7px 14px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, color:C.blue, fontSize:11.5, cursor:'pointer', textDecoration:'none', fontFamily:'inherit', fontWeight:600 }}>
              Ver en FunnelUp ↗
            </a>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, padding:'0 20px', background:C.white }}>
            {(['script','activity','info'] as const).map(tab => (
              <button key={tab} onClick={()=>setActiveTab(tab)}
                style={{ padding:'11px 16px', background:'transparent', border:'none', borderBottom:activeTab===tab?`2px solid ${C.red}`:'2px solid transparent', color:activeTab===tab?C.red:C.textMuted, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.04em', textTransform:'uppercase' as const, marginBottom:'-1px' }}>
                {tab==='script'?'Guion':tab==='activity'?'Notas':'Info'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

            {/* SCRIPT */}
            {activeTab==='script' && (
              <div>
                {/* 4-Step Progress — shown for Qual Call onwards */}
                {showFourStep && <FourStepWidget completedStep={fourStepProgress} />}

                {currentScript ? (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, padding:'10px 14px', background:C.white, borderRadius:10, border:`1px solid ${C.border}`, boxShadow:'0 1px 4px rgba(40,58,151,0.05)' }}>
                      <span style={{ background:C.darkBlue, color:'#fff', borderRadius:6, padding:'3px 10px', fontSize:10.5, fontWeight:700 }}>{currentScript.stepName}</span>
                      <span style={{ background:'#EEF2FF', color:C.blue, borderRadius:6, padding:'3px 10px', fontSize:10.5, fontWeight:600 }}>⏱ {currentScript.duration}</span>
                      <button onClick={()=>setShowVoicemail(!showVoicemail)}
                        style={{ marginLeft:'auto', background:showVoicemail?C.blue:C.bg, border:`1px solid ${showVoicemail?C.blue:C.border}`, borderRadius:8, padding:'5px 12px', color:showVoicemail?'#fff':C.blue, fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
                        {showVoicemail?'← Guion':'📱 Mensaje de Voz'}
                      </button>
                    </div>

                    {showVoicemail
                      ? currentScript.sections.filter(s=>s.type==='voicemail').map((s,i)=>renderSection(s,i))
                      : currentScript.sections.filter(s=>s.type!=='voicemail').map((s,i)=>renderSection(s,i))
                    }

                    {!showVoicemail && currentScript.answeredOutcomes.length > 0 && (
                      <div style={{ marginTop:24, background:C.white, borderRadius:12, border:`1px solid ${C.border}`, padding:'16px 18px' }}>
                        {!showNotAnswered ? (
                          <>
                            <p style={{ fontSize:10, color:C.textMuted, letterSpacing:'0.08em', marginBottom:12, fontWeight:700, textTransform:'uppercase' as const }}>¿Contestó?</p>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:10 }}>
                              {currentScript.answeredOutcomes.map((o,i) => (
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
                        ) : (
                          <>
                            <p style={{ fontSize:10, color:C.textMuted, letterSpacing:'0.08em', marginBottom:12, fontWeight:700, textTransform:'uppercase' as const }}>No Contestó — ¿Qué Pasó?</p>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:10 }}>
                              {currentScript.notAnsweredOutcomes.map((o,i) => (
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
                ) : (
                  <div style={{ padding:32, textAlign:'center' as const, color:C.textLight, fontSize:13, background:C.white, borderRadius:12, border:`1px solid ${C.border}` }}>
                    No hay guion para este paso.<br/><span style={{ fontSize:11, display:'block', marginTop:6 }}>{selectedStage?.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* NOTES */}
            {activeTab==='activity' && (
              <div>
                {showFourStep && <FourStepWidget completedStep={fourStepProgress} />}
                <div style={{ marginBottom:16, background:C.white, borderRadius:12, border:`1px solid ${C.border}`, padding:'14px 16px' }}>
                  <textarea value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Escribir nota sobre este lead..." rows={3}
                    style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px', color:C.text, fontSize:13, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' as const }}/>
                  <button onClick={saveNote} disabled={noteSaving||!newNote.trim()}
                    style={{ marginTop:8, padding:'8px 18px', background:newNote.trim()?C.blue:C.bg, border:`1px solid ${newNote.trim()?C.blue:C.border}`, borderRadius:8, color:newNote.trim()?'#fff':C.textLight, fontSize:12, cursor:newNote.trim()?'pointer':'not-allowed', fontFamily:'inherit', fontWeight:700 }}>
                    {noteSaving?'Guardando...':'Guardar nota'}
                  </button>
                </div>
                {notes.length===0
                  ? <p style={{ fontSize:12, color:C.textLight, textAlign:'center' as const, paddingTop:20 }}>Sin notas aún</p>
                  : notes.map(note => (
                    <div key={note.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px', marginBottom:8 }}>
                      <p style={{ fontSize:11, color:C.textLight, marginBottom:6 }}>
                        {new Date(note.dateAdded).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                      </p>
                      <p style={{ fontSize:13, color:C.text, lineHeight:1.7, whiteSpace:'pre-line' }}>{note.body}</p>
                    </div>
                  ))}
              </div>
            )}

            {/* INFO */}
            {activeTab==='info' && (
              <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                {[
                  ['Nombre', getFullName(selectedLead)],
                  ['Email', selectedLead.contact?.email ?? '—'],
                  ['Teléfono', selectedLead.contact?.phone ?? '—'],
                  ['Zona Horaria', selectedLead.contact?.timezone ?? '—'],
                  ['Fecha de Cita', getCF(selectedLead.contact?.customFields,CF_APPT_DATE) || '—'],
                  ['Fuente', selectedLead.source ?? '—'],
                  ['Pipeline Stage', selectedStage?.name ?? '—'],
                  ['Status', selectedLead.status ?? '—'],
                  ['Creado', selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString('es-ES') : '—'],
                ].map(([label, value], idx) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'11px 16px', borderBottom:idx<8?`1px solid ${C.border}`:'none', background:idx%2===0?C.white:'#FAFBFF' }}>
                    <span style={{ fontSize:12, color:C.textMuted, fontWeight:500 }}>{label}</span>
                    <span style={{ fontSize:12, color:C.darkBlue, fontWeight:600, textAlign:'right' as const, maxWidth:'60%' }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14, background:C.bg }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:C.white, border:`2px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>📞</div>
          <p style={{ fontSize:14, color:C.textMuted, fontWeight:500 }}>Selecciona un lead para comenzar</p>
          <p style={{ fontSize:11, color:C.textLight }}>Talk English Academy · Setter Dashboard</p>
        </div>
      )}

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#DDE3F0;border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:#4789C8}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        input::placeholder,textarea::placeholder{color:#9CA3AF}
        select option{color:#1a1e3a}
      `}</style>
    </div>
  )
}