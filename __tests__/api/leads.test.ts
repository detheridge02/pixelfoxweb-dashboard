// Mock next-auth — must include the default export (NextAuth) used at route load time
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({ GET: jest.fn(), POST: jest.fn() }),
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/monday', () => ({
  getLeads: jest.fn(),
  getPipelineSummary: jest.fn(),
}))

import { GET } from '@/app/api/leads/route'
import { getServerSession } from 'next-auth'
import { getLeads, getPipelineSummary } from '@/lib/monday'

const mockGetServerSession = getServerSession as jest.Mock
const mockGetLeads = getLeads as jest.Mock
const mockGetPipelineSummary = getPipelineSummary as jest.Mock

beforeEach(() => jest.clearAllMocks())

// ─── GET /api/leads ───────────────────────────────────────────────────────────

describe('GET /api/leads', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorised')
  })

  it('returns leads and summary when authenticated', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'hello@pixelfoxweb.com' } })

    const leads = [{ id: '1', name: 'Test Biz', sector: 'Trades', status: 'New Lead', estimatedValue: 199 }]
    const summary = { total: 1, newLeads: 1, contacted: 0, attempted: 0, qualified: 0, unqualified: 0, totalValue: 199 }

    mockGetLeads.mockResolvedValue(leads)
    mockGetPipelineSummary.mockResolvedValue(summary)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.leads).toEqual(leads)
    expect(body.summary).toEqual(summary)
  })

  it('fetches leads and summary in parallel (both called once)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'hello@pixelfoxweb.com' } })
    mockGetLeads.mockResolvedValue([])
    mockGetPipelineSummary.mockResolvedValue({ total: 0, totalValue: 0 })

    await GET()

    expect(mockGetLeads).toHaveBeenCalledTimes(1)
    expect(mockGetPipelineSummary).toHaveBeenCalledTimes(1)
  })

  it('returns 500 when Monday.com fetch fails', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'hello@pixelfoxweb.com' } })
    mockGetLeads.mockRejectedValue(new Error('Invalid API token'))

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Invalid API token')
  })
})
