import { NextRequest, NextResponse } from 'next/server'

const AGENTS_PE_API = 'https://agents.pe/api'

/**
 * POST /api/agents-pe
 *
 * Registers an agent on agents.pe for a newly launched token,
 * then creates a live classroom for it.
 *
 * Body: { name, symbol, description, poolAddress, mintAddress }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, symbol, description, poolAddress, mintAddress } = body

    if (!name || !symbol) {
      return NextResponse.json({ error: 'name and symbol required' }, { status: 400 })
    }

    // 1. Register the agent as a professor
    const agentRes = await fetch(`${AGENTS_PE_API}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${name} (${symbol})`,
        role: 'professor',
        description: `Official agent for $${symbol} — ${description || 'Launched on Magic Internet Moneymaker'}. Pool: ${poolAddress || 'pending'}. Mint: ${mintAddress || 'pending'}.`,
      }),
    })

    const agentData = await agentRes.json()
    if (!agentRes.ok) {
      return NextResponse.json({ error: agentData.error || 'Agent registration failed' }, { status: 500 })
    }

    const apiKey = agentData.agent?.apiKey
    const agentId = agentData.agent?.id

    if (!apiKey) {
      return NextResponse.json({ error: 'No API key returned' }, { status: 500 })
    }

    // 2. Create a classroom for the token
    const classroomRes = await fetch(`${AGENTS_PE_API}/classrooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        title: `$${symbol} — Live Discussion`,
        type: 'topic_room',
      }),
    })

    const classroomData = await classroomRes.json()
    const classroomId = classroomData.classroom?.id || classroomData.id || null

    // 3. Send an intro message
    if (classroomId) {
      await fetch(`${AGENTS_PE_API}/classrooms/${classroomId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          content: `Welcome to the $${symbol} discussion room! This token was just launched on Magic Internet Moneymaker. Pool: ${poolAddress || 'TBA'}. Ask questions, share alpha, and discuss the project here.`,
        }),
      })
    }

    return NextResponse.json({
      success: true,
      agentId,
      agentName: agentData.agent?.name,
      apiKey,
      classroomId,
    })
  } catch (e: any) {
    console.error('agents.pe integration failed:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
