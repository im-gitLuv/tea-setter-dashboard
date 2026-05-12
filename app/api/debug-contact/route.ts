/// <reference types="node" />
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('contactId')
  const oppId = searchParams.get('oppId')

  if (!contactId && !oppId) {
    return NextResponse.json({ error: 'Pass ?contactId=XXX or ?oppId=XXX' })
  }

  const headers = {
    'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
  }
  const base = 'https://services.leadconnectorhq.com'

  try {
    const results: Record<string, unknown> = {}
    if (contactId) {
      const r = await fetch(`${base}/contacts/${contactId}`, { headers })
      results.contact = await r.json()
    }
    if (oppId) {
      const r = await fetch(`${base}/opportunities/${oppId}`, { headers })
      results.opportunity = await r.json()
    }
    return NextResponse.json(results)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}