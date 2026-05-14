/// <reference types="node" />
import { NextResponse } from 'next/server'
import { getOpportunitiesByPipeline, getPipelineStages, getContact } from '@/lib/ghl'

// Force dynamic — never cache this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

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

    // Enrich with full contact data in batches of 5 to avoid rate limits
    const enriched: unknown[] = []
    for (let i = 0; i < opportunities.length; i += 5) {
      const batch = opportunities.slice(i, i + 5)
      const results = await Promise.all(
        batch.map(async (opp: Record<string, unknown>) => {
          const contactId = opp.contactId as string
          if (!contactId) return opp
          try {
            const fullContact = await getContact(contactId)
            return {
              ...opp,
              contact: {
                ...(opp.contact as Record<string, unknown> ?? {}),
                ...fullContact,
              },
            }
          } catch {
            return opp
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