/// <reference types="node" />
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BASE = 'https://services.leadconnectorhq.com'
const hdrs = () => ({
  'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
})

// Add tags to a contact
export async function POST(req: Request) {
  try {
    const { contactId, tags } = await req.json()
    if (!contactId || !tags?.length) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const res = await fetch(`${BASE}/contacts/${contactId}/tags`, {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ tags }),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}