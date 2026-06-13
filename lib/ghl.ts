/// <reference types="node" />
const BASE_URL = 'https://services.leadconnectorhq.com'

const headers = () => ({
  'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
})

// No-cache fetch — always fresh from FunnelUp
const freshFetch = (url: string, options?: RequestInit) =>
  fetch(url, { ...options, cache: 'no-store' })

export async function getPipelineStages() {
  const res = await freshFetch(
    `${BASE_URL}/opportunities/pipelines?locationId=${process.env.GHL_LOCATION_ID}`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`Pipelines error: ${res.status}`)
  return res.json()
}

// Fetch upcoming + recent calendar events for a given calendar.
// Returns a map of contactId -> event (most relevant / soonest one wins).
export async function getCalendarEvents(calendarId: string, startTime: number, endTime: number) {
  const params = new URLSearchParams({
    locationId: process.env.GHL_LOCATION_ID!,
    calendarId,
    startTime: String(startTime),
    endTime: String(endTime),
  })
  const res = await freshFetch(
    `${BASE_URL}/calendars/events?${params}`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`Calendar events error (${calendarId}): ${res.status}`)
  const data = await res.json()
  return (data?.events || []) as Record<string, unknown>[]
}

export async function getOpportunitiesByPipeline() {
  // Fetch all pages (100 per page max).
  // GHL cursor pagination requires BOTH startAfter (timestamp) AND startAfterId (last opp id).
  // Sending only startAfter makes GHL ignore the cursor and re-serve page 1 → x10 duplication.
  const allOpps: Record<string, unknown>[] = []
  const seenIds = new Set<string>()
  let startAfter: string | null = null
  let startAfterId: string | null = null
  let page = 0

  while (page < 20) { // safety cap at 2000 opportunities
    const params = new URLSearchParams({
      location_id: process.env.GHL_LOCATION_ID!,
      pipeline_id: process.env.GHL_PIPELINE_ID!,
      limit: '100',
    })
    // Only advance with a complete cursor — both fields are mandatory together
    if (startAfter && startAfterId) {
      params.set('startAfter', startAfter)
      params.set('startAfterId', startAfterId)
    }

    const res = await freshFetch(
      `${BASE_URL}/opportunities/search?${params}`,
      { headers: headers() }
    )
    if (!res.ok) throw new Error(`Opportunities error: ${res.status}`)
    const data = await res.json()
    const opps: Record<string, unknown>[] = data?.opportunities || []

    // Guard 1: empty page → done
    if (opps.length === 0) break

    // Dedupe by id while collecting (guards against a stuck cursor re-serving a page)
    let newCount = 0
    for (const opp of opps) {
      const id = opp.id as string
      if (id && !seenIds.has(id)) {
        seenIds.add(id)
        allOpps.push(opp)
        newCount++
      }
    }

    // Guard 2: page returned only duplicates → cursor is stuck, stop before x10
    if (newCount === 0) break

    // End of data: less than a full page
    if (opps.length < 100) break

    // Advance cursor from meta — GHL returns new startAfter + startAfterId each page
    const nextStartAfter =
      data?.meta?.startAfter != null ? String(data.meta.startAfter) : null
    const nextStartAfterId = data?.meta?.startAfterId ?? null

    // Guard 3: cursor missing or didn't advance → stop
    if (
      !nextStartAfterId ||
      (nextStartAfter === startAfter && nextStartAfterId === startAfterId)
    ) {
      break
    }

    startAfter = nextStartAfter
    startAfterId = nextStartAfterId
    page++
  }

  return { opportunities: allOpps, total: allOpps.length }
}

export async function getContact(contactId: string) {
  const res = await freshFetch(
    `${BASE_URL}/contacts/${contactId}`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`Contact error: ${res.status}`)
  const data = await res.json()
  return data.contact ?? data
}

export async function updateOpportunityStage(opportunityId: string, stageId: string) {
  const res = await freshFetch(
    `${BASE_URL}/opportunities/${opportunityId}`,
    {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ pipelineStageId: stageId }),
    }
  )
  if (!res.ok) throw new Error(`Update stage error: ${res.status}`)
  return res.json()
}

export async function getContactNotes(contactId: string) {
  const res = await freshFetch(
    `${BASE_URL}/contacts/${contactId}/notes`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`Notes error: ${res.status}`)
  return res.json()
}

export async function createContactNote(contactId: string, body: string) {
  const res = await freshFetch(
    `${BASE_URL}/contacts/${contactId}/notes`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ body, userId: 'setter-dashboard' }),
    }
  )
  if (!res.ok) throw new Error(`Create note error: ${res.status}`)
  return res.json()
}

export async function updateOpportunity(opportunityId: string, data: Record<string, unknown>) {
  const res = await freshFetch(
    `${BASE_URL}/opportunities/${opportunityId}`,
    {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data),
    }
  )
  if (!res.ok) throw new Error(`Update opportunity error: ${res.status}`)
  return res.json()
}