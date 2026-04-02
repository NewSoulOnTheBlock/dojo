# AI PR Engine — Design Spec

## Overview

An AI-powered scraper/CRM/outreach system for a bootstrapped PR agency targeting small local businesses. The system finds local journalists, builds intelligence profiles on them, generates personalized content, and manages email outreach — all from a CLI interface.

The founder is a developer, building solo, starting from zero journalist relationships in a single metro area.

## Business Model

- **Clients:** Small/local businesses (restaurants, shops, service companies)
- **Service:** Guaranteed media placement in local publications
- **Channels:** Hybrid — earned media (relationship-based pitching) + paid (sponsored/contributed content)
- **Outreach:** Email-first

## Architecture

Four core modules sharing a PostgreSQL database:

### Module 1: Journalist Scraper

Builds journalist profiles from multiple public sources.

**Sources:**
- Local publication websites — staff pages, bylines, article metadata
- Twitter/X — bios, posting patterns, beat signals
- Cross-referenced into unified profiles via entity resolution (name + publication + email matching)

**What it extracts per journalist:**
- Name, email, phone (if public)
- Publication and role
- Beat / topics covered (AI-inferred from recent articles)
- Writing style and tone (AI-analyzed)
- Recent article summaries
- Social handles

**Freshness:** Weekly re-scrapes for new articles, monthly for profile data.

**Tech:** Playwright for JS-heavy sites, httpx + BeautifulSoup for simple pages. Claude API for article analysis and enrichment. Celery tasks for scheduled scraping.

### Module 2: Journalist CRM

Turns raw scraped data into actionable relationship intelligence.

**Profile fields:**
- Identity: name, email, phone, publication, social handles, bio
- Intelligence: beat, topics[], writing_style, recent_articles[]
- Relationship: status, warmth_score (0-100), interaction_history[]
- Tags: AI-generated (e.g., "covers restaurants", "prefers data-driven stories")
- Notes: manual overrides and context

**Relationship pipeline:**
`unknown → identified → contacted → responded → warm → active → advocate`

Each transition logged with timestamp and context.

**Warmth scoring algorithm inputs:**
- Recency of last contact
- Response rate to pitches
- Tone of responses (AI-classified)
- Number of placements made through them
- Engagement with follow-ups

AI recalculates after each interaction.

**Search & filtering:** Full-text search across profiles, filter by beat/tags/warmth/status/publication.

### Module 3: AI Content Engine

Generates all outreach content using Claude API. Human approves everything before sending.

**Content types:**
- **Pitch emails** — personalized per journalist. AI reads their recent articles, matches their tone, explains why this specific journalist should care about this specific client story. Not templates with mail-merge.
- **Press releases** — client story intake → polished AP-style press release. Structured input form: what happened, why it matters, key quotes, supporting details.
- **Guest articles** — contributed content drafted in the client's voice for publications that accept them. Longer form, needs more human editing.
- **Follow-up sequences** — 2-3 follow-ups per pitch, each with a different angle or new information. Not "just checking in" emails.

**Style matching:** AI studies each journalist's published work and adjusts pitch tone. Casual for bloggers, formal for newspaper reporters, data-heavy for business journalists.

**Review queue:** All generated content enters a review queue. Nothing sends without explicit approval.

### Module 4: Outreach & Tracking

Delivers emails and captures the feedback loop.

**Sending:**
- SMTP via Resend (or Amazon SES)
- Send from custom domain for deliverability
- Rate limiting: 10-20 emails/day at launch, scale gradually
- AI-suggested send times (default: Tue-Thu mornings)

**Tracking:**
- Open tracking (pixel)
- Click tracking (link wrapping)
- Reply detection via IMAP polling
- AI reply classification: `interested`, `not_now`, `pass`, `out_of_office`, `wrong_person`

**Follow-ups:**
- No open after 3 days → queue follow-up #1
- Opened, no reply after 5 days → queue follow-up #2
- All follow-ups require manual approval before sending

**Bounce management:** Track bounces, auto-suppress bad addresses, monitor sender reputation.

**Placement tracking (deferred to post-MVP):** RSS monitoring of publications for published articles matching campaign topics.

## Data Model

### journalists
- id, name, email, phone
- publication_id (FK)
- beat, topics[] (text array)
- writing_style (text — AI summary)
- warmth_score (integer 0-100)
- status (enum: unknown, identified, contacted, responded, warm, active, advocate)
- twitter_handle, linkedin_url
- last_contacted (timestamp)
- notes (text)
- created_at, updated_at

### publications
- id, name, url
- type (enum: newspaper, tv_station, blog, magazine)
- market (text — metro area)
- circulation_estimate (integer)
- accepts_contributed (boolean)
- has_sponsored_content (boolean)
- scrape_config (jsonb — URLs to crawl, selectors, schedule)
- created_at, updated_at

### articles
- id, journalist_id (FK), publication_id (FK)
- title, url, published_at
- content_summary (text — AI-generated)
- topics[] (text array — AI-extracted)
- scraped_at

### campaigns
- id, client_name, client_business
- story_summary (text)
- story_details (jsonb — structured intake)
- press_release (text — generated)
- status (enum: draft, active, complete)
- created_at, deadline

### outreach
- id, campaign_id (FK), journalist_id (FK)
- email_subject, email_body
- content_type (enum: pitch, follow_up_1, follow_up_2, follow_up_3)
- status (enum: draft, approved, sent, opened, replied, placed)
- sent_at, opened_at, replied_at
- reply_classification (enum: interested, not_now, pass, out_of_office, wrong_person)
- placement_url (text, nullable)
- created_at

### interactions
- id, journalist_id (FK), outreach_id (FK, nullable)
- type (enum: email_sent, email_opened, reply_received, placement, note)
- details (text)
- created_at

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Backend | Python + FastAPI | Best scraping ecosystem, async |
| Database | PostgreSQL | Structured data, full-text search, jsonb |
| Scraping | Playwright + httpx/BeautifulSoup | JS-heavy + simple pages |
| AI | Claude API | Article analysis, content gen, classification |
| Email sending | Resend | Simple API, good deliverability |
| Email reading | IMAP polling | Reply detection |
| Task queue | Celery + Redis | Scrape jobs, email scheduling |
| Frontend | CLI (Phase 1), React (Phase 2) | Solo operator doesn't need web UI yet |
| Hosting | VPS (Hetzner or DigitalOcean) | Cheap, full control |

## CLI Interface

The primary interface is a CLI tool (`pr`):

```
pr scrape --market "city-name"          # crawl local publications, build profiles
pr scrape --refresh                     # re-scrape existing publications for new articles
pr journalists list                     # list all journalists
pr journalists search "restaurants"     # search by beat/topic
pr journalists show 5                   # full profile for journalist #5
pr campaign create --client "Bob's BBQ" # interactive story intake
pr campaign list                        # list campaigns
pr pitch --campaign 1 --journalist 5    # generate pitch, show for approval
pr pitch --campaign 1 --auto-match      # AI picks best journalists, generates pitches
pr review                               # review queue: approve/edit/reject pending content
pr send --campaign 1                    # send approved pitches
pr status --campaign 1                  # open/reply/placement status
pr followup --campaign 1               # generate follow-ups for non-responders
```

## MVP Scope

### In MVP
- Scrape one metro area's local publications (websites + Twitter)
- AI article analysis for beat/style detection
- Journalist CRM with search, tags, warmth scoring
- AI pitch email generation (personalized per journalist)
- AI press release generation
- Email sending with open tracking
- Reply detection & AI classification
- Manual follow-up triggers
- CLI-based workflow

### Deferred
- LinkedIn scraping
- Guest article generation
- Automated follow-up sequences (currently manual trigger)
- Placement monitoring via RSS
- Web UI / React admin panel
- Client portal & onboarding
- Multi-market support
- A/B testing of pitches

## Key Constraints

- **Human-in-the-loop:** All generated content requires manual approval before sending.
- **Low volume launch:** 10-20 outbound emails per day to protect domain reputation.
- **One market:** MVP targets a single metro area to constrain scope.
- **Email only:** No social DMs or multi-channel outreach in MVP.
- **Legal compliance:** Sponsored/contributed content clearly labeled. No undisclosed pay-for-play.
