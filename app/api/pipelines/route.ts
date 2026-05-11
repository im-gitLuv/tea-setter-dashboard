import { NextResponse } from 'next/server'
import { getPipelineStages } from '@/lib/ghl'

export async function GET() {
  try {
    const data = await getPipelineStages()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Pipelines API error:', err)
    return NextResponse.json({ error: 'Failed to fetch pipelines' }, { status: 500 })
  }
}
