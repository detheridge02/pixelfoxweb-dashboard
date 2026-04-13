'use client'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Users, TrendingUp, Phone, Mail, Globe,
  PlayCircle, RefreshCw, LogOut, CheckCircle,
  AlertCircle, Clock, XCircle
} from 'lucide-react'

interface Lead {
  id: string
  name: string
  company: string
  sector: string
  status: string
  phone: string
  email: string
  estimatedValue: number
  notes: string
}

interface PipelineSummary {
  total: number
  newLeads: number
  contacted: number
  attempted: number
  qualified: number
  unqualified: number
  totalValue: number
}

type RunStatus = 'idle' | 'running' | 'success' | 'error'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [leads, setLeads] = useState<Lead[]>([])
  const [summary, setSummary] = useState<PipelineSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [runStatus, setRunStatus] = useState<RunStatus>('idle')
  const [runResult, setRunResult] = useState<any>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Fetch leads on mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchLeads()
    }
  }, [status])

  async function fetchLeads() {
    setLoading(true)
    try {
      const res = await fetch('/api/leads')
      const data = await res.json()
      setLeads(data.leads || [])
      setSummary(data.summary || null)
    } catch (err) {
      console.error('Failed to fetch leads:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRunLeadGen() {
    setRunStatus('running')
    setRunResult(null)

    try {
      const res = await fetch('/api/run-leadgen', { method: 'POST' })
      const data = await res.json()

      if (data.error) {
        setRunStatus('error')
        setRunResult(data)
      } else {
        setRunStatus('success')
        setRunResult(data)
        // Refresh leads after successful run
        await fetchLeads()
      }
    } catch (err: any) {
      setRunStatus('error')
      setRunResult({ error: err.message })
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading dashboard...
        </div>
      </div>
    )
  }

  const statusColour: Record<string, string> = {
    'New Lead': 'bg-amber-500/20 text-amber-400',
    'Contacted': 'bg-orange-500/20 text-orange-400',
    'Attempted to contact': 'bg-pink-500/20 text-pink-400',
    'Qualified': 'bg-green-500/20 text-green-400',
    'Unqualified': 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">

      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦊</span>
          <div>
            <h1 className="font-bold text-white">PixelFoxWeb</h1>
            <p className="text-xs text-slate-400">Lead Generation Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{session?.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Lead Gen Button — the hero action */}
        <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/10 border border-orange-500/30 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Daily Lead Generation</h2>
            <p className="text-slate-400 text-sm mt-1">
              Find 5 new local businesses, research contact details, and draft personalised outreach — all in one click.
            </p>
          </div>
          <button
            onClick={handleRunLeadGen}
            disabled={runStatus === 'running'}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/50 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap ml-6"
          >
            {runStatus === 'running' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <PlayCircle className="w-5 h-5" />
                Run Lead Gen
              </>
            )}
          </button>
        </div>

        {/* Run Result */}
        {runResult && (
          <div className={`rounded-xl p-4 border ${
            runStatus === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {runStatus === 'success' ? (
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">
                    ✅ {runResult.totalSaved} new leads added to CRM
                  </p>
                  <p className="text-sm opacity-80 mt-1">{runResult.summary}</p>
                  <ul className="mt-2 space-y-0.5 text-sm">
                    {runResult.leads?.map((l: any) => (
                      <li key={l.name}>
                        {l.success ? '✓' : '✗'} {l.name} — {l.sector}
                        {!l.success && <span className="text-red-400 ml-1">({l.error})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>Error: {runResult.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Pipeline Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Leads"
              value={summary.total}
              icon={<Users className="w-5 h-5" />}
              colour="blue"
            />
            <StatCard
              label="New Leads"
              value={summary.newLeads}
              icon={<Clock className="w-5 h-5" />}
              colour="amber"
            />
            <StatCard
              label="Qualified"
              value={summary.qualified}
              icon={<CheckCircle className="w-5 h-5" />}
              colour="green"
            />
            <StatCard
              label="Pipeline Value"
              value={`£${summary.totalValue.toLocaleString()}`}
              icon={<TrendingUp className="w-5 h-5" />}
              colour="orange"
            />
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">
              Leads ({leads.length})
            </h3>
            <button
              onClick={fetchLeads}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Business</th>
                  <th className="text-left px-6 py-3">Sector</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Contact</th>
                  <th className="text-right px-6 py-3">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{lead.name}</p>
                      {lead.notes && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                          {lead.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400">{lead.sector || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColour[lead.status] || 'bg-slate-700 text-slate-400'}`}>
                        {lead.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-slate-400">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="hover:text-white transition-colors" title={lead.phone}>
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="hover:text-white transition-colors" title={lead.email}>
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                        {!lead.phone && !lead.email && (
                          <span className="text-xs text-slate-600">Facebook only</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-green-400">
                      £{lead.estimatedValue}
                    </td>
                  </tr>
                ))}

                {leads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No leads yet — click <strong>Run Lead Gen</strong> to get started
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({
  label, value, icon, colour
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  colour: 'blue' | 'amber' | 'green' | 'orange'
}) {
  const colours = {
    blue: 'text-blue-400 bg-blue-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    green: 'text-green-400 bg-green-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <div className={`inline-flex p-2 rounded-lg ${colours[colour]} mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}
