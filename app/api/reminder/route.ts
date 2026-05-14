/// <reference types="node" />
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BASE = 'https://services.leadconnectorhq.com'
const LUIS_PHONE = '+584222863327'
const LOCATION_ID = process.env.GHL_LOCATION_ID!

// Send reminder to Luis via FunnelUp internal message or create a task
export async function POST(req: Request) {
  try {
    const { leadName, leadPhone, stepName, hours, contactId } = await req.json()

    const callTime = new Date(Date.now() + hours * 60 * 60 * 1000)
    const timeStr = callTime.toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas'
    })
    const dateStr = callTime.toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Caracas'
    })

    const message = `⏰ *Recordatorio de Llamada — TEA*\n\n📋 Lead: *${leadName}*\n📱 Teléfono: ${leadPhone}\n🎯 Paso: ${stepName}\n\n⏱ Llamar en ${hours} hora${hours !== 1 ? 's' : ''}\n🕐 Hora estimada: *${timeStr}* (${dateStr})\n\n_Este recordatorio fue generado automáticamente desde el TEA Setter Dashboard._`

    // Create a task/note on the contact for the reminder
    const noteRes = await fetch(`${BASE}/contacts/${contactId}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: `⏰ RECORDATORIO: Llamar en ${hours} hora(s) — ${new Date(Date.now() + hours * 60 * 60 * 1000).toLocaleString('es-ES', { timeZone: 'America/Caracas' })}`,
        userId: 'setter-dashboard',
      }),
      cache: 'no-store',
    })

    // Send WhatsApp to Luis using the location's outbound messaging
    // We use the conversations API to send to Luis's personal number
    // First find or create a contact for Luis's number, then send
    const waRes = await fetch(`${BASE}/conversations/messages/outbound`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'WhatsApp',
        toNumber: LUIS_PHONE,
        locationId: LOCATION_ID,
        message,
      }),
      cache: 'no-store',
    })

    const waData = await waRes.json()
    const noteData = await noteRes.json()

    return NextResponse.json({ ok: true, whatsapp: waData, note: noteData })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}