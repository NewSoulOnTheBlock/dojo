# Guild — Website Design Spec

## Overview

**Brand:** Guild
**Tagline:** Craft. Strategy. Mastery.
**Services:** Website Design · Artificial Intelligence · Social Media Strategy
**Target Audience:** Startups & small businesses who want premium digital presence
**Goal:** Lead generation + portfolio showcase

Guild is a digital agency positioned as a collective of elite craftspeople — not a faceless company. The website is itself the first portfolio piece: immersive, interactive, and unapologetically bold.

## Tech Stack

- **Framework:** Next.js (React) with App Router
- **3D/WebGL:** Three.js via `@react-three/fiber` + `@react-three/drei`
- **Styling:** Tailwind CSS (custom theme with Guild brand tokens)
- **Animations:** Framer Motion (scroll-triggered, page transitions) + GSAP (complex timeline sequences)
- **Fonts:** Inter (body), Satoshi (headings) — both available via Fontsource
- **Deployment:** Vercel (natural fit for Next.js)
- **Contact Form:** Next.js API route → email service (Resend or similar)

## Brand Identity

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--black` | `#050505` | Primary background |
| `--black-light` | `#080808` | Alternate section background |
| `--black-card` | `#111111` | Card/surface background |
| `--gold` | `#d4af37` | Primary accent — CTAs, icons, highlights |
| `--gold-dim` | `rgba(212,175,55,0.4)` | Borders, subtle accents |
| `--gold-glow` | `rgba(212,175,55,0.15)` | Glow effects, radial backgrounds |
| `--white` | `#ffffff` | Headings |
| `--white-body` | `rgba(255,255,255,0.45)` | Body text |
| `--white-muted` | `rgba(255,255,255,0.2)` | Tertiary text, footer |

### Typography

| Element | Font | Weight | Size | Letter-Spacing | Transform |
|---------|------|--------|------|-----------------|-----------|
| Hero title | Satoshi | 800 | 72px (desktop) / 40px (mobile) | 16px | uppercase |
| Section title | Satoshi | 700 | 36px / 28px | 4px | uppercase |
| Section label | Body font | 400 | 11px | 8px | uppercase |
| Card title | Satoshi | 600 | 16px | 4px | uppercase |
| Body copy | Inter | 400 | 14px | 0.5px | none |
| CTA buttons | Body font | 700 | 13px | 4px | uppercase |
| Nav links | Body font | 400 | 12px | 3px | uppercase |

### Logo Concept

Shield/crest emblem with an inner diamond shape. References traditional guild heraldry while staying geometric and modern. The shield silhouette is recognizable at favicon size. Gold on black in primary usage, white on black for footer/secondary.

## Site Architecture

### Pages

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Static (SSG) | Single-page home — hero, services, about, portfolio, testimonials, CTA |
| `/case-studies/[slug]` | Dynamic (SSG) | Individual case study deep-dives |
| `/contact` | Static | Contact form + booking info |

### Navigation

- **Desktop:** Fixed top bar, transparent over hero → frosted black glass (`backdrop-filter: blur`) on scroll
- **Logo** (left): Shield icon + "GUILD" wordmark in gold
- **Links** (center): Services · Portfolio · About · Contact — scroll to sections on home, navigate on sub-pages
- **CTA** (right): "Book a Call" — gold outline button, fills gold on hover
- **Mobile:** Hamburger menu → full-screen black overlay with staggered gold link animations

## Home Page Sections

### 1. Hero (Full Viewport)

**Layout:** Full-screen centered content over 3D background

**3D Scene (Three.js / R3F):**
- Slowly rotating crystalline diamond with refraction/reflection shaders (MeshRefractionMaterial from drei)
- Gold particle field (~200 particles) drifting slowly, reacting to cursor proximity
- Cursor position controls a point light that illuminates diamond facets
- Performance: use `PerformanceMonitor` from drei, degrade gracefully on low-end devices

**Content (overlaying 3D):**
- Label: "Craft. Strategy. Mastery." — gold, fade in first
- Title: "GUILD" — white, large, slides up after label
- Divider: Gold gradient line, draws in from center
- Subtitle: "Websites · Artificial Intelligence · Social Media Strategy"
- CTA: "Book a Consultation" — gold outline button
- Scroll indicator: "Scroll" text + gold gradient line at bottom

**Animations:** Staggered reveal on load — label (0s) → title (0.3s) → divider (0.6s) → subtitle (0.8s) → CTA (1.0s) → scroll indicator (1.5s)

### 2. Services

**Layout:** Section header + 3-column card grid

**Background:** Near-black (`#080808`) with subtle gold grid pattern (CSS repeating gradient)

**Section Header:** Gold label "What We Do" → white title "OUR SERVICES" → gold divider line

**Cards (3):**
- Semi-transparent background with gold corner accents (4 corner L-shapes via pseudo-elements)
- Diamond-shaped icon container (rotated 45° square with gold border)
- Service title, description copy, "Learn More →" gold link (scrolls to About section to reinforce the brand, since services don't have dedicated pages)
- AI card elevated (negative margin-top) with gold "Featured" badge

**Services:**

1. **Website Design** — "Bespoke websites that convert visitors into clients. From landing pages to full platforms — designed to perform and built to impress."
2. **Artificial Intelligence** (Featured) — "AI-powered automation, chatbots, and intelligent workflows. We integrate cutting-edge AI into your business to save time and scale smarter."
3. **Social Media Strategy** — "End-to-end social media consulting — from content strategy to execution. We grow your audience, build your brand, and drive real engagement."

**Interactions:**
- Cards slide up on scroll (Framer Motion `whileInView`)
- Icons rotate in from 45° with spring animation
- Gold glow on hover (box-shadow transition)
- Cursor proximity lighting effect (subtle gold radial gradient follows cursor)

### 3. About / Why Guild

**Layout:** 2-column — brand story (left) + differentiators (right)

**Background:** `#080808` with subtle diagonal gold line pattern

**Left Column:**
- Gold label "The Guild"
- Headline: "Built Different. By Design."
- Two paragraphs of brand story copy positioning Guild as a tight collective, not a faceless agency

**Right Column — 3 differentiator blocks:**
Each has a gold left border (2px), light gold tinted background:

1. **No Templates** — "Every project is built from scratch. Your brand deserves its own identity."
2. **AI-Native Thinking** — "We don't bolt AI on. We design with intelligence from day one."
3. **Startup DNA** — "We move fast, communicate clearly, and respect your budget. No corporate bloat."

**Interactions:** Left column fades in from left, differentiator blocks stagger in from right

### 4. Portfolio

**Layout:** Section header + 2x2 card grid + "View All Projects" CTA (scrolls down slightly to reveal the full grid with a subtle animation — no separate portfolio index page needed since there are only 4 demo case studies)

**Background:** `#050505`

**Cards:** Each card is a case study preview:
- Dark tinted background (each project gets a subtle unique color tint)
- Project screenshot/preview placeholder area
- Bottom overlay gradient with project name + service tags in gold
- Gold top-border accent line

**Demo Case Studies:**

1. **NovaPay Fintech** — Website · AI Chatbot
2. **Aura Beauty Co** — Social Media · Strategy
3. **GreenLoop SaaS** — Website · AI Automation
4. **Ember Streetwear** — Full Service

**Interactions:**
- Cards scale up slightly on hover (`scale(1.03)`)
- Gold border sweep animation on hover
- Parallax tilt effect (mouse position → CSS transform perspective)
- Click navigates to `/case-studies/[slug]`

### 5. Testimonials

**Layout:** Centered carousel, one testimonial visible at a time

**Background:** `#050505`

**Content per slide:**
- Large gold quotation mark (48px, low opacity)
- Quote text — italic, light weight, generous line-height
- Client avatar (initials in gold circle), name, title/company
- Carousel indicator dots (gold active, dim inactive)

**Interactions:** Auto-rotates every 6 seconds, pause on hover, swipe on mobile, smooth crossfade transition

**Demo Testimonials:**

1. **Jordan Mitchell, CEO, NovaPay** — "Guild didn't just build us a website — they built us a brand. Our leads tripled in the first month. The AI chatbot alone saves us 20 hours a week."
2. **Priya Sharma, Founder, Aura Beauty** — "Their social media strategy transformed our Instagram from 2K to 45K followers in three months. Every post is on-brand, on-time, and on-point."
3. **Marcus Chen, CTO, GreenLoop** — "We needed a SaaS dashboard that didn't look like every other SaaS dashboard. Guild delivered something our users actually enjoy using."

### 6. Final CTA

**Layout:** Centered text + dual buttons

**Background:** Slight gradient `#080808` → `#0a0805` with gold radial glow centered behind the content

**Content:**
- Gold label "Ready?"
- Headline: "Let's Build Something Extraordinary"
- Subtext: "Book a free consultation. No pitch decks, no fluff — just a real conversation about what you need and how we can help."
- Two buttons: Solid gold "Book a Call" + outlined "Send a Message"

**Interactions:** Text elements fade up on scroll, gold glow pulses subtly

### 7. Footer

**Layout:** Single row — logo (left) + copyright (center) + social icons (right)

**Background:** `#030303` with gold top border (`1px solid rgba(212,175,55,0.08)`)

**Content:** Guild shield logo (small) + "GUILD" wordmark + "© 2026 Guild. All rights reserved." + X, IG, LI icon links

## Case Study Page (`/case-studies/[slug]`)

**Layout:** Full page with consistent Guild nav + footer

**Sections:**
1. **Back navigation:** "← Back to Portfolio" gold link
2. **Header:** Split layout — project description + service tags (left) + animated stat counters (right, 2x2 grid)
3. **Content:** Three-column layout — "The Challenge" → "The Approach" → "The Results"
4. **Next project CTA:** Link to the next case study for continuous browsing

**Stats animate:** Numbers count up from 0 on scroll into view using Framer Motion `useMotionValue` + `useTransform`

**Demo stats (NovaPay):** 340% Lead Increase · 2.1s Load Time · 87% Ticket Deflection · 6 wks Delivery

## Contact Page (`/contact`)

**Layout:** 2-column — form (left) + contact info (right)

**Form Fields:**
- Name (text input)
- Email (email input)
- Service selector (3 toggle pills: Website / AI / Social — multi-select)
- Project description (textarea)
- Submit button: solid gold "Send Message"

**Contact Info (right column):**
- Email: hello@guilddigital.com
- Response time: "Within 24 hours"
- Social links: X, Instagram, LinkedIn (square gold-bordered icons)

**Form Handling:** Next.js API route → Resend (or similar email API) → sends notification to Guild team + confirmation to sender

**Interactions:** Input borders glow gold on focus, service pills toggle with gold fill, submit button has loading state with gold spinner

## Global Interactive Effects

### Cursor Gold Trail
A subtle gold glow follows the cursor across all pages. Implemented as a custom React hook that tracks mouse position and renders a radial gradient via CSS custom properties. Fades on idle.

### Scroll Progress
Thin gold progress bar at the very top of the viewport, fills left-to-right as user scrolls the page.

### Page Transitions
Framer Motion `AnimatePresence` wrapping the Next.js layout — pages fade/slide during route changes with a brief gold flash overlay.

### Smooth Scrolling
`lenis` or native CSS `scroll-behavior: smooth` for anchor link navigation to home page sections.

## Performance Considerations

- **Three.js scene:** Lazy-loaded, renders only when hero is in viewport. Use `PerformanceMonitor` to downgrade particle count and shader complexity on low-end devices.
- **Images:** Next.js `<Image>` with automatic WebP/AVIF, lazy loading for below-fold content
- **Fonts:** Subset and preload heading font, use `font-display: swap`
- **Bundle:** Code-split Three.js into its own chunk (~150KB gzipped), keep main bundle lean
- **Target:** Lighthouse Performance 85+, LCP < 3s, CLS < 0.1

## Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| Desktop (1280px+) | Full layout as designed |
| Tablet (768–1279px) | 2-column grids collapse to single column, nav stays horizontal, 3D scene simplified |
| Mobile (< 768px) | Single column, hamburger nav, hero text scales down, portfolio becomes vertical scroll, testimonials swipe |

## Content Strategy

All copy follows these principles:
- **Tone:** Confident, direct, no corporate jargon. Speak like a sharp founder, not a brochure.
- **Length:** Short paragraphs, punchy sentences. Respect the reader's time.
- **Proof over promise:** Lead with results ("tripled leads") not capabilities ("we can help you grow").
- **CTA language:** Action-oriented but low-pressure ("Book a free consultation", not "Get started now!!!").

## File Structure

```
guild-website/
├── public/
│   ├── fonts/
│   └── images/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout — nav, footer, global effects
│   │   ├── page.tsx            # Home page — all sections
│   │   ├── contact/
│   │   │   └── page.tsx        # Contact page
│   │   ├── case-studies/
│   │   │   └── [slug]/
│   │   │       └── page.tsx    # Dynamic case study page
│   │   └── api/
│   │       └── contact/
│   │           └── route.ts    # Contact form handler
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── MobileMenu.tsx
│   │   ├── hero/
│   │   │   ├── HeroScene.tsx   # Three.js R3F canvas
│   │   │   ├── Diamond.tsx     # 3D diamond model + shaders
│   │   │   ├── Particles.tsx   # Gold particle system
│   │   │   └── HeroContent.tsx # Text overlay
│   │   ├── sections/
│   │   │   ├── Services.tsx
│   │   │   ├── About.tsx
│   │   │   ├── Portfolio.tsx
│   │   │   ├── Testimonials.tsx
│   │   │   └── CTA.tsx
│   │   ├── case-study/
│   │   │   ├── CaseStudyHeader.tsx
│   │   │   ├── StatCounter.tsx
│   │   │   └── CaseStudyContent.tsx
│   │   ├── contact/
│   │   │   ├── ContactForm.tsx
│   │   │   └── ContactInfo.tsx
│   │   └── ui/
│   │       ├── GoldButton.tsx
│   │       ├── SectionHeader.tsx
│   │       ├── CursorTrail.tsx
│   │       ├── ScrollProgress.tsx
│   │       └── PageTransition.tsx
│   ├── data/
│   │   ├── case-studies.ts     # Case study content
│   │   ├── testimonials.ts    # Testimonial content
│   │   └── services.ts        # Service descriptions
│   ├── hooks/
│   │   ├── useCursorPosition.ts
│   │   ├── useScrollProgress.ts
│   │   └── useInView.ts
│   └── styles/
│       └── globals.css         # Tailwind directives + custom properties
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Dependencies

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "@react-three/fiber": "^9",
    "@react-three/drei": "^10",
    "three": "^0.170",
    "framer-motion": "^12",
    "gsap": "^3.12",
    "@studio-freight/lenis": "^1",
    "resend": "^4"
  },
  "devDependencies": {
    "tailwindcss": "^4",
    "typescript": "^5",
    "@types/react": "^19",
    "@types/three": "^0.170"
  }
}
```
