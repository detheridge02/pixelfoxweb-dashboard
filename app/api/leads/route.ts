// app/api/leads/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { getLeads, getPipelineSummary } from '@/lib/monday'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const [leads, summary] = await Promise.all([
      getLeads(),
      getPipelineSummary(),
    ])

    return NextResponse.json({ leads, summary })
  } catch (error: any) {
    console.error('Failed to fetch leads:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}
