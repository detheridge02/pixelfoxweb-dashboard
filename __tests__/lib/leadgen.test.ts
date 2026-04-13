// Use `var` so it hoists above jest.mock (const/let would be in TDZ inside the factory)
// eslint-disable-next-line no-var
var mockCreate: jest.Mock

// jest.mock is hoisted; the `create` closure references mockCreate by variable binding
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: (...args: any[]) => mockCreate(...args),
    },
  })),
}))

import { runLeadGen } from '@/lib/leadgen'

beforeEach(() => {
  // Fresh mock for each test
  mockCreate = jest.fn()
  process.env.ANTHROPIC_API_KEY = 'test-key'
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeLeadGenJSON(overrides?: object) {
  return JSON.stringify({
    leads: [
      {
        name: 'Ashbourne Bakery',
        company: 'Ashbourne Bakery',
        sector: 'Food & Drink',
        phone: '01335 111111',
        email: null,
        websiteUrl: null,
        notes: 'Market Place, Ashbourne. Facebook only.',
        draftMessage: 'Hi there. ⚠️ DRAFT ONLY — do not send until instructed',
        messageType: 'facebook',
      },
    ],
    summary: 'Found 1 new lead in Ashbourne.',
    ...overrides,
  })
}

function mockAnthropicResponse(text: string) {
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text }],
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('runLeadGen', () => {
  it('parses a valid JSON response', async () => {
    mockAnthropicResponse(makeLeadGenJSON())

    const result = await runLeadGen([])

    expect(result.leads).toHaveLength(1)
    expect(result.leads[0].name).toBe('Ashbourne Bakery')
    expect(result.leads[0].messageType).toBe('facebook')
    expect(result.summary).toBe('Found 1 new lead in Ashbourne.')
  })

  it('strips markdown json code fences before parsing', async () => {
    const fenced = '```json\n' + makeLeadGenJSON() + '\n```'
    mockAnthropicResponse(fenced)

    const result = await runLeadGen([])
    expect(result.leads).toHaveLength(1)
  })

  it('strips plain code fences before parsing', async () => {
    const fenced = '```\n' + makeLeadGenJSON() + '\n```'
    mockAnthropicResponse(fenced)

    const result = await runLeadGen([])
    expect(result.leads).toHaveLength(1)
  })

  it('passes existing lead names to the prompt', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: makeLeadGenJSON({ leads: [], summary: 'No new leads.' }) }],
    })

    await runLeadGen(['The Old Pub', 'Hair by Jo'])

    const callArgs = mockCreate.mock.calls[0][0]
    const prompt = callArgs.messages[0].content
    expect(prompt).toContain('The Old Pub')
    expect(prompt).toContain('Hair by Jo')
  })

  it('throws on malformed JSON from the model', async () => {
    mockAnthropicResponse('Sorry, I cannot find any leads right now.')

    await expect(runLeadGen([])).rejects.toThrow()
  })

  it('uses claude-haiku model', async () => {
    mockAnthropicResponse(makeLeadGenJSON())

    await runLeadGen([])

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.model).toMatch(/haiku/)
  })
})
