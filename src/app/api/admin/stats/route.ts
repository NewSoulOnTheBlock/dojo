import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/admin/stats
 *
 * Returns aggregate fee collection stats:
 * - Total distributed to stakers (from fee_distributions)
 * - Total claimed by stakers (from rewards where status=claimed)
 * - Total pending for stakers (from rewards where status=pending)
 */
export async function GET() {
  try {
    // Total distributed to stakers across all distributions
    const { data: distData, error: distErr } = await supabase
      .from('fee_distributions')
      .select('total_sol_lamports, created_at')
      .order('created_at', { ascending: false })

    if (distErr) throw new Error(distErr.message)

    const totalDistributed = (distData ?? []).reduce(
      (sum, d) => sum + BigInt(d.total_sol_lamports),
      0n
    )
    const distributionCount = distData?.length ?? 0
    const lastDistribution = distData?.[0]?.created_at ?? null

    // Total claimed by stakers
    const { data: claimedData, error: claimedErr } = await supabase
      .from('rewards')
      .select('amount_lamports')
      .eq('status', 'claimed')

    if (claimedErr) throw new Error(claimedErr.message)

    const totalClaimed = (claimedData ?? []).reduce(
      (sum, r) => sum + BigInt(r.amount_lamports),
      0n
    )

    // Total pending for stakers
    const { data: pendingData, error: pendingErr } = await supabase
      .from('rewards')
      .select('amount_lamports')
      .eq('status', 'pending')

    if (pendingErr) throw new Error(pendingErr.message)

    const totalPending = (pendingData ?? []).reduce(
      (sum, r) => sum + BigInt(r.amount_lamports),
      0n
    )

    // Unique staker count
    const { data: stakerData, error: stakerErr } = await supabase
      .from('stake_balances')
      .select('wallet')

    if (stakerErr) throw new Error(stakerErr.message)
    const uniqueStakers = new Set((stakerData ?? []).map(s => s.wallet)).size

    return NextResponse.json({
      totalDistributed: totalDistributed.toString(),
      totalClaimed: totalClaimed.toString(),
      totalPending: totalPending.toString(),
      distributionCount,
      lastDistribution,
      uniqueStakers,
    })
  } catch (e: any) {
    console.error('Admin stats failed:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
