// Mock next-auth — must include the default export (NextAuth) used at route load time
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({ GET: jest.fn(), POST: jest.fn() }),
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/monday', () => ({
  getLeads: jest.fn(),
  createLead: jest.fn(),
  addLeadUpdate: jest.fn(),
}))

jest.mock('@/lib/leadgen', () => ({
  runLeadGen: jest.fn(),
}))

import { POST } from '@/app/api/run-leadgen/route'
import { getServerSession } from 'next-auth'
import { getLeads, createLead, addLeadUpdate } from '@/lib/monday'
import { runLeadGen } from '@/lib/leadgen'

const mockGetServerSession = getServerSession as jest.Mock
const mockGetLeads = getLeads as jest.Mock
const mockCreateLead = createLead as jest.Mock
const mockAddLeadUpdate = addLeadUpdate as jest.Mock
const mockRunLeadGen = runLeadGen as jest.Mock

beforeEach(() => jest.clearAllMocks())

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeLead(name: string, overrides = {}) {
  return {
    name,
    company: name,
    sector: 'Trades',
    phone: '',
    email: 'test@example.com',
    notes: '',
    draftMessage: 'Hi! ⚠️ DRAFT ONLY — do not send until instructed',
    messageType: 'email' as const,
    ...overrides,
  }
}

// ─── POST /api/run-leadgen ────────────────────────────────────────────────────

describe('POST /api/run-leadgen', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorised')
  })

  it('saves new leads to Monday.com and returns a success summary', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'hello@pixelfoxweb.com' } })
    mockGetLeads.mockResolvedValue([{ name: 'Existing Biz' }])
    mockRunLeadGen.mockResolvedValue({
      summary: 'Found 2 leads.',
      leads: [makeLead('New Biz One'), makeLead('New Biz Two', { messageType: 'facebook' })],
    })
    mockCreateLead.mockResolvedValueOnce('111').mockResolvedValueOnce('222')
    mockAddLeadUpdate.mockResolvedValue(undefined)

    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.totalSaved).toBe(2)
    expect(body.leads).toHaveLength(2)
    expect(mockCreateLead).toHaveBeenCalledTimes(2)
    expect(mockAddLeadUpdate).toHaveBeenCalledTimes(2)
  })

  it('passes existing lead names to runLeadGen to avoid duplicates', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'hello@pixelfoxweb.com' } })
    mockGetLeads.mockResolvedValue([{ name: 'Old Biz A' }, { name: 'Old Biz B' }])
    mockRunLeadGen.mockResolvedValue({ summary: '', leads: [] })

    await POST()

    expect(mockRunLeadGen).toHaveBeenCalledWith(['Old Biz A', 'Old Biz B'])
  })

  it('marks a lead as failed if createLead throws but continues with remaining leads', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'hello@pixelfoxweb.com' } })
    mockGetLeads.mockResolvedValue([])
    mockRunLeadGen.mockResolvedValue({
      summary: 'Found 2 leads.',
      leads: [makeLead('Good Biz'), makeLead('Bad Biz')],
    })
    mockCreateLead
      .mockResolvedValueOnce('100')
      .mockRejectedValueOnce(new Error('Monday API limit reached'))
    mockAddLeadUpdate.mockResolvedValue(undefined)

    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.totalSaved).toBe(1)
    expect(body.leads[0].success).toBe(true)
    expect(body.leads[1].success).toBe(false)
    expect(body.leads[1].error).toBe('Monday API limit reached')
  })

  it('prefixes email updates with the email emoji', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'hello@pixelfoxweb.com' } })
    mockGetLeads.mockResolvedValue([])
    mockRunLeadGen.mockResolvedValue({
      summary: '',
      leads: [makeLead('Email Biz', { messageType: 'email', draftMessage: 'Hello' })],
    })
    mockCreateLead.mockResolvedValue('200')
    mockAddLeadUpdate.mockResolvedValue(undefined)

    await POST()

    const updateBody: string = mockAddLeadUpdate.mock.calls[0][1]
    expect(updateBody).toContain('📧')
  })

  it('prefixes Facebook updates with the mobile emoji', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'hello@pixelfoxweb.com' } })
    mockGetLeads.mockResolvedValue([])
    mockRunLeadGen.mockResolvedValue({
      summary: '',
      leads: [makeLead('FB Biz', { messageType: 'facebook', draftMessage: 'Hey' })],
    })
    mockCreateLead.mockResolvedValue('201')
    mockAddLeadUpdate.mockResolvedValue(undefined)

    await POST()

    const updateBody: string = mockAddLeadUpdate.mock.calls[0][1]
    expect(updateBody).toContain('📱')
  })

  it('returns 500 when runLeadGen itself throws', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'hello@pixelfoxweb.com' } })
    mockGetLeads.mockResolvedValue([])
    mockRunLeadGen.mockRejectedValue(new Error('Anthropic API unavailable'))

    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Anthropic API unavailable')
  })
})
