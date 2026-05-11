const BASE_URL = 'https://services.leadconnectorhq.com'

const headers = () => ({
  'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
})

export async function getPipelineStages() {
  const res = await fetch(
    `${BASE_URL}/opportunities/pipelines?locationId=${process.env.GHL_LOCATION_ID}`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`Pipelines error: ${res.status}`)
  return res.json()
}

export async function getOpportunitiesByStage(stageId: string) {
  const params = new URLSearchParams({
    location_id: process.env.GHL_LOCATION_ID!,
    pipeline_stage_id: stageId,
    limit: '100',
  })
  const res = await fetch(
    `${BASE_URL}/opportunities/search?${params}`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`Opportunities error: ${res.status}`)
  return res.json()
}

export async function getOpportunitiesByPipeline() {
  const params = new URLSearchParams({
    location_id: process.env.GHL_LOCATION_ID!,
    pipeline_id: process.env.GHL_PIPELINE_ID!,
    limit: '100',
  })
  const res = await fetch(
    `${BASE_URL}/opportunities/search?${params}`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`Opportunities error: ${res.status}`)
  return res.json()
}

export async function updateOpportunityStage(opportunityId: string, stageId: string) {
  const res = await fetch(
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
  const res = await fetch(
    `${BASE_URL}/contacts/${contactId}/notes`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`Notes error: ${res.status}`)
  return res.json()
}

export async function createContactNote(contactId: string, body: string) {
  const res = await fetch(
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
  const res = await fetch(
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
