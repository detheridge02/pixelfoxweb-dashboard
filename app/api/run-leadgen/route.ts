// app/api/run-leadgen/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { getLeads, createLead, addLeadUpdate } from '@/lib/monday'
import { runLeadGen } from '@/lib/leadgen'

export async function POST() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    // 1. Get existing leads to avoid duplicates
    const existingLeads = await getLeads()
    const existingNames = existingLeads.map(l => l.name)

    // 2. Run Haiku lead gen
    const result = await runLeadGen(existingNames)

    // 3. Save each lead to Monday.com CRM
    const saved = []
    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

    for (const lead of result.leads) {
      try {
        // Create the lead item
        const itemId = await createLead({
          name: lead.name,
          company: lead.company,
          sector: lead.sector,
          phone: lead.phone || '',
          email: lead.email || '',
        })

        // Post draft outreach as an update
        const emoji = lead.messageType === 'email' ? '📧' : '📱'
        const label = lead.messageType === 'email'
          ? `DRAFT EMAIL — ${today}`
          : `DRAFT FACEBOOK MESSAGE — ${today}`

        await addLeadUpdate(
          itemId,
          `${emoji} ${label}\n\n${lead.draftMessage}`
        )

        saved.push({ ...lead, itemId, success: true })
      } catch (err: any) {
        console.error(`Failed to save lead ${lead.name}:`, err)
        saved.push({ ...lead, success: false, error: err.message })
      }
    }

    return NextResponse.json({
      success: true,
      summary: result.summary,
      leads: saved,
      totalSaved: saved.filter(l => l.success).length,
    })

  } catch (error: any) {
    console.error('Lead gen failed:', error)
    return NextResponse.json(
      { error: error.message || 'Lead gen failed' },
      { status: 500 }
    )
  }
}
