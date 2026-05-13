/// <reference types="node" />
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { contactId, phone, message } = await req.json()
    if (!contactId || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const res = await fetch(
      `https://services.leadconnectorhq.com/conversations/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
          'Version': '2021-04-15',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'WhatsApp',
          contactId,
          message,
          ...(phone ? { toNumber: phone } : {}),
        }),
      }
    )
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status })
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}