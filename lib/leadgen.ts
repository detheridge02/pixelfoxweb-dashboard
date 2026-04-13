// lib/leadgen.ts
// Runs the lead generation workflow using Claude Haiku

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface LeadGenResult {
  leads: GeneratedLead[]
  summary: string
}

export interface GeneratedLead {
  name: string
  company: string
  sector: string
  phone?: string
  email?: string
  websiteUrl?: string
  notes: string
  draftMessage: string
  messageType: 'email' | 'facebook'
}

export async function runLeadGen(
  existingLeadNames: string[],
  onChunk?: (text: string) => void
): Promise<LeadGenResult> {

  const existingList = existingLeadNames.join(', ')

  const prompt = `You are managing the lead pipeline for PixelFoxWeb, a web design business in Ashbourne, Derbyshire, DE6 1FY.

EXISTING LEADS (do not suggest these): ${existingList}

YOUR TASK:
Find 5 new local small businesses in Ashbourne, Derbyshire that have no website or only a Facebook presence. Use discoverashbourne.com/directory as your primary source (no web icon = no website).

Target sectors: trades, beauty, health, pets, hospitality, food & drink.

For each lead, provide:
1. Business name
2. Sector/type
3. Phone (if findable)
4. Email (if findable)  
5. Facebook URL (if Facebook-only)
6. Brief notes (address, context)
7. A personalised draft outreach message (email or Facebook DM)
   - Reference their specific business type
   - Mention: normally £199 + £9/month, until end of May just £99 + £9/month, includes .co.uk or .com domain
   - Sign off as Dave, PixelFoxWeb, Ashbourne, Derbyshire
   - End with: ⚠️ DRAFT ONLY — do not send until instructed

RULES:
- Never suggest businesses already in the existing leads list
- Never suggest businesses with a working website
- Only businesses genuinely in or around Ashbourne, Derbyshire

Respond ONLY with valid JSON in this exact format:
{
  "leads": [
    {
      "name": "Business Name",
      "company": "Business Name",
      "sector": "Sector Type",
      "phone": "01335 000000 or null",
      "email": "email@example.com or null",
      "websiteUrl": "https://facebook.com/... or null",
      "notes": "Address and context",
      "draftMessage": "Full draft message text",
      "messageType": "email or facebook"
    }
  ],
  "summary": "Brief summary of what was found"
}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as any).text)
    .join('')

  // Strip any markdown code fences
  const clean = rawText.replace(/```json|```/g, '').trim()

  const result: LeadGenResult = JSON.parse(clean)
  return result
}
