import { NextRequest, NextResponse } from 'next/server'
import { getAllPools, registerPool } from '@/lib/supabase'

// GET — list all tokens launched through The Dojo
export async function GET() {
  try {
    const pools = await getAllPools()
    return NextResponse.json({ pools })
  } catch (e: any) {
    console.error('Failed to load pools:', e)
    return NextResponse.json({ pools: [], error: e.message }, { status: 500 })
  }
}

// POST — register a new token launch
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { address, mint, config, name, symbol, creator, signature, imageUrl } = body

    if (!address || !mint || !name || !symbol) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await registerPool({ address, mint, config, name, symbol, creator, signature, imageUrl })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
