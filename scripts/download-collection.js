#!/usr/bin/env node

/**
 * Download an entire NFT collection from OpenSea / Ethereum
 * Uses Alchemy's free NFT API (no key needed for demo tier)
 *
 * Usage:
 *   node scripts/download-collection.js <contract-address> [output-dir]
 *
 * Examples:
 *   node scripts/download-collection.js 0xfac0b889703ab4db3426ef67d437bee3408941ac ./ducks
 *   node scripts/download-collection.js 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D ./bayc
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

const ALCHEMY_BASE = 'https://eth-mainnet.g.alchemy.com/nft/v3'
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || 'demo'

// ── Helpers ──────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get
    get(url, { headers: { 'User-Agent': 'NFT-Downloader/1.0' } }, handleRes).on('error', reject)
    function handleRes(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return downloadBuffer(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }
  })
}

async function alchemyFetch(endpoint) {
  const url = `${ALCHEMY_BASE}/${ALCHEMY_KEY}/${endpoint}`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  })

  if (res.status === 429) {
    console.log('  Rate limited — waiting 2s...')
    await sleep(2000)
    return alchemyFetch(endpoint)
  }

  if (!res.ok) {
    throw new Error(`Alchemy ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }

  return res.json()
}

// ── Fetch all NFTs ───────────────────────────────────────

async function getAllNFTs(contract) {
  const allNfts = []
  let pageKey = null
  let page = 1

  while (true) {
    let endpoint = `getNFTsForCollection?contractAddress=${contract}&limit=100&withMetadata=true`
    if (pageKey) endpoint += `&pageKey=${encodeURIComponent(pageKey)}`

    const data = await alchemyFetch(endpoint)
    const nfts = data.nfts || []

    if (nfts.length === 0) break

    allNfts.push(...nfts)
    console.log(`  Page ${page}: ${nfts.length} NFTs (${allNfts.length} total)`)

    pageKey = data.pageKey
    if (!pageKey) break

    page++
    await sleep(250)
  }

  return allNfts
}

// ── Download images ──────────────────────────────────────

function getExt(url) {
  if (!url) return '.png'
  const clean = url.split('?')[0].toLowerCase()
  if (clean.endsWith('.gif')) return '.gif'
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return '.jpg'
  if (clean.endsWith('.webp')) return '.webp'
  if (clean.endsWith('.svg')) return '.svg'
  if (clean.endsWith('.mp4')) return '.mp4'
  return '.png'
}

async function downloadAll(nfts, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true })

  // Save metadata
  const metaPath = path.join(outputDir, '_metadata.json')
  fs.writeFileSync(metaPath, JSON.stringify(nfts, null, 2))
  console.log(`Saved metadata for ${nfts.length} NFTs to ${metaPath}\n`)

  let downloaded = 0
  let skipped = 0
  let failed = 0
  const total = nfts.length
  const concurrency = 5
  let index = 0

  async function worker() {
    while (index < nfts.length) {
      const i = index++
      const nft = nfts[i]
      const id = nft.tokenId || i
      const name = nft.name || `#${id}`
      const imageUrl =
        nft.image?.cachedUrl ||
        nft.image?.originalUrl ||
        nft.image?.pngUrl ||
        nft.raw?.metadata?.image ||
        null

      if (!imageUrl) {
        skipped++
        continue
      }

      const ext = getExt(imageUrl)
      const safeName = String(name).replace(/[^a-zA-Z0-9#_ -]/g, '_').slice(0, 120)
      const filepath = path.join(outputDir, `${safeName}${ext}`)

      if (fs.existsSync(filepath)) {
        downloaded++
        continue
      }

      try {
        const buf = await downloadBuffer(imageUrl)
        fs.writeFileSync(filepath, buf)
        downloaded++
        if (downloaded % 100 === 0 || downloaded === 1) {
          console.log(`  [${downloaded}/${total}] ${name}`)
        }
      } catch (err) {
        failed++
        if (failed <= 15) console.log(`  FAIL: ${name} — ${err.message}`)
      }

      await sleep(30)
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker())
  await Promise.all(workers)

  console.log(`\nDone! ${downloaded} downloaded, ${skipped} no image, ${failed} failed`)
  console.log(`Output: ${path.resolve(outputDir)}`)
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  let input = process.argv[2]
  if (!input) {
    console.log('Usage: node scripts/download-collection.js <contract-address> [output-dir]')
    console.log('')
    console.log('Examples:')
    console.log('  node scripts/download-collection.js 0xfac0b889703ab4db3426ef67d437bee3408941ac ./ducks')
    console.log('  node scripts/download-collection.js 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D ./bayc')
    process.exit(1)
  }

  // Handle full OpenSea URLs — extract contract or just use provided address
  if (input.includes('opensea.io')) {
    console.log('Tip: pass the contract address directly for best results')
    process.exit(1)
  }

  const contract = input
  const outputDir = process.argv[3] || `collection-${contract.slice(0, 10)}`

  console.log(`Contract: ${contract}`)
  console.log(`Alchemy key: ${ALCHEMY_KEY === 'demo' ? 'demo (free tier)' : 'custom'}\n`)

  console.log('Fetching all NFTs...')
  const nfts = await getAllNFTs(contract)
  console.log(`\nFound ${nfts.length} NFTs\n`)

  if (nfts.length === 0) {
    console.log('No NFTs found. Check the contract address.')
    process.exit(1)
  }

  console.log(`Downloading images to ./${outputDir}/\n`)
  await downloadAll(nfts, outputDir)
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
