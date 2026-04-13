import { getPipelineSummary, getLeads, createLead } from '@/lib/monday'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeLead(overrides: Partial<ReturnType<typeof defaultLead>> = {}) {
  return { ...defaultLead(), ...overrides }
}

function defaultLead() {
  return {
    id: '1',
    name: 'Test Business',
    company: 'Test Co',
    sector: 'Trades',
    status: 'New Lead',
    phone: '01335 000000',
    email: 'test@example.com',
    estimatedValue: 199,
    notes: '',
    websiteUrl: '',
    leadSource: 'Claude',
  }
}

function mondayItemsResponse(items: any[]) {
  return {
    data: {
      boards: [{ items_page: { items } }],
    },
  }
}

function mondayItem(id: string, name: string, columns: Record<string, string>) {
  return {
    id,
    name,
    column_values: Object.entries(columns).map(([id, text]) => ({ id, text, value: text })),
  }
}

// ─── getPipelineSummary ───────────────────────────────────────────────────────

describe('getPipelineSummary', () => {
  beforeEach(() => {
    process.env.MONDAY_LEADS_BOARD_ID = '123'
    process.env.MONDAY_API_TOKEN = 'test-token'
  })

  it('counts leads by status correctly', async () => {
    const items = [
      mondayItem('1', 'Biz A', { lead_status: 'New Lead', numeric_mm2btv2n: '199' }),
      mondayItem('2', 'Biz B', { lead_status: 'New Lead', numeric_mm2btv2n: '399' }),
      mondayItem('3', 'Biz C', { lead_status: 'Contacted', numeric_mm2btv2n: '199' }),
      mondayItem('4', 'Biz D', { lead_status: 'Qualified', numeric_mm2btv2n: '199' }),
      mondayItem('5', 'Biz E', { lead_status: 'Unqualified', numeric_mm2btv2n: '199' }),
      mondayItem('6', 'Biz F', { lead_status: 'Attempted to contact', numeric_mm2btv2n: '199' }),
    ]

    global.fetch = jest.fn().mockResolvedValue({
      json: async () => mondayItemsResponse(items),
    }) as jest.Mock

    const summary = await getPipelineSummary()

    expect(summary.total).toBe(6)
    expect(summary.newLeads).toBe(2)
    expect(summary.contacted).toBe(1)
    expect(summary.qualified).toBe(1)
    expect(summary.unqualified).toBe(1)
    expect(summary.attempted).toBe(1)
    expect(summary.totalValue).toBe(1394)
  })

  it('returns zeros for an empty board', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => mondayItemsResponse([]),
    }) as jest.Mock

    const summary = await getPipelineSummary()

    expect(summary.total).toBe(0)
    expect(summary.totalValue).toBe(0)
  })

  it('falls back to £199 when estimated value is missing', async () => {
    const items = [
      mondayItem('1', 'Biz A', { lead_status: 'New Lead', numeric_mm2btv2n: '' }),
    ]

    global.fetch = jest.fn().mockResolvedValue({
      json: async () => mondayItemsResponse(items),
    }) as jest.Mock

    const summary = await getPipelineSummary()
    expect(summary.totalValue).toBe(199)
  })
})

// ─── getLeads ─────────────────────────────────────────────────────────────────

describe('getLeads', () => {
  beforeEach(() => {
    process.env.MONDAY_LEADS_BOARD_ID = '123'
    process.env.MONDAY_API_TOKEN = 'test-token'
  })

  it('maps Monday.com column values to Lead shape', async () => {
    const items = [
      mondayItem('42', 'The Plumber', {
        lead_company: 'The Plumber Ltd',
        text: 'Trades',
        lead_status: 'New Lead',
        lead_phone: '01335 111111',
        lead_email: 'plumber@example.com',
        numeric_mm2btv2n: '399',
        long_text_mm2badt0: 'Has Facebook only',
        link_mm2bece1: 'https://facebook.com/theplumber',
        color_mkyb8krc: 'Claude',
      }),
    ]

    global.fetch = jest.fn().mockResolvedValue({
      json: async () => mondayItemsResponse(items),
    }) as jest.Mock

    const leads = await getLeads()

    expect(leads).toHaveLength(1)
    expect(leads[0]).toMatchObject({
      id: '42',
      name: 'The Plumber',
      company: 'The Plumber Ltd',
      sector: 'Trades',
      status: 'New Lead',
      phone: '01335 111111',
      email: 'plumber@example.com',
      estimatedValue: 399,
      notes: 'Has Facebook only',
    })
  })

  it('throws when Monday.com returns GraphQL errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ data: {}, errors: [{ message: 'Invalid API token' }] }),
    }) as jest.Mock

    await expect(getLeads()).rejects.toThrow('Invalid API token')
  })
})

// ─── createLead ───────────────────────────────────────────────────────────────

describe('createLead', () => {
  beforeEach(() => {
    process.env.MONDAY_LEADS_BOARD_ID = '123'
    process.env.MONDAY_API_TOKEN = 'test-token'
  })

  it('returns the new item ID from the mutation response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        data: { create_item: { id: '9999' } },
      }),
    }) as jest.Mock

    const id = await createLead({
      name: 'New Biz',
      company: 'New Biz Ltd',
      sector: 'Beauty',
      phone: '07700 900000',
      email: 'new@example.com',
    })

    expect(id).toBe('9999')
  })

  it('sends a POST request to the Monday.com API', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      json: async () => ({ data: { create_item: { id: '1' } } }),
    })
    global.fetch = mockFetch as jest.Mock

    await createLead({ name: 'Test', company: 'Test Co', sector: 'Trades' })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.monday.com/v2',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    )
  })
})
