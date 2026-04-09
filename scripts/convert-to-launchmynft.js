#!/usr/bin/env node

/**
 * Convert downloaded NFT collection to LaunchMyNFT format
 *
 * LaunchMyNFT expects:
 *   images/  → 1.png, 2.png, 3.png ...
 *   metadata/ → 1.json, 2.json, 3.json ...
 *
 * Each JSON:
 *   { "name": "...", "description": "...", "image": "1.png", "attributes": [...] }
 *
 * Usage:
 *   node scripts/convert-to-launchmynft.js ./indifferent-ducks ./indifferent-ducks-lmnft
 */

const fs = require('fs')
const path = require('path')

const inputDir = process.argv[2] || './indifferent-ducks'
const outputDir = process.argv[3] || `${inputDir}-lmnft`

const imagesDir = path.join(outputDir, 'images')
const metadataDir = path.join(outputDir, 'metadata')

// ── Load metadata ────────────────────────────────────────

const metaPath = path.join(inputDir, '_metadata.json')
if (!fs.existsSync(metaPath)) {
  console.error(`Metadata not found: ${metaPath}`)
  process.exit(1)
}

const raw = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
console.log(`Loaded ${raw.length} items from ${metaPath}`)

// ── Build sorted list by tokenId ─────────────────────────

const items = raw.map(entry => {
  const token = entry.token || entry
  const rawMeta = token.raw?.metadata || {}
  return {
    tokenId: parseInt(token.tokenId, 10) || 0,
    name: rawMeta.name || token.name || '',
    description: rawMeta.description || token.description || '',
    attributes: rawMeta.attributes || [],
    originalName: token.name || '',
    // Find the downloaded image file
    imageExt: '.png',
  }
}).sort((a, b) => a.tokenId - b.tokenId)

// ── Build a map of existing downloaded images ────────────

const existingFiles = new Set(fs.readdirSync(inputDir))

function findImageFile(item) {
  // Try common naming patterns from the downloader
  const safeName = String(item.originalName).replace(/[^a-zA-Z0-9#_ -]/g, '_').slice(0, 120)
  const candidates = [
    `${safeName}.png`,
    `${safeName}.jpg`,
    `${safeName}.gif`,
    `${safeName}.webp`,
  ]
  for (const c of candidates) {
    if (existingFiles.has(c)) return { file: c, ext: path.extname(c) }
  }
  return null
}

// ── Create output directories ────────────────────────────

fs.mkdirSync(imagesDir, { recursive: true })
fs.mkdirSync(metadataDir, { recursive: true })

// ── Process each item ────────────────────────────────────

let copied = 0
let skipped = 0
let num = 1

for (const item of items) {
  const found = findImageFile(item)

  if (!found) {
    skipped++
    continue
  }

  const ext = found.ext // .png, .jpg, etc.
  const imgFilename = `${num}${ext}`

  // Copy image → images/1.png
  fs.copyFileSync(
    path.join(inputDir, found.file),
    path.join(imagesDir, imgFilename)
  )

  // Write metadata → metadata/1.json
  const metadata = {
    name: item.name,
    description: item.description,
    image: imgFilename,
    attributes: item.attributes.map(a => ({
      trait_type: a.trait_type || a.traitType || '',
      value: a.value || '',
    })),
  }

  fs.writeFileSync(
    path.join(metadataDir, `${num}.json`),
    JSON.stringify(metadata, null, 2)
  )

  copied++
  num++

  if (copied % 500 === 0) {
    console.log(`  Processed ${copied}...`)
  }
}

console.log(`\nDone!`)
console.log(`  Copied: ${copied} NFTs`)
console.log(`  Skipped: ${skipped} (no image found)`)
console.log(`  Images:   ${path.resolve(imagesDir)}`)
console.log(`  Metadata: ${path.resolve(metadataDir)}`)
console.log(`\nReady to upload to LaunchMyNFT!`)
