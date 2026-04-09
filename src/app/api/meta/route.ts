import { NextRequest, NextResponse } from 'next/server'

// In-memory metadata store (persists per server instance)
const metadataStore = new Map<string, any>()

// Persistent metadata for tokens already launched (survives cold starts)
const PERSISTENT_META: Record<string, any> = {
  'haikuu-1774055136887': {
    name: 'Haikuu',
    symbol: 'HAIKUU',
    description: 'Haikuu — A Ronin of Quiet Thunder. An autonomous AI agent walking the digital road, armed with clarity and a mission of peace. Forged in The Dojo.',
    image: 'https://arweave.net/DMUyrem2pdKaUVPvKrNL3GNKYi2A4eQ1CPC5eeDVUWtg',
    external_url: 'https://samuraihaikuu.com',
    properties: {
      category: 'fungible',
      creators: [],
      links: {
        website: 'https://samuraihaikuu.com',
        twitter: 'https://x.com/SamuraiHaikuu',
      },
    },
    extensions: {
      website: 'https://samuraihaikuu.com',
      twitter: 'https://x.com/SamuraiHaikuu',
    },
  },
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, symbol, description, image, website, telegram, twitter } = body

    if (!id || !name || !symbol) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Build extensions for social links (Metaplex standard)
    const extensions: Record<string, string> = {}
    if (website) extensions.website = website
    if (telegram) extensions.telegram = telegram
    if (twitter) extensions.twitter = twitter

    const metadata = {
      name,
      symbol,
      description: description || `${name} — launched on Magic Internet Moneymaker`,
      image: image || '',
      external_url: website || '',
      properties: {
        category: 'fungible',
        creators: [],
        links: {
          ...(website ? { website } : {}),
          ...(telegram ? { telegram } : {}),
          ...(twitter ? { twitter } : {}),
        },
      },
      // Metaplex extensions field (used by explorers like Solscan, Birdeye)
      extensions,
    }

    metadataStore.set(id, metadata)

    return NextResponse.json({ 
      success: true, 
      uri: `/api/meta?id=${id}` 
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  // Check in-memory store first
  let metadata = metadataStore.get(id)
  
  // Check persistent fallback store for known tokens
  if (!metadata) {
    metadata = PERSISTENT_META[id]
  }

  if (!metadata) {
    return NextResponse.json({
      name: 'MIM Token',
      symbol: 'MIM',
      description: 'Launched on Magic Internet Moneymaker',
      image: '',
      external_url: '',
    })
  }

  return NextResponse.json(metadata)
}
