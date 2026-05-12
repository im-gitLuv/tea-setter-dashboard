/// <reference types="node" />
import { NextResponse } from 'next/server'
import { getOpportunitiesByPipeline, getPipelineStages, getContact } from '@/lib/ghl'

export async function GET() {
  try {
    const [oppsData, pipelinesData] = await Promise.all([
      getOpportunitiesByPipeline(),
      getPipelineStages(),
    ])

    const pipeline = pipelinesData?.pipelines?.find(
      (p: { id: string }) => p.id === process.env.GHL_PIPELINE_ID
    )

    const opportunities = oppsData?.opportunities || []

    // Enrich each opportunity with full contact data (customFields, dateAdded, etc.)
    // Run in parallel, max 10 at a time to avoid rate limits
    const enriched = await Promise.all(
      opportunities.map(async (opp: Record<string, unknown>) => {
        const contactId = opp.contactId as string
        if (!contactId) return opp
        try {
          const fullContact = await getContact(contactId)
          return {
            ...opp,
            contact: {
              // Merge existing basic contact data with full contact data
              ...(opp.contact as Record<string, unknown> ?? {}),
              ...fullContact,
            },
          }
        } catch {
          // If contact fetch fails, return opp as-is
          return opp
        }
      })
    )

    return NextResponse.json({
      opportunities: enriched,
      stages: pipeline?.stages || [],
      total: enriched.length,
    })
  } catch (err) {
    console.error('Leads API error:', err)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}