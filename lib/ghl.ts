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

export async function getOpportunitiesByPipeline() {
  // Fetch all pages (100 per page max)
  const allOpps: unknown[] = []
  let startAfter: string | null = null
  let page = 0

  while (page < 10) { // safety cap at 1000 opportunities
    const params = new URLSearchParams({
      location_id: process.env.GHL_LOCATION_ID!,
      pipeline_id: process.env.GHL_PIPELINE_ID!,
      limit: '100',
    })
    if (startAfter) params.set('startAfter', startAfter)

    const res = await freshFetch(
      `${BASE_URL}/opportunities/search?${params}`,
      { headers: headers() }
    )
    if (!res.ok) throw new Error(`Opportunities error: ${res.status}`)
    const data = await res.json()
    const opps = data?.opportunities || []
    allOpps.push(...opps)

    // Stop if we got less than a full page
    if (opps.length < 100) break
    // Get cursor for next page
    startAfter = data?.meta?.startAfter ?? null
    if (!startAfter) break
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