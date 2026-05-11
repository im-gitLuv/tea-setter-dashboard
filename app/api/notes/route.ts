import { NextRequest, NextResponse } from 'next/server'
import { getContactNotes, createContactNote } from '@/lib/ghl'

export async function GET(req: NextRequest) {
  try {
    const contactId = req.nextUrl.searchParams.get('contactId')
    if (!contactId) return NextResponse.json({ error: 'Missing contactId' }, { status: 400 })
    const data = await getContactNotes(contactId)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Notes GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { contactId, body } = await req.json()
    if (!contactId || !body) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const data = await createContactNote(contactId, body)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Notes POST error:', err)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
