import { Connection, Keypair } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import bs58 from 'bs58'
import {
  DynamicBondingCurveClient,
  buildCurveWithMarketCap,
} from '@meteora-ag/dynamic-bonding-curve-sdk'

const PRIVATE_KEY = '5czoEYj4uyQkS9FGiVcZXNk3bi35YMxJwRjKqerCa7Gb7gM3Ui3CLA6JMMZiugfjexR2St85JP8F2h35YUjZowPb'

async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
  const wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY))
  console.log('Wallet:', wallet.publicKey.toBase58())

  const balance = await connection.getBalance(wallet.publicKey)
  console.log('Balance:', balance / 1e9, 'SOL')

  const client = new DynamicBondingCurveClient(connection, 'confirmed')
  const configKeypair = Keypair.generate()
  const baseMintKeypair = Keypair.generate()

  console.log('Config:', configKeypair.publicKey.toBase58())
  console.log('Base mint:', baseMintKeypair.publicKey.toBase58())

  // Correct types per SDK
  const curveConfig = buildCurveWithMarketCap({
    token: {
      totalTokenSupply: 1_000_000_000,
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 9,
      tokenType: 0,                    // SPL
      tokenUpdateAuthority: 1,         // Immutable
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: 0,                // FeeSchedulerLinear
        feeSchedulerParam: {
          startingFeeBps: 5000,         // 50% starting fee
          endingFeeBps: 100,            // 1% ending fee
          numberOfPeriod: 10,
          totalDuration: 600,           // 10 minutes in seconds
        },
      },
      dynamicFeeEnabled: false,
      collectFeeMode: 0,               // QuoteToken
      creatorTradingFeePercentage: 25,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: 1,              // MET_DAMM_V2
      migrationFeeOption: 0,           // FixedBps25
      migrationFee: {
        feePercentage: 0,
        creatorFeePercentage: 0,
      },
    },
    liquidityDistribution: {
      sqrtPriceBreakpoints: [],
      liquidityWeights: [],
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: 0,                 // Slot-based
    initialMarketCap: 5_000,           // ~33 SOL at $150/SOL
    migrationMarketCap: 300_000,       // ~2000 SOL
  })

  console.log('Curve config built! Keys:', Object.keys(curveConfig))

  // Override LP percentages: 100% permanently locked
  curveConfig.partnerPermanentLockedLiquidityPercentage = 100
  curveConfig.partnerLiquidityPercentage = 0
  curveConfig.creatorLiquidityPercentage = 0
  curveConfig.creatorPermanentLockedLiquidityPercentage = 0

  // Use createConfigAndPoolWithFirstBuy with buyAmount=0 to get split transactions
  try {
    const result = await client.pool.createConfigAndPoolWithFirstBuy({
      payer: wallet.publicKey,
      config: configKeypair.publicKey,
      feeClaimer: wallet.publicKey,
      leftoverReceiver: wallet.publicKey,
      quoteMint: NATIVE_MINT,
      ...curveConfig,
      preCreatePoolParam: {
        baseMint: baseMintKeypair.publicKey,
        name: 'Test Ronin',
        symbol: 'TRONIN',
        uri: 'https://dojo.samuraihaikuu.com/api/meta/tronin',
        poolCreator: wallet.publicKey,
      },
      buyAmount: 0,
    })

    console.log('Split result keys:', Object.keys(result))
    
    const configTx = result.createConfigTx
    const poolTx = result.createPoolWithFirstBuyTx

    // TX 1: Create config
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    configTx.recentBlockhash = blockhash
    configTx.lastValidBlockHeight = lastValidBlockHeight
    configTx.feePayer = wallet.publicKey
    configTx.partialSign(wallet, configKeypair)

    console.log('Config TX size:', configTx.serialize().length, 'bytes')
    const configSig = await connection.sendRawTransaction(configTx.serialize())
    console.log('Config TX sent:', configSig)
    await connection.confirmTransaction({ signature: configSig, blockhash, lastValidBlockHeight }, 'confirmed')
    console.log('Config TX CONFIRMED!')

    // TX 2: Create pool
    const bh2 = await connection.getLatestBlockhash('confirmed')
    poolTx.recentBlockhash = bh2.blockhash
    poolTx.lastValidBlockHeight = bh2.lastValidBlockHeight
    poolTx.feePayer = wallet.publicKey
    poolTx.partialSign(wallet, baseMintKeypair)

    console.log('Pool TX size:', poolTx.serialize().length, 'bytes')
    const poolSig = await connection.sendRawTransaction(poolTx.serialize())
    console.log('Pool TX sent:', poolSig)
    await connection.confirmTransaction({ signature: poolSig, blockhash: bh2.blockhash, lastValidBlockHeight: bh2.lastValidBlockHeight }, 'confirmed')
    console.log('Pool TX CONFIRMED!')

    console.log('\n=== SUCCESS ===')
    console.log('Config:', configKeypair.publicKey.toBase58())
    console.log('Pool:', (await import('@meteora-ag/dynamic-bonding-curve-sdk')).deriveDbcPoolAddress(NATIVE_MINT, baseMintKeypair.publicKey, configKeypair.publicKey).toBase58())
    console.log('Mint:', baseMintKeypair.publicKey.toBase58())

  } catch (err: any) {
    console.error('Error:', err.message)
    if (err.logs) console.error('Logs:', err.logs.join('\n'))
  }
}

main()
