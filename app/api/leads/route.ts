/// <reference types="node" />
import { NextResponse } from 'next/server'
import { getOpportunitiesByPipeline, getPipelineStages, getContact, getCalendarEvents } from '@/lib/ghl'

// Calendar IDs — kept in sync with app/page.tsx
const CAL_QUAL_ID  = 'F2w9oEqTQjYlwpieh0mc'  // Llamada de Calificación
const CAL_SALES_ID = 'DX1pbtzm6YUeytHYMjzW'  // Sesión Estratégica (Llamada de Ventas)

// Force dynamic — never cache this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Window: 7 days back (catch recently-passed appts) to 90 days ahead
    const now = Date.now()
    const startTime = now - 7 * 24 * 60 * 60 * 1000
    const endTime = now + 90 * 24 * 60 * 60 * 1000

    const [oppsData, pipelinesData, qualEvents, salesEvents] = await Promise.all([
      getOpportunitiesByPipeline(),
      getPipelineStages(),
      getCalendarEvents(CAL_QUAL_ID, startTime, endTime).catch(() => []),
      getCalendarEvents(CAL_SALES_ID, startTime, endTime).catch(() => []),
    ])

    // Build contactId -> { calendarId, calendarName, startTime } map.
    // If a contact has multiple appointments, keep the soonest upcoming one
    // (or the most recent past one if none are upcoming).
    const apptByContact = new Map<string, { calendarId: string; calendarName: string; startTime: string }>()
    const tagEvents = (events: Record<string, unknown>[], calendarId: string, calendarName: string) => {
      for (const ev of events) {
        const contactId = ev.contactId as string | undefined
        const evStart = ev.startTime as string | undefined
        if (!contactId || !evStart) continue
        const existing = apptByContact.get(contactId)
        if (!existing) {
          apptByContact.set(contactId, { calendarId, calendarName, startTime: evStart })
          continue
        }
        // Prefer the soonest future appointment; otherwise prefer the latest one
        const existingTime = new Date(existing.startTime).getTime()
        const newTime = new Date(evStart).getTime()
        const nowMs = Date.now()
        const existingIsFuture = existingTime >= nowMs
        const newIsFuture = newTime >= nowMs
        if (newIsFuture && (!existingIsFuture || newTime < existingTime)) {
          apptByContact.set(contactId, { calendarId, calendarName, startTime: evStart })
        } else if (!newIsFuture && !existingIsFuture && newTime > existingTime) {
          apptByContact.set(contactId, { calendarId, calendarName, startTime: evStart })
        }
      }
    }
    tagEvents(qualEvents, CAL_QUAL_ID, 'Llamada de Calificación')
    tagEvents(salesEvents, CAL_SALES_ID, 'Sesión Estratégica')

    const pipeline = pipelinesData?.pipelines?.find(
      (p: { id: string }) => p.id === process.env.GHL_PIPELINE_ID
    )

    const opportunities = oppsData?.opportunities || []

    // Enrich with full contact data in batches of 5 to avoid rate limits
    const enriched: Record<string, unknown>[] = []
    const typedOpps = opportunities as Record<string, unknown>[]
    for (let i = 0; i < typedOpps.length; i += 5) {
      const batch = typedOpps.slice(i, i + 5)
      const results = await Promise.all(
        batch.map(async (opp: Record<string, unknown>) => {
          const contactId = opp.contactId as string
          const appt = contactId ? apptByContact.get(contactId) : undefined
          if (!contactId) return { ...opp, appointment: appt ?? null }
          try {
            const fullContact = await getContact(contactId)
            return {
              ...opp,
              contact: {
                ...(opp.contact as Record<string, unknown> ?? {}),
                ...fullContact,
              },
              appointment: appt ?? null,
            }
          } catch {
            return { ...opp, appointment: appt ?? null }
          }
        })
      )
      enriched.push(...results)
    }

    return NextResponse.json(
      {
        opportunities: enriched,
        stages: pipeline?.stages || [],
        total: enriched.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      }
    )
  } catch (err) {
    console.error('Leads API error:', err)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}