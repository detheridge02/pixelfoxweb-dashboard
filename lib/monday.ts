// lib/monday.ts
// Monday.com GraphQL API client

const MONDAY_API_URL = 'https://api.monday.com/v2'
const BOARD_ID = process.env.MONDAY_LEADS_BOARD_ID!

interface MondayResponse<T> {
  data: T
  errors?: { message: string }[]
}

async function mondayQuery<T>(query: string, variables = {}): Promise<T> {
  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: process.env.MONDAY_API_TOKEN!,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })

  const json: MondayResponse<T> = await res.json()

  if (json.errors?.length) {
    throw new Error(json.errors.map(e => e.message).join(', '))
  }

  return json.data
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Lead {
  id: string
  name: string
  company: string
  sector: string
  status: string
  phone: string
  email: string
  estimatedValue: number
  notes: string
  websiteUrl: string
  leadSource: string
}

export interface PipelineSummary {
  total: number
  newLeads: number
  contacted: number
  attempted: number
  qualified: number
  unqualified: number
  totalValue: number
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getLeads(): Promise<Lead[]> {
  const data = await mondayQuery<any>(`
    query {
      boards(ids: [${BOARD_ID}]) {
        items_page(limit: 100) {
          items {
            id
            name
            column_values(ids: [
              "lead_company", "text", "lead_status", "lead_phone",
              "lead_email", "numeric_mm2btv2n", "long_text_mm2badt0",
              "link_mm2bece1", "color_mkyb8krc"
            ]) {
              id
              text
              value
            }
          }
        }
      }
    }
  `)

  const items = data.boards[0].items_page.items

  return items.map((item: any) => {
    const col = (id: string) =>
      item.column_values.find((c: any) => c.id === id)?.text || ''

    return {
      id: item.id,
      name: item.name,
      company: col('lead_company'),
      sector: col('text'),
      status: col('lead_status'),
      phone: col('lead_phone'),
      email: col('lead_email'),
      estimatedValue: parseFloat(col('numeric_mm2btv2n')) || 199,
      notes: col('long_text_mm2badt0'),
      websiteUrl: col('link_mm2bece1'),
      leadSource: col('color_mkyb8krc'),
    }
  })
}

export async function getPipelineSummary(): Promise<PipelineSummary> {
  const leads = await getLeads()

  return {
    total: leads.length,
    newLeads: leads.filter(l => l.status === 'New Lead').length,
    contacted: leads.filter(l => l.status === 'Contacted').length,
    attempted: leads.filter(l => l.status === 'Attempted to contact').length,
    qualified: leads.filter(l => l.status === 'Qualified').length,
    unqualified: leads.filter(l => l.status === 'Unqualified').length,
    totalValue: leads.reduce((sum, l) => sum + l.estimatedValue, 0),
  }
}

export async function addLeadUpdate(itemId: string, body: string): Promise<void> {
  await mondayQuery(`
    mutation {
      create_update(item_id: ${itemId}, body: "${body.replace(/"/g, '\\"')}") {
        id
      }
    }
  `)
}

export async function createLead(lead: Partial<Lead>): Promise<string> {
  const data = await mondayQuery<any>(`
    mutation {
      create_item(
        board_id: ${BOARD_ID},
        group_id: "topics",
        item_name: "${lead.name}",
        column_values: "${JSON.stringify({
          lead_company: lead.company,
          text: lead.sector,
          lead_status: { label: 'New Lead' },
          lead_email: { email: lead.email, text: lead.email },
          lead_phone: { phone: lead.phone?.replace(/\s/g, ''), countryShortName: 'GB' },
          numeric_mm2btv2n: '199',
          color_mkyb8krc: { label: 'Claude' },
        }).replace(/"/g, '\\"')}"
      ) {
        id
      }
    }
  `)
  return data.create_item.id
}
