'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Coins, ExternalLink, Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw, Zap, Users, TrendingUp, Wallet, Clock } from 'lucide-react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { PublicKey } from '@solana/web3.js'
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import GlowButton from '@/components/GlowButton'

const ADMIN_WALLET = '2NBscCrSMbKNbhBUR3nWUATS31QY7B1tsuN7gb1NgypP'

type ClaimResult = 'idle' | 'claiming' | 'success' | 'error' | 'skipped'

interface PoolRecord {
  address: string
  mint: string
  config: string
  name: string
  symbol: string
  creator: string
  signature: string
  launchedAt: string
}

interface PoolClaimState {
  partnerStatus: ClaimResult
  creatorStatus: ClaimResult
  creationStatus: ClaimResult
  partnerSig: string | null
  creatorSig: string | null
  creationSig: string | null
  error: string | null
}

export default function AdminContent() {
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const { setVisible } = useWalletModal()

  const [pools, setPools] = useState<PoolRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [claimStates, setClaimStates] = useState<Record<string, PoolClaimState>>({})
  const [claimingAll, setClaimingAll] = useState(false)
  const [claimAllProgress, setClaimAllProgress] = useState({ current: 0, total: 0 })
  const [distributing, setDistributing] = useState<string | null>(null)
  const [distResult, setDistResult] = useState<Record<string, { success: boolean; message: string; txSig?: string }>>({})
  const [masterClaiming, setMasterClaiming] = useState(false)
  const [masterProgress, setMasterProgress] = useState({ pool: 0, totalPools: 0, fee: '', successCount: 0, skipCount: 0, errorCount: 0 })
  const [masterDone, setMasterDone] = useState(false)
  const [vaultSolBalance, setVaultSolBalance] = useState(0)
  const [stats, setStats] = useState<{
    totalDistributed: number
    totalClaimed: number
    totalPending: number
    distributionCount: number
    lastDistribution: string | null
    uniqueStakers: number
  } | null>(null)

  const isAdmin = publicKey?.toBase58() === ADMIN_WALLET

  const loadPools = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pools')
      const data = await res.json()
      setPools(data.pools || [])
    } catch (e) {
      console.error('Failed to load pools:', e)
    }
    setLoading(false)
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const [statsRes, solBal] = await Promise.all([
        fetch('/api/admin/stats'),
        connection.getBalance(new PublicKey(ADMIN_WALLET)),
      ])
      const data = await statsRes.json()
      if (statsRes.ok) {
        setStats({
          totalDistributed: Number(data.totalDistributed) / 1e9,
          totalClaimed: Number(data.totalClaimed) / 1e9,
          totalPending: Number(data.totalPending) / 1e9,
          distributionCount: data.distributionCount,
          lastDistribution: data.lastDistribution,
          uniqueStakers: data.uniqueStakers,
        })
      }
      setVaultSolBalance(solBal / 1e9)
    } catch (e) {
      console.error('Failed to load stats:', e)
    }
  }, [connection])

  useEffect(() => {
    loadPools()
    loadStats()
  }, [loadPools, loadStats])

  // Poll vault balance every 15 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const bal = await connection.getBalance(new PublicKey(ADMIN_WALLET))
        setVaultSolBalance(bal / 1e9)
      } catch {}
    }, 15000)
    return () => clearInterval(interval)
  }, [connection])

  const solscan = (addr: string, type = 'account') => `https://solscan.io/${type}/${addr}`

  const claimSingleFee = useCallback(async (
    poolAddress: string,
    feeType: 'partner' | 'creator' | 'creation'
  ): Promise<{ success: boolean; sig?: string; error?: string }> => {
    if (!publicKey || !signTransaction) return { success: false, error: 'Wallet not connected' }

    try {
      const client = new DynamicBondingCurveClient(connection, 'confirmed')
      const BN = (await import('bn.js')).default
      const poolPk = new PublicKey(poolAddress)
      const MAX = new BN('18446744073709551615')

      let tx
      if (feeType === 'partner') {
        tx = await client.partner.claimPartnerTradingFee({
          pool: poolPk,
          feeClaimer: publicKey,
          payer: publicKey,
          maxBaseAmount: MAX,
          maxQuoteAmount: MAX,
        } as any)
      } else if (feeType === 'creator') {
        tx = await client.creator.claimCreatorTradingFee({
          pool: poolPk,
          creator: publicKey,
          payer: publicKey,
          maxBaseAmount: MAX,
          maxQuoteAmount: MAX,
        })
      } else {
        tx = await client.partner.claimPartnerPoolCreationFee({
          virtualPool: poolPk,
          feeReceiver: publicKey,
        })
      }

      if (!tx) return { success: false, error: 'Failed to build tx' }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      tx.recentBlockhash = blockhash
      tx.lastValidBlockHeight = lastValidBlockHeight
      tx.feePayer = publicKey

      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      })
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')

      return { success: true, sig }
    } catch (e: any) {
      const msg = e.message || 'Claim failed'
      if (msg.includes('0x') || msg.includes('insufficient') || msg.includes('nothing') || msg.includes('No fee') || msg.includes('custom program error') || msg.includes('Simulation failed')) {
        return { success: false, error: 'No fees to claim' }
      }
      return { success: false, error: msg }
    }
  }, [publicKey, signTransaction, connection])

  const claimAllFromPool = useCallback(async (poolAddress: string) => {
    const update = (patch: Partial<PoolClaimState>) => {
      setClaimStates(prev => ({
        ...prev,
        [poolAddress]: { ...(prev[poolAddress] || { partnerStatus: 'idle', creatorStatus: 'idle', creationStatus: 'idle', partnerSig: null, creatorSig: null, creationSig: null, error: null }), ...patch }
      }))
    }

    update({ partnerStatus: 'claiming', error: null })
    const partner = await claimSingleFee(poolAddress, 'partner')
    update({
      partnerStatus: partner.success ? 'success' : (partner.error?.includes('No fees') ? 'skipped' : 'error'),
      partnerSig: partner.sig || null,
    })

    update({ creatorStatus: 'claiming' })
    const creator = await claimSingleFee(poolAddress, 'creator')
    update({
      creatorStatus: creator.success ? 'success' : (creator.error?.includes('No fees') ? 'skipped' : 'error'),
      creatorSig: creator.sig || null,
    })

    update({ creationStatus: 'claiming' })
    const creation = await claimSingleFee(poolAddress, 'creation')
    update({
      creationStatus: creation.success ? 'success' : (creator.error?.includes('No fees') ? 'skipped' : 'error'),
      creationSig: creation.sig || null,
    })
  }, [claimSingleFee])

  const claimAllPools = useCallback(async () => {
    if (!publicKey || pools.length === 0) return
    setClaimingAll(true)
    setClaimAllProgress({ current: 0, total: pools.length })

    for (let i = 0; i < pools.length; i++) {
      setClaimAllProgress({ current: i + 1, total: pools.length })
      await claimAllFromPool(pools[i].address)
    }

    setClaimingAll(false)
  }, [publicKey, pools, claimAllFromPool])

  const distributeToStakers = useCallback(async (poolAddress: string) => {
    if (!publicKey) return
    setDistributing(poolAddress)
    try {
      const res = await fetch('/api/rewards/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolAddress,
          adminWallet: publicKey.toBase58(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Distribution failed')

      const solAmount = (Number(data.totalDistributed) / 1e9).toFixed(6)
      setDistResult(prev => ({
        ...prev,
        [poolAddress]: {
          success: true,
          message: `Distributed ${solAmount} SOL to ${data.stakerCount} staker${data.stakerCount !== 1 ? 's' : ''}`,
          txSig: data.claimTxSignature,
        },
      }))
    } catch (e: any) {
      setDistResult(prev => ({
        ...prev,
        [poolAddress]: { success: false, message: e.message },
      }))
    }
    setDistributing(null)
  }, [publicKey])

  const masterClaimAll = useCallback(async () => {
    if (!publicKey || pools.length === 0) return
    setMasterClaiming(true)
    setMasterDone(false)
    const feeTypes: ('partner' | 'creator' | 'creation')[] = ['partner', 'creator', 'creation']
    const feeLabels = { partner: 'Partner', creator: 'Creator', creation: 'Creation' }
    let successCount = 0, skipCount = 0, errorCount = 0

    for (let i = 0; i < pools.length; i++) {
      for (const feeType of feeTypes) {
        setMasterProgress({ pool: i + 1, totalPools: pools.length, fee: `${feeLabels[feeType]} \u2014 ${pools[i].symbol}`, successCount, skipCount, errorCount })
        const result = await claimSingleFee(pools[i].address, feeType)
        if (result.success) successCount++
        else if (result.error?.includes('No fees')) skipCount++
        else errorCount++
      }
    }

    setMasterProgress(p => ({ ...p, successCount, skipCount, errorCount }))
    setMasterClaiming(false)
    setMasterDone(true)
  }, [publicKey, pools, claimSingleFee])

  const statusIcon = (status: ClaimResult) => {
    switch (status) {
      case 'claiming': return <Loader2 size={12} className="text-mim-purple animate-spin" />
      case 'success': return <CheckCircle size={12} className="text-green-500" />
      case 'error': return <XCircle size={12} className="text-red-500" />
      case 'skipped': return <span className="text-mim-ash/60 text-[10px]">{'\u2014'}</span>
      default: return <span className="text-mim-ash/10 text-[10px]">{'\u25CB'}</span>
    }
  }

  return (
    <main className="relative min-h-screen">
      <Navbar />

      <div className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-display font-bold gradient-text">
              {"\uD83E\uDDD9\u200D\u2642\uFE0F\u2728"} Archmage Dashboard {"\u2728\uD83E\uDDD9\u200D\u2642\uFE0F"}
            </h1>
            <p className="text-mim-ash mt-3 text-sm">Tower Administration &mdash; All enchanted pools. Claim magical fees with one click.</p>
          </motion.div>

          {/* Not connected */}
          {!publicKey && (
            <motion.div
              className="text-center py-16 stone rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Shield size={40} className="mx-auto text-mim-purple mb-4" />
              <p className="text-mim-ash mb-4">Connect the Archmage wallet to enter the tower.</p>
              <GlowButton onClick={() => setVisible(true)}>Connect Wallet</GlowButton>
            </motion.div>
          )}

          {/* Wrong wallet */}
          {publicKey && !isAdmin && (
            <motion.div
              className="text-center py-16 rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.08)' }}
            >
              <AlertTriangle size={40} className="mx-auto text-red-500 mb-4" />
              <p className="text-red-500 font-display font-medium mb-2">Unauthorized Wizard Detected</p>
              <p className="text-mim-ash text-sm">Connected: {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}</p>
              <p className="text-mim-ash/40 text-xs mt-2">Only the Archmage may enter.</p>
            </motion.div>
          )}

          {/* Admin Panel */}
          {publicKey && isAdmin && (
            <div className="space-y-8">
              {/* Admin badge */}
              <motion.div
                className="flex items-center gap-3 p-4 rounded-xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ border: '1px solid rgba(139, 92, 246, 0.25)', background: 'rgba(139, 92, 246, 0.06)' }}
              >
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: 'rgba(139, 92, 246, 0.9)', boxShadow: '0 0 12px rgba(139, 92, 246, 0.5)' }} />
                <div className="flex-1">
                  <p className="text-sm font-display font-medium" style={{ color: '#8b5cf6' }}>{"\uD83E\uDDD9\u200D\u2642\uFE0F"} Archmage Connected</p>
                  <p className="text-mim-ash text-xs font-mono">{publicKey.toBase58()}</p>
                </div>
                <button onClick={loadPools} className="text-mim-ash hover:text-cream transition-colors p-2" title="Refresh enchanted pools">
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </motion.div>

              {/* Collection Stats */}
              <motion.div
                className="stone p-6 rounded-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                style={{ borderColor: 'rgba(52, 211, 153, 0.2)', background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.04), rgba(34, 211, 238, 0.04))' }}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-cream font-display font-semibold text-sm flex items-center gap-2">
                    <TrendingUp size={16} style={{ color: '#34d399' }} /> Enchanted Treasury Overview
                  </h2>
                  <button onClick={loadStats} className="text-mim-ash hover:text-cream transition-colors p-1" title="Refresh stats">
                    <RefreshCw size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-5">
                  {/* Enchanter Staking (50%) */}
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={14} style={{ color: '#8b5cf6' }} />
                      <p className="text-mim-ash text-[10px] uppercase tracking-wider">Enchanters (50%)</p>
                    </div>
                    <p className="text-2xl font-display font-bold" style={{ color: '#8b5cf6' }}>
                      {stats ? stats.totalDistributed.toFixed(4) : '\u2014'} <span className="text-xs font-normal text-mim-ash">SOL</span>
                    </p>
                    <p className="text-[10px] text-mim-ash/50 mt-1">
                      Distributed to stakers ({stats?.distributionCount ?? 0} distributions)
                    </p>
                  </div>

                  {/* The Tower (25%) */}
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(52, 211, 153, 0.06)', border: '1px solid rgba(52, 211, 153, 0.15)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet size={14} style={{ color: '#34d399' }} />
                      <p className="text-mim-ash text-[10px] uppercase tracking-wider">The Tower (25%)</p>
                    </div>
                    <p className="text-2xl font-display font-bold" style={{ color: '#34d399' }}>
                      {vaultSolBalance.toFixed(4)} <span className="text-xs font-normal text-mim-ash">SOL</span>
                    </p>
                    <p className="text-[10px] text-mim-ash/50 mt-1">
                      Current vault balance
                    </p>
                  </div>

                  {/* Creator (25%) */}
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(34, 211, 238, 0.06)', border: '1px solid rgba(34, 211, 238, 0.15)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Coins size={14} style={{ color: '#22d3ee' }} />
                      <p className="text-mim-ash text-[10px] uppercase tracking-wider">Summoners (25%)</p>
                    </div>
                    <p className="text-2xl font-display font-bold" style={{ color: '#22d3ee' }}>
                      {stats ? stats.totalDistributed.toFixed(4) : '\u2014'} <span className="text-xs font-normal text-mim-ash">SOL</span>
                    </p>
                    <p className="text-[10px] text-mim-ash/50 mt-1">
                      Matched to staker distributions
                    </p>
                  </div>
                </div>

                {/* Secondary stats row */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(139, 92, 246, 0.03)', border: '1px solid rgba(139, 92, 246, 0.08)' }}>
                    <p className="text-[10px] text-mim-ash/50 mb-1">Claimed by Stakers</p>
                    <p className="text-sm font-display font-bold text-cream">{stats ? stats.totalClaimed.toFixed(4) : '\u2014'} SOL</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(251, 191, 36, 0.03)', border: '1px solid rgba(251, 191, 36, 0.08)' }}>
                    <p className="text-[10px] text-mim-ash/50 mb-1">Pending Rewards</p>
                    <p className="text-sm font-display font-bold" style={{ color: '#fbbf24' }}>{stats ? stats.totalPending.toFixed(4) : '\u2014'} SOL</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(34, 211, 238, 0.03)', border: '1px solid rgba(34, 211, 238, 0.08)' }}>
                    <p className="text-[10px] text-mim-ash/50 mb-1">Active Stakers</p>
                    <p className="text-sm font-display font-bold text-cream">{stats?.uniqueStakers ?? '\u2014'}</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(52, 211, 153, 0.03)', border: '1px solid rgba(52, 211, 153, 0.08)' }}>
                    <p className="text-[10px] text-mim-ash/50 mb-1">Last Distribution</p>
                    <p className="text-sm font-display font-bold text-cream">
                      {stats?.lastDistribution ? new Date(stats.lastDistribution).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Master Claim */}
              <motion.div
                className="stone p-6 rounded-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{ borderColor: 'rgba(139, 92, 246, 0.15)' }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-cream font-display font-semibold text-sm flex items-center gap-2">
                      <Shield size={16} style={{ color: '#8b5cf6' }} /> {"\uD83E\uDDD9\u200D\u2642\uFE0F"} Enchanted Treasury &mdash; Master Claim
                    </h2>
                    <p className="text-mim-ash text-xs mt-1">
                      Sweeps all partner, creator, and creation fees from every enchanted pool directly to the Tower wallet.
                    </p>
                    {masterClaiming && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Loader2 size={12} className="text-mim-purple animate-spin" />
                          <span className="text-cream">Enchanted Pool {masterProgress.pool}/{masterProgress.totalPools}</span>
                          <span className="text-mim-ash/60">&mdash; {masterProgress.fee}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(139, 92, 246, 0.08)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${masterProgress.totalPools ? (masterProgress.pool / masterProgress.totalPools) * 100 : 0}%`,
                              background: 'linear-gradient(90deg, #8b5cf6, #fbbf24)',
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {masterDone && !masterClaiming && (
                      <div className="mt-3 flex items-center gap-4 text-xs">
                        <span className="text-green-500 flex items-center gap-1"><CheckCircle size={12} /> {masterProgress.successCount} fees claimed</span>
                        <span className="text-mim-ash/60">{masterProgress.skipCount} empty offerings</span>
                        {masterProgress.errorCount > 0 && <span className="text-red-500">{masterProgress.errorCount} errors</span>}
                      </div>
                    )}
                  </div>
                  <GlowButton
                    variant="crimson"
                    onClick={masterClaimAll}
                    disabled={masterClaiming || pools.length === 0}
                  >
                    {masterClaiming ? (
                      <><Loader2 size={16} className="animate-spin" /> Claiming...</>
                    ) : (
                      <><Coins size={16} /> Master Claim All</>
                    )}
                  </GlowButton>
                </div>
              </motion.div>

              {/* Claim All Button */}
              <motion.div
                className="stone p-6 rounded-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{ borderColor: 'rgba(139, 92, 246, 0.1)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-cream font-display font-semibold text-sm flex items-center gap-2">
                      <Zap size={16} style={{ color: '#fbbf24' }} /> {"\u2728"} Collect All Fees
                    </h2>
                    <p className="text-mim-ash text-xs mt-1">
                      Claims partner, creator, and creation fees from all {pools.length} enchanted pool{pools.length !== 1 ? 's' : ''} in one ritual.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {claimingAll && (
                      <div className="text-right">
                        <p className="text-sm font-mono" style={{ color: '#8b5cf6' }}>{claimAllProgress.current}/{claimAllProgress.total}</p>
                        <div className="w-32 h-1 rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(139, 92, 246, 0.08)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(claimAllProgress.current / claimAllProgress.total) * 100}%`,
                              background: 'linear-gradient(90deg, #8b5cf6, #fbbf24)',
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <GlowButton
                      variant="gold"
                      onClick={claimAllPools}
                      disabled={claimingAll || pools.length === 0}
                    >
                      {claimingAll ? (
                        <><Loader2 size={16} className="animate-spin" /> Claiming...</>
                      ) : (
                        <><Coins size={16} /> Claim All</>
                      )}
                    </GlowButton>
                  </div>
                </div>
              </motion.div>

              {/* Pool List */}
              <motion.div
                className="stone overflow-hidden rounded-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)' }}>
                  <h2 className="text-sm font-display font-semibold text-cream flex items-center gap-2">
                    {"\uD83E\uDDD9\u200D\u2642\uFE0F\u2728"} All Enchanted Pools
                    <span className="text-mim-ash/60 font-normal">({pools.length})</span>
                  </h2>
                </div>

                {loading ? (
                  <div className="p-12 text-center">
                    <Loader2 size={24} className="mx-auto animate-spin mb-3" style={{ color: '#8b5cf6' }} />
                    <p className="text-mim-ash text-sm">Consulting the enchanted scrolls...</p>
                  </div>
                ) : pools.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-mim-ash/60 text-sm">No enchanted pools enchanted yet.</p>
                    <p className="text-mim-ash/40 text-xs mt-1">Pools are auto-enchanted when launched through the Tower.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-mim-ink/50">
                    {pools.map((pool, idx) => {
                      const cs = claimStates[pool.address]
                      return (
                        <div key={pool.address} className="p-4 transition-colors rounded-xl" style={{ ['--tw-bg-opacity' as any]: 1 }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-cream font-bold text-sm">{pool.name}</span>
                                <span className="text-xs font-mono" style={{ color: '#8b5cf6' }}>${pool.symbol}</span>
                                <span className="text-mim-ash/40 text-[10px]">#{idx + 1}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-mim-ash/60">
                                <a href={solscan(pool.address)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-mono transition-colors" style={{ color: 'rgba(138, 126, 136, 0.6)' }} onMouseEnter={e => (e.currentTarget.style.color = '#8b5cf6')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(138, 126, 136, 0.6)')}>
                                  Pool: {pool.address.slice(0, 8)}...{pool.address.slice(-6)} <ExternalLink size={9} />
                                </a>
                                <a href={solscan(pool.mint)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-mono transition-colors" style={{ color: 'rgba(138, 126, 136, 0.6)' }} onMouseEnter={e => (e.currentTarget.style.color = '#22d3ee')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(138, 126, 136, 0.6)')}>
                                  Mint: {pool.mint.slice(0, 8)}...{pool.mint.slice(-6)} <ExternalLink size={9} />
                                </a>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-mim-ash/40 mt-1">
                                <span>Summoner: {pool.creator.slice(0, 6)}...{pool.creator.slice(-4)}</span>
                                <span>Enchanted: {new Date(pool.launchedAt).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-1.5" title="Partner fee">
                                {statusIcon(cs?.partnerStatus || 'idle')}
                                <span className="text-[10px] text-mim-ash/60">P</span>
                              </div>
                              <div className="flex items-center gap-1.5" title="Creator fee">
                                {statusIcon(cs?.creatorStatus || 'idle')}
                                <span className="text-[10px] text-mim-ash/60">C</span>
                              </div>
                              <div className="flex items-center gap-1.5" title="Creation offering">
                                {statusIcon(cs?.creationStatus || 'idle')}
                                <span className="text-[10px] text-mim-ash/60">F</span>
                              </div>

                              <button
                                onClick={() => claimAllFromPool(pool.address)}
                                disabled={claimingAll || cs?.partnerStatus === 'claiming' || cs?.creatorStatus === 'claiming' || cs?.creationStatus === 'claiming'}
                                className="ml-2 px-3 py-1.5 text-[11px] text-mim-ash rounded-xl
                                  transition-all
                                  disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{ border: '1px solid rgba(139, 92, 246, 0.1)' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'; e.currentTarget.style.color = '#8b5cf6'; e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.1)'; e.currentTarget.style.color = ''; e.currentTarget.style.background = 'transparent' }}
                              >
                                Claim
                              </button>

                              <button
                                onClick={() => distributeToStakers(pool.address)}
                                disabled={distributing === pool.address}
                                className="px-3 py-1.5 text-[11px] text-mim-ash rounded-xl
                                  transition-all
                                  disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                                style={{ border: '1px solid rgba(139, 92, 246, 0.1)' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52, 211, 153, 0.3)'; e.currentTarget.style.color = '#34d399'; e.currentTarget.style.background = 'rgba(52, 211, 153, 0.05)' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.1)'; e.currentTarget.style.color = ''; e.currentTarget.style.background = 'transparent' }}
                              >
                                {distributing === pool.address ? (
                                  <><Loader2 size={10} className="animate-spin" /> Distributing</>
                                ) : (
                                  <><Users size={10} /> Distribute</>
                                )}
                              </button>
                            </div>
                          </div>

                          {cs && (cs.partnerSig || cs.creatorSig || cs.creationSig) && (
                            <div className="mt-2 pt-2 border-t border-mim-ink/50 flex flex-wrap gap-3 text-[10px]">
                              {cs.partnerSig && (
                                <a href={solscan(cs.partnerSig, 'tx')} target="_blank" rel="noopener noreferrer" className="text-green-500/70 hover:text-green-500 flex items-center gap-1">
                                  Partner TX: {cs.partnerSig.slice(0, 12)}... <ExternalLink size={8} />
                                </a>
                              )}
                              {cs.creatorSig && (
                                <a href={solscan(cs.creatorSig, 'tx')} target="_blank" rel="noopener noreferrer" className="text-green-500/70 hover:text-green-500 flex items-center gap-1">
                                  Creator TX: {cs.creatorSig.slice(0, 12)}... <ExternalLink size={8} />
                                </a>
                              )}
                              {cs.creationSig && (
                                <a href={solscan(cs.creationSig, 'tx')} target="_blank" rel="noopener noreferrer" className="text-green-500/70 hover:text-green-500 flex items-center gap-1">
                                  Creation TX: {cs.creationSig.slice(0, 12)}... <ExternalLink size={8} />
                                </a>
                              )}
                            </div>
                          )}

                          {distResult[pool.address] && (
                            <div className={`mt-2 pt-2 border-t border-mim-ink/50 text-[10px] flex items-center gap-2 ${
                              distResult[pool.address].success ? 'text-mim-purple' : 'text-red-500'
                            }`}>
                              {distResult[pool.address].success ? <CheckCircle size={10} /> : <XCircle size={10} />}
                              <span>{distResult[pool.address].message}</span>
                              {distResult[pool.address].txSig && distResult[pool.address].txSig !== 'manual' && (
                                <a href={solscan(distResult[pool.address].txSig!, 'tx')} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                  TX <ExternalLink size={8} />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.div>

              {/* Fee Info */}
              <motion.div className="stone p-5 rounded-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                <h3 className="text-mim-ash text-xs mb-3 font-display">{"\u2728"} Fee Alchemy Structure</h3>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="font-display font-bold text-lg" style={{ color: '#8b5cf6' }}>50%</p>
                    <p className="text-cream">Enchanter Staking</p>
                    <p className="text-mim-ash/60">Always flowing</p>
                  </div>
                  <div>
                    <p className="font-display font-bold text-lg" style={{ color: '#34d399' }}>25%</p>
                    <p className="text-cream">The Tower</p>
                    <p className="text-mim-ash/60">Always flowing</p>
                  </div>
                  <div>
                    <p className="font-display font-bold text-lg" style={{ color: '#22d3ee' }}>25%</p>
                    <p className="text-cream">Summoner (Creator)</p>
                    <p className="text-mim-ash/60">After transmutation completes</p>
                  </div>
                </div>
                <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(139, 92, 246, 0.08)' }}>
                  <p className="text-mim-ash/40 text-[10px]">
                    <strong className="text-mim-ash">P</strong> = Partner trading fee (Tower share) &middot; <strong className="text-mim-ash">C</strong> = Creator trading fee &middot; <strong className="text-mim-ash">F</strong> = Pool creation offering (free)
                  </p>
                  <p className="text-mim-ash/40 text-[10px] mt-1">
                    <strong className="text-mim-ash">{'\u2014'}</strong> = No fees to claim &middot; Enchanted pools are auto-enchanted when launched through the Magic Internet Moneymaker.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
