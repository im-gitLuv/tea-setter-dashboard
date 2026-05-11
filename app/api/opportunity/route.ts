import { NextRequest, NextResponse } from 'next/server'
import { updateOpportunityStage } from '@/lib/ghl'

export async function PUT(req: NextRequest) {
  try {
    const { opportunityId, stageId } = await req.json()
    if (!opportunityId || !stageId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const data = await updateOpportunityStage(opportunityId, stageId)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Update stage error:', err)
    return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 })
  }
}
