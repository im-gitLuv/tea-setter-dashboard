import { NextResponse } from 'next/server'
import { getOpportunitiesByPipeline, getPipelineStages } from '@/lib/ghl'

export async function GET() {
  try {
    const [oppsData, pipelinesData] = await Promise.all([
      getOpportunitiesByPipeline(),
      getPipelineStages(),
    ])

    const pipeline = pipelinesData?.pipelines?.find(
      (p: { id: string }) => p.id === process.env.GHL_PIPELINE_ID
    )

    return NextResponse.json({
      opportunities: oppsData?.opportunities || [],
      stages: pipeline?.stages || [],
      total: oppsData?.total || 0,
    })
  } catch (err) {
    console.error('Leads API error:', err)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
