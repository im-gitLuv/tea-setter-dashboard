/// <reference types="node" />
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BASE = 'https://services.leadconnectorhq.com'
const hdrs = () => ({
  'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('contactId')
  if (!contactId) return NextResponse.json({ error: 'Missing contactId' }, { status: 400 })

  const res = await fetch(`${BASE}/contacts/${contactId}/notes`, {
    headers: hdrs(),
    cache: 'no-store',
  })
  if (!res.ok) return NextResponse.json({ notes: [] })
  const data = await res.json()
  return NextResponse.json(
    { notes: data.notes || [] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function POST(req: Request) {
  const { contactId, body } = await req.json()
  if (!contactId || !body) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const res = await fetch(`${BASE}/contacts/${contactId}/notes`, {
    method: 'POST',
    headers: hdrs(),
    body: JSON.stringify({ body, userId: 'setter-dashboard' }),
    cache: 'no-store',
  })
  const data = await res.json()
  return NextResponse.json(data)
}