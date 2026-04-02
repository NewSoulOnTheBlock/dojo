# AI PR Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI-driven AI PR engine that scrapes local journalist data, manages a relationship CRM, generates personalized content via Claude, and sends/tracks email outreach.

**Architecture:** Four modules (scraper, CRM, content engine, outreach) sharing a PostgreSQL database, orchestrated through a Typer CLI. AI operations use the Claude API. Email via Resend + IMAP. Background jobs via Celery + Redis.

**Tech Stack:** Python 3.12, FastAPI (internal API), Typer (CLI), SQLAlchemy 2.0 + Alembic, PostgreSQL, Playwright, httpx, BeautifulSoup4, Anthropic Python SDK, Resend, Celery + Redis, pytest.

---

## File Structure

```
ai-pr-engine/
├── pyproject.toml
├── .env.example
├── alembic.ini
├── alembic/
│   └── env.py
├── src/
│   └── pr/
│       ├── __init__.py
│       ├── cli/
│       │   ├── __init__.py
│       │   ├── main.py               # Typer app, top-level command groups
│       │   ├── scrape.py             # pr scrape commands
│       │   ├── journalists.py        # pr journalists commands
│       │   ├── campaigns.py          # pr campaign commands
│       │   ├── pitches.py            # pr pitch commands
│       │   ├── review.py             # pr review commands
│       │   ├── outreach.py           # pr send / status / followup commands
│       │   └── display.py            # Rich console formatting helpers
│       ├── config.py                 # Pydantic Settings (env vars)
│       ├── db.py                     # SQLAlchemy engine + session factory
│       ├── models.py                 # All SQLAlchemy ORM models
│       ├── scraper/
│       │   ├── __init__.py
│       │   ├── publications.py       # Crawl publication websites for staff/articles
│       │   ├── twitter.py            # Scrape Twitter/X profiles
│       │   ├── enrichment.py         # AI analysis of articles (beat, style, topics)
│       │   └── resolver.py           # Entity resolution — merge profiles across sources
│       ├── crm/
│       │   ├── __init__.py
│       │   ├── profiles.py           # CRUD for journalist profiles
│       │   ├── warmth.py             # Warmth scoring algorithm
│       │   └── search.py             # Full-text search + filtering
│       ├── content/
│       │   ├── __init__.py
│       │   ├── pitches.py            # AI pitch email generation
│       │   ├── press_releases.py     # AI press release generation
│       │   ├── followups.py          # AI follow-up generation
│       │   └── review_queue.py       # Content review queue (approve/edit/reject)
│       ├── outreach/
│       │   ├── __init__.py
│       │   ├── sender.py             # Email sending via Resend
│       │   ├── tracker.py            # Open/click tracking pixel + link wrapping
│       │   ├── replies.py            # IMAP reply detection + AI classification
│       │   └── scheduler.py          # Rate limiting + send time optimization
│       └── ai/
│           ├── __init__.py
│           └── client.py             # Claude API wrapper — all prompts live here
└── tests/
    ├── conftest.py                   # Fixtures: test DB, sessions, factories
    ├── test_models.py
    ├── factories.py                  # Factory functions for test data
    ├── test_scraper/
    │   ├── __init__.py
    │   ├── test_publications.py
    │   ├── test_twitter.py
    │   ├── test_enrichment.py
    │   └── test_resolver.py
    ├── test_crm/
    │   ├── __init__.py
    │   ├── test_profiles.py
    │   ├── test_warmth.py
    │   └── test_search.py
    ├── test_content/
    │   ├── __init__.py
    │   ├── test_pitches.py
    │   ├── test_press_releases.py
    │   ├── test_followups.py
    │   └── test_review_queue.py
    └── test_outreach/
        ├── __init__.py
        ├── test_sender.py
        ├── test_tracker.py
        ├── test_replies.py
        └── test_scheduler.py
```

---

## Task 1: Project Scaffolding & Database Models

**Files:**
- Create: `ai-pr-engine/pyproject.toml`
- Create: `ai-pr-engine/.env.example`
- Create: `ai-pr-engine/src/pr/__init__.py`
- Create: `ai-pr-engine/src/pr/config.py`
- Create: `ai-pr-engine/src/pr/db.py`
- Create: `ai-pr-engine/src/pr/models.py`
- Create: `ai-pr-engine/tests/conftest.py`
- Create: `ai-pr-engine/tests/test_models.py`
- Create: `ai-pr-engine/tests/factories.py`

- [ ] **Step 1: Create project directory and pyproject.toml**

```bash
mkdir -p ai-pr-engine/src/pr ai-pr-engine/tests
```

```toml
# ai-pr-engine/pyproject.toml
[project]
name = "ai-pr-engine"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "typer[all]>=0.12",
    "sqlalchemy>=2.0",
    "alembic>=1.13",
    "psycopg2-binary>=2.9",
    "pydantic-settings>=2.0",
    "httpx>=0.27",
    "beautifulsoup4>=4.12",
    "playwright>=1.40",
    "anthropic>=0.40",
    "resend>=2.0",
    "celery[redis]>=5.3",
    "rich>=13.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "factory-boy>=3.3",
]

[project.scripts]
pr = "pr.cli.main:app"

[build-system]
requires = ["setuptools>=75"]
build-backend = "setuptools.backends._legacy:_Backend"

[tool.setuptools.packages.find]
where = ["src"]
```

- [ ] **Step 2: Create .env.example**

```bash
# ai-pr-engine/.env.example
DATABASE_URL=postgresql://pr:pr@localhost:5432/pr_engine
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
IMAP_HOST=imap.gmail.com
IMAP_USER=you@yourdomain.com
IMAP_PASSWORD=app-password
SMTP_FROM_EMAIL=you@yourdomain.com
REDIS_URL=redis://localhost:6379/0
```

- [ ] **Step 3: Create config.py**

```python
# src/pr/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://pr:pr@localhost:5432/pr_engine"
    anthropic_api_key: str = ""
    resend_api_key: str = ""
    imap_host: str = "imap.gmail.com"
    imap_user: str = ""
    imap_password: str = ""
    smtp_from_email: str = ""
    redis_url: str = "redis://localhost:6379/0"
    daily_send_limit: int = 20

    model_config = {"env_file": ".env"}

settings = Settings()
```

- [ ] **Step 4: Create db.py**

```python
# src/pr/db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from pr.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
```

- [ ] **Step 5: Create models.py with all ORM models**

```python
# src/pr/models.py
import enum
from datetime import datetime

from sqlalchemy import (
    String, Text, Integer, Boolean, DateTime, ForeignKey, Enum, func
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from pr.db import Base


class PublicationType(enum.Enum):
    newspaper = "newspaper"
    tv_station = "tv_station"
    blog = "blog"
    magazine = "magazine"


class JournalistStatus(enum.Enum):
    unknown = "unknown"
    identified = "identified"
    contacted = "contacted"
    responded = "responded"
    warm = "warm"
    active = "active"
    advocate = "advocate"


class CampaignStatus(enum.Enum):
    draft = "draft"
    active = "active"
    complete = "complete"


class OutreachContentType(enum.Enum):
    pitch = "pitch"
    follow_up_1 = "follow_up_1"
    follow_up_2 = "follow_up_2"
    follow_up_3 = "follow_up_3"


class OutreachStatus(enum.Enum):
    draft = "draft"
    approved = "approved"
    sent = "sent"
    opened = "opened"
    replied = "replied"
    placed = "placed"


class ReplyClassification(enum.Enum):
    interested = "interested"
    not_now = "not_now"
    pass_ = "pass"
    out_of_office = "out_of_office"
    wrong_person = "wrong_person"


class InteractionType(enum.Enum):
    email_sent = "email_sent"
    email_opened = "email_opened"
    reply_received = "reply_received"
    placement = "placement"
    note = "note"


class Publication(Base):
    __tablename__ = "publications"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    url: Mapped[str] = mapped_column(String(500))
    type: Mapped[PublicationType] = mapped_column(Enum(PublicationType))
    market: Mapped[str] = mapped_column(String(255))
    circulation_estimate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    accepts_contributed: Mapped[bool] = mapped_column(Boolean, default=False)
    has_sponsored_content: Mapped[bool] = mapped_column(Boolean, default=False)
    scrape_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    journalists: Mapped[list["Journalist"]] = relationship(back_populates="publication")
    articles: Mapped[list["Article"]] = relationship(back_populates="publication")


class Journalist(Base):
    __tablename__ = "journalists"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    publication_id: Mapped[int | None] = mapped_column(ForeignKey("publications.id"), nullable=True)
    beat: Mapped[str | None] = mapped_column(String(255), nullable=True)
    topics: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    writing_style: Mapped[str | None] = mapped_column(Text, nullable=True)
    warmth_score: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[JournalistStatus] = mapped_column(
        Enum(JournalistStatus), default=JournalistStatus.unknown
    )
    twitter_handle: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    last_contacted: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    publication: Mapped[Publication | None] = relationship(back_populates="journalists")
    articles: Mapped[list["Article"]] = relationship(back_populates="journalist")
    outreach: Mapped[list["Outreach"]] = relationship(back_populates="journalist")
    interactions: Mapped[list["Interaction"]] = relationship(back_populates="journalist")


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(primary_key=True)
    journalist_id: Mapped[int | None] = mapped_column(ForeignKey("journalists.id"), nullable=True)
    publication_id: Mapped[int] = mapped_column(ForeignKey("publications.id"))
    title: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(String(1000))
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    content_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    topics: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    scraped_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    journalist: Mapped[Journalist | None] = relationship(back_populates="articles")
    publication: Mapped[Publication] = relationship(back_populates="articles")


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_name: Mapped[str] = mapped_column(String(255))
    client_business: Mapped[str | None] = mapped_column(String(255), nullable=True)
    story_summary: Mapped[str] = mapped_column(Text)
    story_details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    press_release: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[CampaignStatus] = mapped_column(
        Enum(CampaignStatus), default=CampaignStatus.draft
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    outreach: Mapped[list["Outreach"]] = relationship(back_populates="campaign")


class Outreach(Base):
    __tablename__ = "outreach"

    id: Mapped[int] = mapped_column(primary_key=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id"))
    journalist_id: Mapped[int] = mapped_column(ForeignKey("journalists.id"))
    email_subject: Mapped[str] = mapped_column(String(500))
    email_body: Mapped[str] = mapped_column(Text)
    content_type: Mapped[OutreachContentType] = mapped_column(Enum(OutreachContentType))
    status: Mapped[OutreachStatus] = mapped_column(
        Enum(OutreachStatus), default=OutreachStatus.draft
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    replied_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reply_classification: Mapped[ReplyClassification | None] = mapped_column(
        Enum(ReplyClassification), nullable=True
    )
    placement_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    campaign: Mapped[Campaign] = relationship(back_populates="outreach")
    journalist: Mapped[Journalist] = relationship(back_populates="outreach")
    interactions: Mapped[list["Interaction"]] = relationship(back_populates="outreach_record")


class Interaction(Base):
    __tablename__ = "interactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    journalist_id: Mapped[int] = mapped_column(ForeignKey("journalists.id"))
    outreach_id: Mapped[int | None] = mapped_column(ForeignKey("outreach.id"), nullable=True)
    type: Mapped[InteractionType] = mapped_column(Enum(InteractionType))
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    journalist: Mapped[Journalist] = relationship(back_populates="interactions")
    outreach_record: Mapped[Outreach | None] = relationship(back_populates="interactions")
```

- [ ] **Step 6: Create __init__.py files**

```bash
touch ai-pr-engine/src/pr/__init__.py
touch ai-pr-engine/src/pr/cli/__init__.py
touch ai-pr-engine/src/pr/scraper/__init__.py
touch ai-pr-engine/src/pr/crm/__init__.py
touch ai-pr-engine/src/pr/content/__init__.py
touch ai-pr-engine/src/pr/outreach/__init__.py
touch ai-pr-engine/src/pr/ai/__init__.py
touch ai-pr-engine/tests/__init__.py
touch ai-pr-engine/tests/test_scraper/__init__.py
touch ai-pr-engine/tests/test_crm/__init__.py
touch ai-pr-engine/tests/test_content/__init__.py
touch ai-pr-engine/tests/test_outreach/__init__.py
```

- [ ] **Step 7: Create test factories**

```python
# tests/factories.py
from datetime import datetime
from pr.models import (
    Publication, PublicationType, Journalist, JournalistStatus,
    Article, Campaign, CampaignStatus, Outreach, OutreachContentType,
    OutreachStatus,
)


def make_publication(session, **overrides):
    defaults = dict(
        name="Daily Gazette",
        url="https://dailygazette.example.com",
        type=PublicationType.newspaper,
        market="Austin, TX",
    )
    defaults.update(overrides)
    pub = Publication(**defaults)
    session.add(pub)
    session.flush()
    return pub


def make_journalist(session, **overrides):
    if "publication_id" not in overrides:
        pub = make_publication(session)
        overrides["publication_id"] = pub.id
    defaults = dict(
        name="Jane Smith",
        email="jane@dailygazette.example.com",
        beat="food & dining",
        topics=["restaurants", "food trucks", "local chefs"],
        writing_style="Conversational, story-driven. Leads with anecdotes.",
        warmth_score=0,
        status=JournalistStatus.identified,
        twitter_handle="@janesmith_food",
    )
    defaults.update(overrides)
    j = Journalist(**defaults)
    session.add(j)
    session.flush()
    return j


def make_article(session, journalist=None, publication=None, **overrides):
    if journalist is None:
        journalist = make_journalist(session)
    if publication is None:
        publication = journalist.publication
    defaults = dict(
        journalist_id=journalist.id,
        publication_id=publication.id,
        title="Best New Tacos in Austin",
        url="https://dailygazette.example.com/food/best-tacos-2026",
        published_at=datetime(2026, 3, 15),
        content_summary="A roundup of five new taco spots in East Austin.",
        topics=["restaurants", "tacos", "east austin"],
    )
    defaults.update(overrides)
    a = Article(**defaults)
    session.add(a)
    session.flush()
    return a


def make_campaign(session, **overrides):
    defaults = dict(
        client_name="Bob's BBQ",
        client_business="BBQ restaurant",
        story_summary="Bob's BBQ is opening a second location in South Austin, "
                      "featuring a new smoked brisket recipe and outdoor beer garden.",
        status=CampaignStatus.draft,
    )
    defaults.update(overrides)
    c = Campaign(**defaults)
    session.add(c)
    session.flush()
    return c


def make_outreach(session, campaign=None, journalist=None, **overrides):
    if campaign is None:
        campaign = make_campaign(session)
    if journalist is None:
        journalist = make_journalist(session)
    defaults = dict(
        campaign_id=campaign.id,
        journalist_id=journalist.id,
        email_subject="Story idea: Bob's BBQ expanding to South Austin",
        email_body="Hi Jane, ...",
        content_type=OutreachContentType.pitch,
        status=OutreachStatus.draft,
    )
    defaults.update(overrides)
    o = Outreach(**defaults)
    session.add(o)
    session.flush()
    return o
```

- [ ] **Step 8: Create conftest.py with test database fixtures**

```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from pr.db import Base

TEST_DATABASE_URL = "postgresql://pr:pr@localhost:5432/pr_engine_test"


@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def session(test_engine):
    connection = test_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    yield session
    session.close()
    transaction.rollback()
    connection.close()
```

- [ ] **Step 9: Write model tests**

```python
# tests/test_models.py
from pr.models import JournalistStatus, CampaignStatus, OutreachStatus
from tests.factories import (
    make_publication, make_journalist, make_article,
    make_campaign, make_outreach,
)


def test_create_publication(session):
    pub = make_publication(session, name="Austin Chronicle")
    assert pub.id is not None
    assert pub.name == "Austin Chronicle"


def test_create_journalist_with_publication(session):
    j = make_journalist(session, name="John Doe")
    assert j.id is not None
    assert j.publication is not None
    assert j.status == JournalistStatus.identified


def test_create_article_linked_to_journalist(session):
    j = make_journalist(session)
    a = make_article(session, journalist=j)
    assert a.journalist_id == j.id
    assert a.publication_id == j.publication_id


def test_create_campaign(session):
    c = make_campaign(session)
    assert c.id is not None
    assert c.status == CampaignStatus.draft


def test_create_outreach_linked_to_campaign_and_journalist(session):
    o = make_outreach(session)
    assert o.campaign_id is not None
    assert o.journalist_id is not None
    assert o.status == OutreachStatus.draft


def test_journalist_topics_array(session):
    j = make_journalist(session, topics=["tech", "startups"])
    session.refresh(j)
    assert j.topics == ["tech", "startups"]
```

- [ ] **Step 10: Run tests to verify they fail (no DB yet), then set up DB and verify pass**

```bash
cd ai-pr-engine
pip install -e ".[dev]"
createdb pr_engine_test  # or: psql -c "CREATE DATABASE pr_engine_test;"
pytest tests/test_models.py -v
```

Expected: All 6 tests PASS.

- [ ] **Step 11: Set up Alembic**

```bash
cd ai-pr-engine
alembic init alembic
```

Edit `alembic/env.py` to import `pr.db.Base` and `pr.config.settings`:

```python
# In alembic/env.py, replace target_metadata = None with:
from pr.db import Base
from pr.config import settings

target_metadata = Base.metadata
config.set_main_option("sqlalchemy.url", settings.database_url)
```

```bash
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

- [ ] **Step 12: Commit**

```bash
git init
echo -e "__pycache__/\n*.egg-info/\n.env\n*.pyc\ndist/\n.eggs/" > .gitignore
git add .
git commit -m "feat: project scaffolding with database models and test infrastructure"
```

---

## Task 2: AI Client Wrapper

**Files:**
- Create: `src/pr/ai/__init__.py`
- Create: `src/pr/ai/client.py`
- Create: `tests/test_ai_client.py`

All Claude API calls go through this wrapper. Centralizes prompts and makes testing easy (mock one place).

- [ ] **Step 1: Write failing test for AI client**

```python
# tests/test_ai_client.py
from unittest.mock import patch, MagicMock
from pr.ai.client import AIClient


def test_analyze_article_returns_structured_result():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"beat": "food", "topics": ["restaurants", "dining"], "style": "conversational", "summary": "Review of local taco spots"}')]

    with patch("pr.ai.client.anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value.messages.create.return_value = mock_response
        client = AIClient(api_key="test-key")
        result = client.analyze_article(
            title="Best Tacos in Austin",
            content="A roundup of five new taco spots in East Austin...",
        )

    assert result["beat"] == "food"
    assert "restaurants" in result["topics"]
    assert result["style"] == "conversational"
    assert "summary" in result


def test_generate_pitch_returns_subject_and_body():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"subject": "Story idea: New BBQ spot in South Austin", "body": "Hi Jane,\\n\\nI noticed your recent piece on..."}')]

    with patch("pr.ai.client.anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value.messages.create.return_value = mock_response
        client = AIClient(api_key="test-key")
        result = client.generate_pitch(
            journalist_name="Jane Smith",
            journalist_beat="food & dining",
            journalist_style="Conversational, story-driven",
            recent_articles=["Best Tacos in Austin", "Farm-to-Table Revival"],
            client_name="Bob's BBQ",
            story_summary="Opening a second location with new smoked brisket recipe",
        )

    assert "subject" in result
    assert "body" in result
    assert len(result["body"]) > 20


def test_generate_press_release():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="FOR IMMEDIATE RELEASE\n\nBob's BBQ Expands...")]

    with patch("pr.ai.client.anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value.messages.create.return_value = mock_response
        client = AIClient(api_key="test-key")
        result = client.generate_press_release(
            client_name="Bob's BBQ",
            story_summary="Opening second location",
            details={"what": "New location", "where": "South Austin", "when": "June 2026"},
            quotes=["We're thrilled to bring our brisket to South Austin - Bob Jones, owner"],
        )

    assert "FOR IMMEDIATE RELEASE" in result


def test_generate_followup():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"subject": "Re: Story idea: Bob\'s BBQ", "body": "Hi Jane, wanted to share a quick update..."}')]

    with patch("pr.ai.client.anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value.messages.create.return_value = mock_response
        client = AIClient(api_key="test-key")
        result = client.generate_followup(
            original_subject="Story idea: Bob's BBQ",
            original_body="Hi Jane, ...",
            journalist_name="Jane Smith",
            followup_number=1,
            new_angle="Bob's BBQ just won 'Best New Restaurant' from Austin Monthly",
        )

    assert "subject" in result
    assert "body" in result


def test_classify_reply():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"classification": "interested", "reasoning": "Journalist asked for more details"}')]

    with patch("pr.ai.client.anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value.messages.create.return_value = mock_response
        client = AIClient(api_key="test-key")
        result = client.classify_reply(
            reply_text="This sounds interesting! Can you send me more details and a photo?",
        )

    assert result["classification"] == "interested"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_ai_client.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'pr.ai.client'`

- [ ] **Step 3: Implement AIClient**

```python
# src/pr/ai/client.py
import json
import anthropic


class AIClient:
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def _ask(self, system: str, user: str, max_tokens: int = 2000) -> str:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return response.content[0].text

    def _ask_json(self, system: str, user: str, max_tokens: int = 2000) -> dict:
        text = self._ask(system, user, max_tokens)
        return json.loads(text)

    def analyze_article(self, title: str, content: str) -> dict:
        system = (
            "You are a media analyst. Analyze the given article and return JSON with exactly these keys: "
            '"beat" (the journalist\'s beat/coverage area), '
            '"topics" (list of specific topics), '
            '"style" (writing style description), '
            '"summary" (2-3 sentence summary). '
            "Return ONLY valid JSON, no other text."
        )
        user = f"Title: {title}\n\nContent:\n{content}"
        return self._ask_json(system, user)

    def generate_pitch(
        self,
        journalist_name: str,
        journalist_beat: str,
        journalist_style: str,
        recent_articles: list[str],
        client_name: str,
        story_summary: str,
    ) -> dict:
        system = (
            "You are an expert PR professional writing a pitch email to a journalist. "
            "The pitch must be personalized to the journalist's beat, writing style, and recent coverage. "
            "Explain why THIS journalist should care about THIS story. "
            "Be concise — pitches should be 150-250 words. "
            'Return JSON with "subject" and "body" keys. Return ONLY valid JSON.'
        )
        articles_str = "\n".join(f"- {a}" for a in recent_articles)
        user = (
            f"Journalist: {journalist_name}\n"
            f"Beat: {journalist_beat}\n"
            f"Style: {journalist_style}\n"
            f"Recent articles:\n{articles_str}\n\n"
            f"Client: {client_name}\n"
            f"Story: {story_summary}"
        )
        return self._ask_json(system, user)

    def generate_press_release(
        self,
        client_name: str,
        story_summary: str,
        details: dict,
        quotes: list[str],
    ) -> str:
        system = (
            "You are a PR professional writing an AP-style press release. "
            "Include: headline, dateline, lead paragraph (who/what/when/where/why), "
            "body paragraphs with details, quotes, and a boilerplate. "
            "Return ONLY the press release text."
        )
        details_str = "\n".join(f"- {k}: {v}" for k, v in details.items())
        quotes_str = "\n".join(f'- "{q}"' for q in quotes)
        user = (
            f"Client: {client_name}\n"
            f"Story: {story_summary}\n"
            f"Details:\n{details_str}\n"
            f"Quotes:\n{quotes_str}"
        )
        return self._ask(system, user, max_tokens=3000)

    def generate_followup(
        self,
        original_subject: str,
        original_body: str,
        journalist_name: str,
        followup_number: int,
        new_angle: str | None = None,
    ) -> dict:
        system = (
            "You are a PR professional writing a follow-up email. "
            f"This is follow-up #{followup_number}. "
            "Do NOT write 'just checking in.' Each follow-up must add new value — "
            "a new angle, new data, a timely hook, or a reason to act now. "
            "Be shorter than the original pitch. "
            'Return JSON with "subject" and "body" keys. Return ONLY valid JSON.'
        )
        user = (
            f"Original subject: {original_subject}\n"
            f"Original pitch:\n{original_body}\n\n"
            f"Journalist: {journalist_name}\n"
            f"New angle/info: {new_angle or 'None — find a creative reason to follow up'}"
        )
        return self._ask_json(system, user)

    def classify_reply(self, reply_text: str) -> dict:
        system = (
            "Classify this journalist's reply to a PR pitch. "
            'Return JSON with "classification" (one of: interested, not_now, pass, out_of_office, wrong_person) '
            'and "reasoning" (one sentence explanation). Return ONLY valid JSON.'
        )
        return self._ask_json(system, reply_text)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_ai_client.py -v
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pr/ai/ tests/test_ai_client.py
git commit -m "feat: AI client wrapper for Claude API — article analysis, pitch/PR/followup generation, reply classification"
```

---

## Task 3: Publication Scraper

**Files:**
- Create: `src/pr/scraper/publications.py`
- Create: `tests/test_scraper/test_publications.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_scraper/test_publications.py
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from pr.scraper.publications import PublicationScraper


@pytest.fixture
def scraper():
    return PublicationScraper()


def test_extract_staff_from_html(scraper):
    html = """
    <div class="staff-directory">
        <div class="staff-member">
            <h3>Jane Smith</h3>
            <p class="title">Food & Dining Reporter</p>
            <a href="mailto:jane@gazette.com">jane@gazette.com</a>
        </div>
        <div class="staff-member">
            <h3>John Doe</h3>
            <p class="title">City Hall Reporter</p>
            <a href="mailto:john@gazette.com">john@gazette.com</a>
        </div>
    </div>
    """
    staff = scraper.extract_staff_from_html(html)
    assert len(staff) == 2
    assert staff[0]["name"] == "Jane Smith"
    assert staff[0]["email"] == "jane@gazette.com"
    assert staff[0]["role"] == "Food & Dining Reporter"


def test_extract_bylines_from_article_html(scraper):
    html = """
    <article>
        <h1>Best Tacos in Austin</h1>
        <span class="byline">By Jane Smith</span>
        <time datetime="2026-03-15">March 15, 2026</time>
        <div class="article-body">
            <p>A roundup of five new taco spots in East Austin...</p>
        </div>
    </article>
    """
    article = scraper.extract_article_from_html(html, "https://gazette.com/food/tacos")
    assert article["title"] == "Best Tacos in Austin"
    assert article["author"] == "Jane Smith"
    assert article["url"] == "https://gazette.com/food/tacos"


def test_extract_emails_from_text(scraper):
    text = "Contact jane@gazette.com or john.doe@newspaper.org for tips"
    emails = scraper.extract_emails(text)
    assert "jane@gazette.com" in emails
    assert "john.doe@newspaper.org" in emails


def test_discover_staff_pages(scraper):
    html = """
    <nav>
        <a href="/about">About</a>
        <a href="/staff">Our Staff</a>
        <a href="/contact">Contact</a>
        <a href="/team">Meet the Team</a>
    </nav>
    """
    pages = scraper.find_staff_page_links(html, "https://gazette.com")
    assert "https://gazette.com/staff" in pages
    assert "https://gazette.com/team" in pages
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_scraper/test_publications.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement PublicationScraper**

```python
# src/pr/scraper/publications.py
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup
import httpx


class PublicationScraper:
    STAFF_PAGE_KEYWORDS = ["staff", "team", "about-us", "people", "reporters", "newsroom"]

    def extract_emails(self, text: str) -> list[str]:
        pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        return list(set(re.findall(pattern, text)))

    def extract_staff_from_html(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "html.parser")
        staff = []

        # Look for common staff directory patterns
        members = soup.select(".staff-member, .author-card, .team-member, [class*=staff], [class*=reporter]")
        for member in members:
            name_el = member.select_one("h2, h3, h4, .name, .author-name")
            role_el = member.select_one(".title, .role, .position, .beat")
            email_el = member.select_one("a[href^='mailto:']")

            if name_el:
                entry = {"name": name_el.get_text(strip=True)}
                entry["role"] = role_el.get_text(strip=True) if role_el else None
                entry["email"] = email_el["href"].replace("mailto:", "") if email_el else None
                staff.append(entry)

        return staff

    def extract_article_from_html(self, html: str, url: str) -> dict:
        soup = BeautifulSoup(html, "html.parser")

        title_el = soup.select_one("h1, .article-title, .headline")
        title = title_el.get_text(strip=True) if title_el else ""

        byline_el = soup.select_one(".byline, .author, [rel='author'], .article-author")
        author = ""
        if byline_el:
            author = byline_el.get_text(strip=True)
            author = re.sub(r"^[Bb]y\s+", "", author)

        time_el = soup.select_one("time[datetime], .date, .published-date")
        published = time_el.get("datetime") if time_el and time_el.has_attr("datetime") else None

        body_el = soup.select_one(".article-body, .story-body, article, .content")
        body = body_el.get_text(strip=True)[:2000] if body_el else ""

        return {
            "title": title,
            "author": author,
            "url": url,
            "published_at": published,
            "body_text": body,
        }

    def find_staff_page_links(self, html: str, base_url: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        links = []
        for a in soup.find_all("a", href=True):
            href = a["href"].lower()
            if any(kw in href for kw in self.STAFF_PAGE_KEYWORDS):
                full_url = urljoin(base_url, a["href"])
                links.append(full_url)
        return list(set(links))

    async def scrape_publication(self, url: str) -> dict:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            # Fetch homepage, find staff pages
            resp = await client.get(url)
            resp.raise_for_status()
            staff_pages = self.find_staff_page_links(resp.text, url)

            all_staff = []
            for page_url in staff_pages:
                page_resp = await client.get(page_url)
                if page_resp.status_code == 200:
                    all_staff.extend(self.extract_staff_from_html(page_resp.text))

            # Also extract emails from homepage as fallback
            homepage_emails = self.extract_emails(resp.text)

            return {
                "url": url,
                "staff": all_staff,
                "homepage_emails": homepage_emails,
                "staff_pages_found": staff_pages,
            }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_scraper/test_publications.py -v
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pr/scraper/publications.py tests/test_scraper/
git commit -m "feat: publication scraper — extract staff, bylines, emails from local news sites"
```

---

## Task 4: Twitter Scraper

**Files:**
- Create: `src/pr/scraper/twitter.py`
- Create: `tests/test_scraper/test_twitter.py`

Note: Twitter scraping without API access is fragile. This module uses the public profile pages via httpx. If Twitter blocks, this is the module to swap for an API-based approach.

- [ ] **Step 1: Write failing tests**

```python
# tests/test_scraper/test_twitter.py
from pr.scraper.twitter import TwitterScraper


def test_parse_profile_from_bio():
    scraper = TwitterScraper()
    result = scraper.parse_bio(
        handle="janesmith_food",
        display_name="Jane Smith",
        bio="Food & dining reporter @DailyGazette | Austin, TX | DMs open | jane@gazette.com",
    )
    assert result["handle"] == "janesmith_food"
    assert result["display_name"] == "Jane Smith"
    assert "food" in result["bio"].lower()
    assert result["email"] == "jane@gazette.com"
    assert "Austin" in result["location"]


def test_parse_bio_no_email():
    scraper = TwitterScraper()
    result = scraper.parse_bio(
        handle="johndoe",
        display_name="John Doe",
        bio="City reporter. Politics nerd.",
    )
    assert result["email"] is None


def test_extract_beat_signals_from_bio():
    scraper = TwitterScraper()
    signals = scraper.extract_beat_signals(
        "Food & dining reporter @DailyGazette covering restaurants, chefs, and food trucks in Austin"
    )
    assert any("food" in s.lower() or "dining" in s.lower() or "restaurant" in s.lower() for s in signals)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_scraper/test_twitter.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement TwitterScraper**

```python
# src/pr/scraper/twitter.py
import re


class TwitterScraper:
    BEAT_KEYWORDS = [
        "reporter", "journalist", "editor", "correspondent", "columnist",
        "covering", "writer", "critic", "reviewer",
    ]
    LOCATION_PATTERNS = [
        r"([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2})",  # City, ST
        r"([\w\s]+,\s*(?:Texas|California|New York|Florida|Illinois))",  # City, State
    ]

    def parse_bio(self, handle: str, display_name: str, bio: str) -> dict:
        email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', bio)
        email = email_match.group(0) if email_match else None

        location = ""
        for pattern in self.LOCATION_PATTERNS:
            loc_match = re.search(pattern, bio)
            if loc_match:
                location = loc_match.group(1)
                break

        return {
            "handle": handle,
            "display_name": display_name,
            "bio": bio,
            "email": email,
            "location": location,
        }

    def extract_beat_signals(self, bio: str) -> list[str]:
        signals = []
        bio_lower = bio.lower()

        # Find words near beat keywords
        words = bio.split()
        for i, word in enumerate(words):
            if any(kw in word.lower() for kw in self.BEAT_KEYWORDS):
                # Grab surrounding context (3 words before and after)
                start = max(0, i - 3)
                end = min(len(words), i + 4)
                context = " ".join(words[start:end])
                signals.append(context)

        # Also extract hashtag-like topics
        topics = re.findall(r'(?:covering|cover|covers)\s+(.+?)(?:\.|,|$)', bio_lower)
        signals.extend(topics)

        return signals
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_scraper/test_twitter.py -v
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pr/scraper/twitter.py tests/test_scraper/test_twitter.py
git commit -m "feat: Twitter bio parser — extract emails, location, beat signals from journalist profiles"
```

---

## Task 5: Article Enrichment (AI Analysis)

**Files:**
- Create: `src/pr/scraper/enrichment.py`
- Create: `tests/test_scraper/test_enrichment.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_scraper/test_enrichment.py
from unittest.mock import MagicMock
from pr.scraper.enrichment import ArticleEnricher


def make_mock_ai():
    ai = MagicMock()
    ai.analyze_article.return_value = {
        "beat": "food & dining",
        "topics": ["restaurants", "tacos", "east austin"],
        "style": "Conversational, story-driven. Leads with anecdotes.",
        "summary": "A roundup of five new taco spots in East Austin.",
    }
    return ai


def test_enrich_article():
    ai = make_mock_ai()
    enricher = ArticleEnricher(ai_client=ai)
    result = enricher.enrich_article(
        title="Best Tacos in Austin",
        body_text="A roundup of five new taco spots in East Austin...",
    )
    assert result["beat"] == "food & dining"
    assert "restaurants" in result["topics"]
    ai.analyze_article.assert_called_once()


def test_build_journalist_profile_from_articles():
    ai = make_mock_ai()
    enricher = ArticleEnricher(ai_client=ai)
    articles = [
        {"title": "Best Tacos", "body_text": "Taco roundup..."},
        {"title": "New Pizza Place", "body_text": "Pizza review..."},
        {"title": "Chef Interview", "body_text": "Local chef profile..."},
    ]
    profile = enricher.build_profile_from_articles(articles)
    assert profile["beat"] is not None
    assert len(profile["topics"]) > 0
    assert profile["writing_style"] is not None
    assert ai.analyze_article.call_count == 3
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_scraper/test_enrichment.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement ArticleEnricher**

```python
# src/pr/scraper/enrichment.py
from collections import Counter

from pr.ai.client import AIClient


class ArticleEnricher:
    def __init__(self, ai_client: AIClient):
        self.ai = ai_client

    def enrich_article(self, title: str, body_text: str) -> dict:
        return self.ai.analyze_article(title=title, content=body_text)

    def build_profile_from_articles(self, articles: list[dict]) -> dict:
        all_topics = []
        all_beats = []
        all_styles = []

        for article in articles:
            result = self.enrich_article(article["title"], article["body_text"])
            all_beats.append(result["beat"])
            all_topics.extend(result["topics"])
            all_styles.append(result["style"])

        # Most common beat
        beat_counts = Counter(all_beats)
        primary_beat = beat_counts.most_common(1)[0][0] if beat_counts else None

        # Deduplicated topics, ordered by frequency
        topic_counts = Counter(all_topics)
        topics = [t for t, _ in topic_counts.most_common(20)]

        # Use the most recent style description
        writing_style = all_styles[-1] if all_styles else None

        return {
            "beat": primary_beat,
            "topics": topics,
            "writing_style": writing_style,
        }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_scraper/test_enrichment.py -v
```

Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pr/scraper/enrichment.py tests/test_scraper/test_enrichment.py
git commit -m "feat: article enrichment — AI-powered beat, topic, and style analysis"
```

---

## Task 6: Entity Resolution

**Files:**
- Create: `src/pr/scraper/resolver.py`
- Create: `tests/test_scraper/test_resolver.py`

Merges journalist records from different sources (website, Twitter) into unified profiles.

- [ ] **Step 1: Write failing tests**

```python
# tests/test_scraper/test_resolver.py
from pr.scraper.resolver import EntityResolver


def test_exact_email_match():
    resolver = EntityResolver()
    existing = [
        {"name": "Jane Smith", "email": "jane@gazette.com", "source": "website"},
    ]
    incoming = {"name": "J. Smith", "email": "jane@gazette.com", "source": "twitter"}
    match = resolver.find_match(incoming, existing)
    assert match is not None
    assert match["email"] == "jane@gazette.com"


def test_name_and_publication_match():
    resolver = EntityResolver()
    existing = [
        {"name": "Jane Smith", "email": None, "publication": "Daily Gazette", "source": "website"},
    ]
    incoming = {"name": "Jane Smith", "email": "jane@gazette.com", "publication": "Daily Gazette", "source": "twitter"}
    match = resolver.find_match(incoming, existing)
    assert match is not None


def test_no_match():
    resolver = EntityResolver()
    existing = [
        {"name": "Jane Smith", "email": "jane@gazette.com", "source": "website"},
    ]
    incoming = {"name": "Bob Jones", "email": "bob@other.com", "source": "twitter"}
    match = resolver.find_match(incoming, existing)
    assert match is None


def test_merge_profiles():
    resolver = EntityResolver()
    base = {
        "name": "Jane Smith",
        "email": "jane@gazette.com",
        "phone": None,
        "twitter_handle": None,
        "beat": "food",
        "source": "website",
    }
    overlay = {
        "name": "Jane Smith",
        "email": "jane@gazette.com",
        "phone": None,
        "twitter_handle": "@janesmith_food",
        "beat": None,
        "source": "twitter",
    }
    merged = resolver.merge(base, overlay)
    assert merged["email"] == "jane@gazette.com"
    assert merged["twitter_handle"] == "@janesmith_food"
    assert merged["beat"] == "food"


def test_name_similarity():
    resolver = EntityResolver()
    assert resolver.names_match("Jane Smith", "Jane Smith") is True
    assert resolver.names_match("Jane Smith", "J. Smith") is True
    assert resolver.names_match("Jane Smith", "Bob Jones") is False
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_scraper/test_resolver.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement EntityResolver**

```python
# src/pr/scraper/resolver.py


class EntityResolver:
    def names_match(self, name_a: str, name_b: str) -> bool:
        a = name_a.strip().lower()
        b = name_b.strip().lower()

        if a == b:
            return True

        # Handle initials: "J. Smith" matches "Jane Smith"
        parts_a = a.replace(".", "").split()
        parts_b = b.replace(".", "").split()

        # Same last name?
        if not parts_a or not parts_b:
            return False
        if parts_a[-1] != parts_b[-1]:
            return False

        # First name: exact match or initial match
        if len(parts_a) >= 1 and len(parts_b) >= 1:
            first_a = parts_a[0]
            first_b = parts_b[0]
            if first_a == first_b:
                return True
            if len(first_a) == 1 and first_b.startswith(first_a):
                return True
            if len(first_b) == 1 and first_a.startswith(first_b):
                return True

        return False

    def find_match(self, incoming: dict, existing: list[dict]) -> dict | None:
        # Priority 1: exact email match
        if incoming.get("email"):
            for record in existing:
                if record.get("email") and record["email"].lower() == incoming["email"].lower():
                    return record

        # Priority 2: name + publication match
        if incoming.get("name") and incoming.get("publication"):
            for record in existing:
                if (
                    record.get("publication")
                    and record["publication"].lower() == incoming["publication"].lower()
                    and self.names_match(incoming["name"], record["name"])
                ):
                    return record

        # Priority 3: name + twitter handle match
        if incoming.get("name") and incoming.get("twitter_handle"):
            for record in existing:
                if (
                    record.get("twitter_handle")
                    and record["twitter_handle"].lower() == incoming["twitter_handle"].lower()
                ):
                    return record

        return None

    def merge(self, base: dict, overlay: dict) -> dict:
        merged = dict(base)
        for key, value in overlay.items():
            if key == "source":
                continue
            if value is not None and (merged.get(key) is None):
                merged[key] = value
        return merged
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_scraper/test_resolver.py -v
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pr/scraper/resolver.py tests/test_scraper/test_resolver.py
git commit -m "feat: entity resolution — merge journalist records across sources by email, name, publication"
```

---

## Task 7: CRM Profiles

**Files:**
- Create: `src/pr/crm/profiles.py`
- Create: `tests/test_crm/test_profiles.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_crm/test_profiles.py
from pr.crm.profiles import JournalistProfileManager
from pr.models import Journalist, JournalistStatus
from tests.factories import make_journalist, make_publication


def test_create_journalist(session):
    mgr = JournalistProfileManager(session)
    pub = make_publication(session)
    j = mgr.create(
        name="Jane Smith",
        email="jane@gazette.com",
        publication_id=pub.id,
        beat="food & dining",
    )
    assert j.id is not None
    assert j.status == JournalistStatus.identified


def test_update_journalist(session):
    j = make_journalist(session)
    mgr = JournalistProfileManager(session)
    updated = mgr.update(j.id, beat="politics", topics=["city hall", "elections"])
    assert updated.beat == "politics"
    assert "city hall" in updated.topics


def test_get_journalist(session):
    j = make_journalist(session, name="John Doe")
    mgr = JournalistProfileManager(session)
    fetched = mgr.get(j.id)
    assert fetched.name == "John Doe"


def test_list_journalists(session):
    make_journalist(session, name="Jane Smith", email="jane@g.com")
    make_journalist(session, name="John Doe", email="john@g.com")
    mgr = JournalistProfileManager(session)
    results = mgr.list_all()
    assert len(results) >= 2


def test_update_status(session):
    j = make_journalist(session)
    mgr = JournalistProfileManager(session)
    mgr.update_status(j.id, JournalistStatus.contacted)
    session.refresh(j)
    assert j.status == JournalistStatus.contacted


def test_add_note(session):
    j = make_journalist(session, notes=None)
    mgr = JournalistProfileManager(session)
    mgr.add_note(j.id, "Met at chamber of commerce event")
    session.refresh(j)
    assert "chamber of commerce" in j.notes
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_crm/test_profiles.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement JournalistProfileManager**

```python
# src/pr/crm/profiles.py
from datetime import datetime

from sqlalchemy.orm import Session

from pr.models import Journalist, JournalistStatus


class JournalistProfileManager:
    def __init__(self, session: Session):
        self.session = session

    def create(self, name: str, email: str | None = None, **kwargs) -> Journalist:
        journalist = Journalist(
            name=name,
            email=email,
            status=JournalistStatus.identified,
            **kwargs,
        )
        self.session.add(journalist)
        self.session.flush()
        return journalist

    def get(self, journalist_id: int) -> Journalist | None:
        return self.session.get(Journalist, journalist_id)

    def update(self, journalist_id: int, **kwargs) -> Journalist:
        journalist = self.get(journalist_id)
        for key, value in kwargs.items():
            setattr(journalist, key, value)
        self.session.flush()
        return journalist

    def update_status(self, journalist_id: int, status: JournalistStatus) -> None:
        journalist = self.get(journalist_id)
        journalist.status = status
        self.session.flush()

    def add_note(self, journalist_id: int, note: str) -> None:
        journalist = self.get(journalist_id)
        if journalist.notes:
            journalist.notes += f"\n\n[{datetime.now().strftime('%Y-%m-%d')}] {note}"
        else:
            journalist.notes = f"[{datetime.now().strftime('%Y-%m-%d')}] {note}"
        self.session.flush()

    def list_all(self, limit: int = 100, offset: int = 0) -> list[Journalist]:
        return (
            self.session.query(Journalist)
            .order_by(Journalist.warmth_score.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_crm/test_profiles.py -v
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pr/crm/profiles.py tests/test_crm/test_profiles.py
git commit -m "feat: journalist profile manager — CRUD, status transitions, notes"
```

---

## Task 8: Warmth Scoring

**Files:**
- Create: `src/pr/crm/warmth.py`
- Create: `tests/test_crm/test_warmth.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_crm/test_warmth.py
from datetime import datetime, timedelta
from pr.crm.warmth import WarmthScorer
from pr.models import InteractionType, OutreachStatus
from tests.factories import make_journalist, make_outreach, make_campaign


def test_new_journalist_scores_zero(session):
    j = make_journalist(session, warmth_score=0)
    scorer = WarmthScorer(session)
    score = scorer.calculate(j.id)
    assert score == 0


def test_contacted_journalist_gets_base_score(session):
    j = make_journalist(session)
    campaign = make_campaign(session)
    make_outreach(session, campaign=campaign, journalist=j, status=OutreachStatus.sent)
    scorer = WarmthScorer(session)
    score = scorer.calculate(j.id)
    assert score > 0


def test_replied_journalist_scores_higher(session):
    j = make_journalist(session)
    campaign = make_campaign(session)
    make_outreach(session, campaign=campaign, journalist=j, status=OutreachStatus.replied)
    scorer = WarmthScorer(session)
    score = scorer.calculate(j.id)
    assert score >= 30


def test_placed_journalist_scores_highest(session):
    j = make_journalist(session)
    campaign = make_campaign(session)
    make_outreach(
        session, campaign=campaign, journalist=j,
        status=OutreachStatus.placed,
        placement_url="https://gazette.com/article",
    )
    scorer = WarmthScorer(session)
    score = scorer.calculate(j.id)
    assert score >= 60


def test_score_capped_at_100(session):
    j = make_journalist(session)
    campaign = make_campaign(session)
    # Multiple placements
    for i in range(5):
        make_outreach(
            session, campaign=campaign, journalist=j,
            status=OutreachStatus.placed,
            placement_url=f"https://gazette.com/article-{i}",
            email_subject=f"Pitch {i}",
        )
    scorer = WarmthScorer(session)
    score = scorer.calculate(j.id)
    assert score <= 100
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_crm/test_warmth.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement WarmthScorer**

```python
# src/pr/crm/warmth.py
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from pr.models import Journalist, Outreach, OutreachStatus


class WarmthScorer:
    # Points per outreach status
    STATUS_POINTS = {
        OutreachStatus.sent: 5,
        OutreachStatus.opened: 10,
        OutreachStatus.replied: 30,
        OutreachStatus.placed: 60,
    }
    # Recency decay: interactions older than this many days lose half their value
    RECENCY_HALF_LIFE_DAYS = 90

    def __init__(self, session: Session):
        self.session = session

    def calculate(self, journalist_id: int) -> int:
        outreach_records = (
            self.session.query(Outreach)
            .filter(Outreach.journalist_id == journalist_id)
            .all()
        )

        if not outreach_records:
            return 0

        now = datetime.now()
        total = 0.0

        for record in outreach_records:
            base_points = self.STATUS_POINTS.get(record.status, 0)

            # Apply recency decay
            record_date = record.sent_at or record.created_at
            if record_date:
                age_days = (now - record_date).days
                decay = 0.5 ** (age_days / self.RECENCY_HALF_LIFE_DAYS)
                total += base_points * decay
            else:
                total += base_points

        return min(100, round(total))

    def update_score(self, journalist_id: int) -> int:
        score = self.calculate(journalist_id)
        journalist = self.session.get(Journalist, journalist_id)
        journalist.warmth_score = score
        self.session.flush()
        return score
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_crm/test_warmth.py -v
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pr/crm/warmth.py tests/test_crm/test_warmth.py
git commit -m "feat: warmth scoring — status-based points with recency decay, capped at 100"
```

---

## Task 9: CRM Search

**Files:**
- Create: `src/pr/crm/search.py`
- Create: `tests/test_crm/test_search.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_crm/test_search.py
from pr.crm.search import JournalistSearch
from pr.models import JournalistStatus
from tests.factories import make_journalist, make_publication


def test_search_by_beat(session):
    make_journalist(session, name="Jane", email="j1@g.com", beat="food & dining")
    make_journalist(session, name="John", email="j2@g.com", beat="politics")
    search = JournalistSearch(session)
    results = search.search(beat="food")
    assert len(results) == 1
    assert results[0].name == "Jane"


def test_search_by_topic(session):
    make_journalist(session, name="Jane", email="j1@g.com", topics=["restaurants", "food trucks"])
    make_journalist(session, name="John", email="j2@g.com", topics=["city hall"])
    search = JournalistSearch(session)
    results = search.search(topic="restaurants")
    assert len(results) == 1
    assert results[0].name == "Jane"


def test_search_by_status(session):
    make_journalist(session, name="Jane", email="j1@g.com", status=JournalistStatus.warm)
    make_journalist(session, name="John", email="j2@g.com", status=JournalistStatus.identified)
    search = JournalistSearch(session)
    results = search.search(status=JournalistStatus.warm)
    assert len(results) == 1


def test_search_by_min_warmth(session):
    make_journalist(session, name="Jane", email="j1@g.com", warmth_score=50)
    make_journalist(session, name="John", email="j2@g.com", warmth_score=10)
    search = JournalistSearch(session)
    results = search.search(min_warmth=30)
    assert len(results) == 1
    assert results[0].name == "Jane"


def test_full_text_search(session):
    make_journalist(session, name="Jane Smith", email="j1@g.com", beat="food")
    make_journalist(session, name="John Doe", email="j2@g.com", beat="politics")
    search = JournalistSearch(session)
    results = search.search(query="Jane")
    assert len(results) == 1


def test_combined_filters(session):
    make_journalist(session, name="Jane", email="j1@g.com", beat="food & dining", warmth_score=50)
    make_journalist(session, name="John", email="j2@g.com", beat="food & dining", warmth_score=5)
    search = JournalistSearch(session)
    results = search.search(beat="food", min_warmth=30)
    assert len(results) == 1
    assert results[0].name == "Jane"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_crm/test_search.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement JournalistSearch**

```python
# src/pr/crm/search.py
from sqlalchemy import or_
from sqlalchemy.orm import Session

from pr.models import Journalist, JournalistStatus


class JournalistSearch:
    def __init__(self, session: Session):
        self.session = session

    def search(
        self,
        query: str | None = None,
        beat: str | None = None,
        topic: str | None = None,
        status: JournalistStatus | None = None,
        min_warmth: int | None = None,
        publication_id: int | None = None,
        limit: int = 100,
    ) -> list[Journalist]:
        q = self.session.query(Journalist)

        if query:
            q = q.filter(
                or_(
                    Journalist.name.ilike(f"%{query}%"),
                    Journalist.email.ilike(f"%{query}%"),
                    Journalist.beat.ilike(f"%{query}%"),
                    Journalist.notes.ilike(f"%{query}%"),
                )
            )

        if beat:
            q = q.filter(Journalist.beat.ilike(f"%{beat}%"))

        if topic:
            q = q.filter(Journalist.topics.any(topic))

        if status:
            q = q.filter(Journalist.status == status)

        if min_warmth is not None:
            q = q.filter(Journalist.warmth_score >= min_warmth)

        if publication_id:
            q = q.filter(Journalist.publication_id == publication_id)

        return q.order_by(Journalist.warmth_score.desc()).limit(limit).all()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_crm/test_search.py -v
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pr/crm/search.py tests/test_crm/test_search.py
git commit -m "feat: journalist search — filter by beat, topic, status, warmth, free text"
```

---

## Task 10: Content Generation — Pitches

**Files:**
- Create: `src/pr/content/pitches.py`
- Create: `tests/test_content/test_pitches.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_content/test_pitches.py
from unittest.mock import MagicMock
from pr.content.pitches import PitchGenerator
from pr.models import OutreachContentType, OutreachStatus
from tests.factories import make_journalist, make_campaign, make_article


def test_generate_pitch_creates_outreach_record(session):
    j = make_journalist(session)
    make_article(session, journalist=j, title="Best Tacos in Austin")
    campaign = make_campaign(session)

    ai = MagicMock()
    ai.generate_pitch.return_value = {
        "subject": "Story idea: Bob's BBQ expanding to South Austin",
        "body": "Hi Jane,\n\nI noticed your recent piece on tacos...",
    }

    gen = PitchGenerator(session=session, ai_client=ai)
    outreach = gen.generate(campaign_id=campaign.id, journalist_id=j.id)

    assert outreach.id is not None
    assert outreach.content_type == OutreachContentType.pitch
    assert outreach.status == OutreachStatus.draft
    assert "Bob's BBQ" in outreach.email_subject
    assert outreach.journalist_id == j.id
    assert outreach.campaign_id == campaign.id


def test_generate_pitch_uses_journalist_profile(session):
    j = make_journalist(session, beat="food & dining", writing_style="Conversational")
    make_article(session, journalist=j, title="Taco Review")
    campaign = make_campaign(session)

    ai = MagicMock()
    ai.generate_pitch.return_value = {"subject": "Sub", "body": "Body"}

    gen = PitchGenerator(session=session, ai_client=ai)
    gen.generate(campaign_id=campaign.id, journalist_id=j.id)

    call_kwargs = ai.generate_pitch.call_args.kwargs
    assert call_kwargs["journalist_beat"] == "food & dining"
    assert call_kwargs["journalist_style"] == "Conversational"
    assert "Taco Review" in call_kwargs["recent_articles"]
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_content/test_pitches.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement PitchGenerator**

```python
# src/pr/content/pitches.py
from sqlalchemy.orm import Session

from pr.ai.client import AIClient
from pr.models import (
    Journalist, Article, Campaign, Outreach,
    OutreachContentType, OutreachStatus,
)


class PitchGenerator:
    def __init__(self, session: Session, ai_client: AIClient):
        self.session = session
        self.ai = ai_client

    def generate(self, campaign_id: int, journalist_id: int) -> Outreach:
        journalist = self.session.get(Journalist, journalist_id)
        campaign = self.session.get(Campaign, campaign_id)

        recent_articles = (
            self.session.query(Article)
            .filter(Article.journalist_id == journalist_id)
            .order_by(Article.published_at.desc())
            .limit(5)
            .all()
        )
        article_titles = [a.title for a in recent_articles]

        result = self.ai.generate_pitch(
            journalist_name=journalist.name,
            journalist_beat=journalist.beat or "",
            journalist_style=journalist.writing_style or "",
            recent_articles=article_titles,
            client_name=campaign.client_name,
            story_summary=campaign.story_summary,
        )

        outreach = Outreach(
            campaign_id=campaign.id,
            journalist_id=journalist.id,
            email_subject=result["subject"],
            email_body=result["body"],
            content_type=OutreachContentType.pitch,
            status=OutreachStatus.draft,
        )
        self.session.add(outreach)
        self.session.flush()
        return outreach
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_content/test_pitches.py -v
```

Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pr/content/pitches.py tests/test_content/test_pitches.py
git commit -m "feat: pitch generator — creates AI-personalized outreach drafts from journalist profiles"
```

---

## Task 11: Content Generation — Press Releases & Follow-ups

**Files:**
- Create: `src/pr/content/press_releases.py`
- Create: `src/pr/content/followups.py`
- Create: `tests/test_content/test_press_releases.py`
- Create: `tests/test_content/test_followups.py`

- [ ] **Step 1: Write failing tests for press releases**

```python
# tests/test_content/test_press_releases.py
from unittest.mock import MagicMock
from pr.content.press_releases import PressReleaseGenerator
from tests.factories import make_campaign


def test_generate_press_release(session):
    campaign = make_campaign(session, story_details={
        "what": "Opening second location",
        "where": "South Austin",
        "when": "June 2026",
    })

    ai = MagicMock()
    ai.generate_press_release.return_value = "FOR IMMEDIATE RELEASE\n\nBob's BBQ Expands to South Austin..."

    gen = PressReleaseGenerator(session=session, ai_client=ai)
    result = gen.generate(
        campaign_id=campaign.id,
        quotes=["We're thrilled - Bob Jones"],
    )

    assert "FOR IMMEDIATE RELEASE" in result
    session.refresh(campaign)
    assert campaign.press_release is not None
```

- [ ] **Step 2: Write failing tests for follow-ups**

```python
# tests/test_content/test_followups.py
from unittest.mock import MagicMock
from pr.content.followups import FollowupGenerator
from pr.models import OutreachContentType, OutreachStatus
from tests.factories import make_outreach, make_campaign, make_journalist


def test_generate_followup_creates_new_outreach(session):
    j = make_journalist(session)
    campaign = make_campaign(session)
    original = make_outreach(
        session, campaign=campaign, journalist=j,
        status=OutreachStatus.sent,
        email_subject="Story idea: Bob's BBQ",
        email_body="Hi Jane, ...",
    )

    ai = MagicMock()
    ai.generate_followup.return_value = {
        "subject": "Re: Story idea: Bob's BBQ",
        "body": "Hi Jane, quick update...",
    }

    gen = FollowupGenerator(session=session, ai_client=ai)
    followup = gen.generate(outreach_id=original.id)

    assert followup.id != original.id
    assert followup.content_type == OutreachContentType.follow_up_1
    assert followup.status == OutreachStatus.draft
    assert followup.campaign_id == campaign.id
    assert followup.journalist_id == j.id
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pytest tests/test_content/test_press_releases.py tests/test_content/test_followups.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 4: Implement PressReleaseGenerator**

```python
# src/pr/content/press_releases.py
from sqlalchemy.orm import Session

from pr.ai.client import AIClient
from pr.models import Campaign


class PressReleaseGenerator:
    def __init__(self, session: Session, ai_client: AIClient):
        self.session = session
        self.ai = ai_client

    def generate(self, campaign_id: int, quotes: list[str] | None = None) -> str:
        campaign = self.session.get(Campaign, campaign_id)

        text = self.ai.generate_press_release(
            client_name=campaign.client_name,
            story_summary=campaign.story_summary,
            details=campaign.story_details or {},
            quotes=quotes or [],
        )

        campaign.press_release = text
        self.session.flush()
        return text
```

- [ ] **Step 5: Implement FollowupGenerator**

```python
# src/pr/content/followups.py
from sqlalchemy.orm import Session

from pr.ai.client import AIClient
from pr.models import Outreach, OutreachContentType, OutreachStatus


# Map current content type to next follow-up type
_NEXT_FOLLOWUP = {
    OutreachContentType.pitch: OutreachContentType.follow_up_1,
    OutreachContentType.follow_up_1: OutreachContentType.follow_up_2,
    OutreachContentType.follow_up_2: OutreachContentType.follow_up_3,
}


class FollowupGenerator:
    def __init__(self, session: Session, ai_client: AIClient):
        self.session = session
        self.ai = ai_client

    def generate(self, outreach_id: int, new_angle: str | None = None) -> Outreach:
        original = self.session.get(Outreach, outreach_id)

        next_type = _NEXT_FOLLOWUP.get(original.content_type)
        if next_type is None:
            raise ValueError(f"Cannot follow up on {original.content_type.value} — max follow-ups reached")

        followup_number = int(next_type.value.split("_")[-1])

        result = self.ai.generate_followup(
            original_subject=original.email_subject,
            original_body=original.email_body,
            journalist_name=original.journalist.name,
            followup_number=followup_number,
            new_angle=new_angle,
        )

        followup = Outreach(
            campaign_id=original.campaign_id,
            journalist_id=original.journalist_id,
            email_subject=result["subject"],
            email_body=result["body"],
            content_type=next_type,
            status=OutreachStatus.draft,
        )
        self.session.add(followup)
        self.session.flush()
        return followup
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pytest tests/test_content/test_press_releases.py tests/test_content/test_followups.py -v
```

Expected: All 2 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pr/content/ tests/test_content/
git commit -m "feat: press release and follow-up generators"
```

---

## Task 12: Content Review Queue

**Files:**
- Create: `src/pr/content/review_queue.py`
- Create: `tests/test_content/test_review_queue.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_content/test_review_queue.py
from pr.content.review_queue import ReviewQueue
from pr.models import OutreachStatus
from tests.factories import make_outreach, make_campaign, make_journalist


def test_list_pending_reviews(session):
    j = make_journalist(session)
    c = make_campaign(session)
    make_outreach(session, campaign=c, journalist=j, status=OutreachStatus.draft, email_subject="Draft 1")
    make_outreach(session, campaign=c, journalist=j, status=OutreachStatus.approved, email_subject="Approved 1")
    make_outreach(session, campaign=c, journalist=j, status=OutreachStatus.sent, email_subject="Sent 1")

    queue = ReviewQueue(session)
    pending = queue.list_pending()
    assert len(pending) == 1
    assert pending[0].email_subject == "Draft 1"


def test_approve(session):
    o = make_outreach(session, status=OutreachStatus.draft)
    queue = ReviewQueue(session)
    queue.approve(o.id)
    session.refresh(o)
    assert o.status == OutreachStatus.approved


def test_reject_deletes_outreach(session):
    o = make_outreach(session, status=OutreachStatus.draft)
    oid = o.id
    queue = ReviewQueue(session)
    queue.reject(oid)
    session.flush()
    assert session.get(type(o), oid) is None


def test_edit_and_approve(session):
    o = make_outreach(session, status=OutreachStatus.draft, email_body="Old body")
    queue = ReviewQueue(session)
    queue.edit(o.id, email_body="New body")
    session.refresh(o)
    assert o.email_body == "New body"
    assert o.status == OutreachStatus.draft  # still draft until explicitly approved
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_content/test_review_queue.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement ReviewQueue**

```python
# src/pr/content/review_queue.py
from sqlalchemy.orm import Session

from pr.models import Outreach, OutreachStatus


class ReviewQueue:
    def __init__(self, session: Session):
        self.session = session

    def list_pending(self, campaign_id: int | None = None) -> list[Outreach]:
        q = self.session.query(Outreach).filter(Outreach.status == OutreachStatus.draft)
        if campaign_id:
            q = q.filter(Outreach.campaign_id == campaign_id)
        return q.order_by(Outreach.created_at).all()

    def approve(self, outreach_id: int) -> None:
        outreach = self.session.get(Outreach, outreach_id)
        outreach.status = OutreachStatus.approved
        self.session.flush()

    def reject(self, outreach_id: int) -> None:
        outreach = self.session.get(Outreach, outreach_id)
        self.session.delete(outreach)
        self.session.flush()

    def edit(self, outreach_id: int, **kwargs) -> Outreach:
        outreach = self.session.get(Outreach, outreach_id)
        for key, value in kwargs.items():
            setattr(outreach, key, value)
        self.session.flush()
        return outreach
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_content/test_review_queue.py -v
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pr/content/review_queue.py tests/test_content/test_review_queue.py
git commit -m "feat: content review queue — list, approve, reject, edit outreach drafts"
```

---

## Task 13: Email Sender

**Files:**
- Create: `src/pr/outreach/sender.py`
- Create: `tests/test_outreach/test_sender.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_outreach/test_sender.py
from datetime import datetime
from unittest.mock import patch, MagicMock
from pr.outreach.sender import EmailSender
from pr.models import OutreachStatus
from tests.factories import make_outreach, make_campaign, make_journalist


def test_send_approved_email(session):
    o = make_outreach(session, status=OutreachStatus.approved)

    with patch("pr.outreach.sender.resend") as mock_resend:
        mock_resend.Emails.send.return_value = {"id": "email_123"}
        sender = EmailSender(session=session, from_email="pr@agency.com", api_key="test")
        sender.send(o.id)

    session.refresh(o)
    assert o.status == OutreachStatus.sent
    assert o.sent_at is not None
    mock_resend.Emails.send.assert_called_once()


def test_cannot_send_draft(session):
    o = make_outreach(session, status=OutreachStatus.draft)

    sender = EmailSender(session=session, from_email="pr@agency.com", api_key="test")
    try:
        sender.send(o.id)
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "approved" in str(e).lower()


def test_send_campaign_sends_all_approved(session):
    j1 = make_journalist(session, name="J1", email="j1@g.com")
    j2 = make_journalist(session, name="J2", email="j2@g.com")
    campaign = make_campaign(session)
    o1 = make_outreach(session, campaign=campaign, journalist=j1, status=OutreachStatus.approved, email_subject="P1")
    o2 = make_outreach(session, campaign=campaign, journalist=j2, status=OutreachStatus.approved, email_subject="P2")
    o3 = make_outreach(session, campaign=campaign, journalist=j1, status=OutreachStatus.draft, email_subject="P3")

    with patch("pr.outreach.sender.resend") as mock_resend:
        mock_resend.Emails.send.return_value = {"id": "email_123"}
        sender = EmailSender(session=session, from_email="pr@agency.com", api_key="test")
        sent_count = sender.send_campaign(campaign.id)

    assert sent_count == 2
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_outreach/test_sender.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement EmailSender**

```python
# src/pr/outreach/sender.py
from datetime import datetime

import resend
from sqlalchemy.orm import Session

from pr.models import Outreach, OutreachStatus, Interaction, InteractionType


class EmailSender:
    def __init__(self, session: Session, from_email: str, api_key: str):
        self.session = session
        self.from_email = from_email
        resend.api_key = api_key

    def send(self, outreach_id: int) -> None:
        outreach = self.session.get(Outreach, outreach_id)

        if outreach.status != OutreachStatus.approved:
            raise ValueError(f"Cannot send: outreach must be approved (currently {outreach.status.value})")

        journalist = outreach.journalist
        if not journalist.email:
            raise ValueError(f"Journalist {journalist.name} has no email address")

        resend.Emails.send({
            "from": self.from_email,
            "to": journalist.email,
            "subject": outreach.email_subject,
            "text": outreach.email_body,
        })

        outreach.status = OutreachStatus.sent
        outreach.sent_at = datetime.now()

        interaction = Interaction(
            journalist_id=journalist.id,
            outreach_id=outreach.id,
            type=InteractionType.email_sent,
            details=f"Sent: {outreach.email_subject}",
        )
        self.session.add(interaction)
        self.session.flush()

    def send_campaign(self, campaign_id: int) -> int:
        approved = (
            self.session.query(Outreach)
            .filter(
                Outreach.campaign_id == campaign_id,
                Outreach.status == OutreachStatus.approved,
            )
            .all()
        )

        sent_count = 0
        for outreach in approved:
            self.send(outreach.id)
            sent_count += 1

        return sent_count
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_outreach/test_sender.py -v
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pr/outreach/sender.py tests/test_outreach/test_sender.py
git commit -m "feat: email sender — send approved outreach via Resend, log interactions"
```

---

## Task 14: Reply Detection & Classification

**Files:**
- Create: `src/pr/outreach/replies.py`
- Create: `tests/test_outreach/test_replies.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_outreach/test_replies.py
from unittest.mock import patch, MagicMock
from pr.outreach.replies import ReplyDetector
from pr.models import OutreachStatus, ReplyClassification
from tests.factories import make_outreach, make_campaign, make_journalist


def test_match_reply_to_outreach(session):
    j = make_journalist(session, email="jane@gazette.com")
    c = make_campaign(session)
    o = make_outreach(
        session, campaign=c, journalist=j,
        status=OutreachStatus.sent,
        email_subject="Story idea: Bob's BBQ",
    )

    detector = ReplyDetector(session=session, ai_client=MagicMock())
    match = detector.match_reply(
        from_email="jane@gazette.com",
        subject="Re: Story idea: Bob's BBQ",
    )
    assert match is not None
    assert match.id == o.id


def test_classify_and_update_reply(session):
    j = make_journalist(session, email="jane@gazette.com")
    c = make_campaign(session)
    o = make_outreach(
        session, campaign=c, journalist=j,
        status=OutreachStatus.sent,
        email_subject="Story idea: Bob's BBQ",
    )

    ai = MagicMock()
    ai.classify_reply.return_value = {
        "classification": "interested",
        "reasoning": "Asked for more details",
    }

    detector = ReplyDetector(session=session, ai_client=ai)
    detector.process_reply(
        from_email="jane@gazette.com",
        subject="Re: Story idea: Bob's BBQ",
        body="Sounds interesting! Can you send photos?",
    )

    session.refresh(o)
    assert o.status == OutreachStatus.replied
    assert o.reply_classification == ReplyClassification.interested
    assert o.replied_at is not None


def test_no_match_returns_none(session):
    detector = ReplyDetector(session=session, ai_client=MagicMock())
    match = detector.match_reply(
        from_email="unknown@random.com",
        subject="Unrelated email",
    )
    assert match is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_outreach/test_replies.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement ReplyDetector**

```python
# src/pr/outreach/replies.py
import re
from datetime import datetime

from sqlalchemy.orm import Session

from pr.ai.client import AIClient
from pr.models import (
    Outreach, OutreachStatus, ReplyClassification,
    Interaction, InteractionType, Journalist,
)


class ReplyDetector:
    def __init__(self, session: Session, ai_client: AIClient):
        self.session = session
        self.ai = ai_client

    def match_reply(self, from_email: str, subject: str) -> Outreach | None:
        # Strip "Re: " prefixes
        clean_subject = re.sub(r"^(Re:\s*)+", "", subject, flags=re.IGNORECASE).strip()

        # Find journalist by email
        journalist = (
            self.session.query(Journalist)
            .filter(Journalist.email.ilike(from_email))
            .first()
        )
        if not journalist:
            return None

        # Find matching sent outreach
        outreach = (
            self.session.query(Outreach)
            .filter(
                Outreach.journalist_id == journalist.id,
                Outreach.status.in_([OutreachStatus.sent, OutreachStatus.opened]),
                Outreach.email_subject.ilike(f"%{clean_subject}%"),
            )
            .order_by(Outreach.sent_at.desc())
            .first()
        )
        return outreach

    def process_reply(self, from_email: str, subject: str, body: str) -> Outreach | None:
        outreach = self.match_reply(from_email, subject)
        if not outreach:
            return None

        # Classify the reply
        result = self.ai.classify_reply(reply_text=body)
        classification = ReplyClassification(result["classification"])

        outreach.status = OutreachStatus.replied
        outreach.replied_at = datetime.now()
        outreach.reply_classification = classification

        interaction = Interaction(
            journalist_id=outreach.journalist_id,
            outreach_id=outreach.id,
            type=InteractionType.reply_received,
            details=f"Classification: {classification.value} — {result.get('reasoning', '')}",
        )
        self.session.add(interaction)
        self.session.flush()

        return outreach
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_outreach/test_replies.py -v
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pr/outreach/replies.py tests/test_outreach/test_replies.py
git commit -m "feat: reply detection — match incoming emails to outreach, AI-classify responses"
```

---

## Task 15: Send Scheduler & Rate Limiter

**Files:**
- Create: `src/pr/outreach/scheduler.py`
- Create: `tests/test_outreach/test_scheduler.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_outreach/test_scheduler.py
from datetime import datetime, date
from pr.outreach.scheduler import SendScheduler
from pr.models import OutreachStatus
from tests.factories import make_outreach, make_campaign, make_journalist


def test_daily_limit_respected(session):
    j = make_journalist(session)
    c = make_campaign(session)

    # Create 25 approved outreach records
    for i in range(25):
        make_outreach(
            session, campaign=c, journalist=j,
            status=OutreachStatus.approved,
            email_subject=f"Pitch {i}",
        )

    scheduler = SendScheduler(session=session, daily_limit=20)
    batch = scheduler.get_sendable_batch()
    assert len(batch) <= 20


def test_already_sent_today_reduces_batch(session):
    j = make_journalist(session)
    c = make_campaign(session)

    # 15 already sent today
    for i in range(15):
        make_outreach(
            session, campaign=c, journalist=j,
            status=OutreachStatus.sent,
            sent_at=datetime.now(),
            email_subject=f"Sent {i}",
        )

    # 10 approved waiting
    for i in range(10):
        make_outreach(
            session, campaign=c, journalist=j,
            status=OutreachStatus.approved,
            email_subject=f"Approved {i}",
        )

    scheduler = SendScheduler(session=session, daily_limit=20)
    batch = scheduler.get_sendable_batch()
    assert len(batch) <= 5


def test_empty_when_limit_reached(session):
    j = make_journalist(session)
    c = make_campaign(session)

    for i in range(20):
        make_outreach(
            session, campaign=c, journalist=j,
            status=OutreachStatus.sent,
            sent_at=datetime.now(),
            email_subject=f"Sent {i}",
        )

    make_outreach(session, campaign=c, journalist=j, status=OutreachStatus.approved, email_subject="Extra")

    scheduler = SendScheduler(session=session, daily_limit=20)
    batch = scheduler.get_sendable_batch()
    assert len(batch) == 0
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_outreach/test_scheduler.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement SendScheduler**

```python
# src/pr/outreach/scheduler.py
from datetime import datetime, date

from sqlalchemy import func
from sqlalchemy.orm import Session

from pr.models import Outreach, OutreachStatus


class SendScheduler:
    def __init__(self, session: Session, daily_limit: int = 20):
        self.session = session
        self.daily_limit = daily_limit

    def _sent_today_count(self) -> int:
        today_start = datetime.combine(date.today(), datetime.min.time())
        return (
            self.session.query(func.count(Outreach.id))
            .filter(
                Outreach.status == OutreachStatus.sent,
                Outreach.sent_at >= today_start,
            )
            .scalar()
        )

    def get_sendable_batch(self) -> list[Outreach]:
        remaining = self.daily_limit - self._sent_today_count()
        if remaining <= 0:
            return []

        return (
            self.session.query(Outreach)
            .filter(Outreach.status == OutreachStatus.approved)
            .order_by(Outreach.created_at)
            .limit(remaining)
            .all()
        )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_outreach/test_scheduler.py -v
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pr/outreach/scheduler.py tests/test_outreach/test_scheduler.py
git commit -m "feat: send scheduler — rate-limited daily batching of approved outreach"
```

---

## Task 16: CLI — Main App & Scrape Commands

**Files:**
- Create: `src/pr/cli/__init__.py`
- Create: `src/pr/cli/main.py`
- Create: `src/pr/cli/scrape.py`
- Create: `src/pr/cli/display.py`

- [ ] **Step 1: Create display helpers**

```python
# src/pr/cli/display.py
from rich.console import Console
from rich.table import Table

from pr.models import Journalist, Outreach, Campaign

console = Console()


def journalist_table(journalists: list[Journalist]) -> Table:
    table = Table(title="Journalists")
    table.add_column("ID", style="dim")
    table.add_column("Name", style="bold")
    table.add_column("Email")
    table.add_column("Publication")
    table.add_column("Beat")
    table.add_column("Warmth", justify="right")
    table.add_column("Status")

    for j in journalists:
        pub_name = j.publication.name if j.publication else "—"
        table.add_row(
            str(j.id), j.name, j.email or "—", pub_name,
            j.beat or "—", str(j.warmth_score), j.status.value,
        )
    return table


def outreach_table(records: list[Outreach]) -> Table:
    table = Table(title="Outreach")
    table.add_column("ID", style="dim")
    table.add_column("Journalist", style="bold")
    table.add_column("Subject")
    table.add_column("Type")
    table.add_column("Status")

    for o in records:
        table.add_row(
            str(o.id), o.journalist.name, o.email_subject,
            o.content_type.value, o.status.value,
        )
    return table


def campaign_table(campaigns: list[Campaign]) -> Table:
    table = Table(title="Campaigns")
    table.add_column("ID", style="dim")
    table.add_column("Client", style="bold")
    table.add_column("Story")
    table.add_column("Status")

    for c in campaigns:
        summary = c.story_summary[:60] + "..." if len(c.story_summary) > 60 else c.story_summary
        table.add_row(str(c.id), c.client_name, summary, c.status.value)
    return table
```

- [ ] **Step 2: Create main CLI app**

```python
# src/pr/cli/main.py
import typer

from pr.cli.scrape import app as scrape_app
from pr.cli.journalists import app as journalists_app
from pr.cli.campaigns import app as campaigns_app
from pr.cli.pitches import app as pitches_app
from pr.cli.review import app as review_app
from pr.cli.outreach import app as outreach_app

app = typer.Typer(name="pr", help="AI PR Engine — scrape, pitch, place.")

app.add_typer(scrape_app, name="scrape")
app.add_typer(journalists_app, name="journalists")
app.add_typer(campaigns_app, name="campaign")
app.add_typer(pitches_app, name="pitch")
app.add_typer(review_app, name="review")
app.add_typer(outreach_app, name="outreach")

if __name__ == "__main__":
    app()
```

- [ ] **Step 3: Create scrape CLI commands**

```python
# src/pr/cli/scrape.py
import asyncio

import typer
from rich.progress import Progress

from pr.cli.display import console
from pr.config import settings
from pr.db import SessionLocal
from pr.models import Publication, PublicationType
from pr.scraper.publications import PublicationScraper
from pr.scraper.enrichment import ArticleEnricher
from pr.ai.client import AIClient

app = typer.Typer(help="Scrape local publications for journalist data.")


@app.command("market")
def scrape_market(
    market: str = typer.Argument(help="Metro area to scrape, e.g. 'Austin, TX'"),
    urls: list[str] = typer.Option([], "--url", "-u", help="Publication URLs to scrape"),
):
    """Scrape publication websites in a market for journalist data."""
    if not urls:
        console.print("[yellow]Provide publication URLs with --url flags.[/yellow]")
        console.print("Example: pr scrape market 'Austin, TX' --url https://austinchronicle.com --url https://statesman.com")
        raise typer.Exit(1)

    session = SessionLocal()
    scraper = PublicationScraper()

    with Progress() as progress:
        task = progress.add_task("Scraping publications...", total=len(urls))

        for url in urls:
            # Create or find publication
            pub = session.query(Publication).filter(Publication.url == url).first()
            if not pub:
                pub = Publication(
                    name=url.split("//")[1].split("/")[0],
                    url=url,
                    type=PublicationType.newspaper,
                    market=market,
                )
                session.add(pub)
                session.flush()

            result = asyncio.run(scraper.scrape_publication(url))
            console.print(f"  Found {len(result['staff'])} staff, {len(result['homepage_emails'])} emails")

            # Import staff as journalists
            from pr.crm.profiles import JournalistProfileManager
            mgr = JournalistProfileManager(session)
            for staff in result["staff"]:
                existing = session.query(
                    session.query(Publication).filter(Publication.id == pub.id).exists()
                ).scalar()
                mgr.create(
                    name=staff["name"],
                    email=staff.get("email"),
                    publication_id=pub.id,
                    beat=staff.get("role"),
                )

            progress.advance(task)

    session.commit()
    console.print(f"[green]Done! Scraped {len(urls)} publications in {market}.[/green]")


@app.command("enrich")
def enrich_articles():
    """Run AI analysis on scraped articles to detect beats and styles."""
    session = SessionLocal()
    ai = AIClient(api_key=settings.anthropic_api_key)
    enricher = ArticleEnricher(ai_client=ai)

    from pr.models import Article, Journalist
    articles = session.query(Article).filter(Article.content_summary.is_(None)).all()
    console.print(f"Enriching {len(articles)} articles...")

    for article in articles:
        result = enricher.enrich_article(article.title, article.content_summary or "")
        article.content_summary = result["summary"]
        article.topics = result["topics"]

        if article.journalist:
            j = article.journalist
            if not j.beat:
                j.beat = result["beat"]
            if not j.writing_style:
                j.writing_style = result["style"]

    session.commit()
    console.print("[green]Enrichment complete.[/green]")
```

- [ ] **Step 4: Commit**

```bash
git add src/pr/cli/
git commit -m "feat: CLI scaffolding — main app, scrape commands, display helpers"
```

---

## Task 17: CLI — Journalists, Campaigns, Pitches, Review, Outreach

**Files:**
- Create: `src/pr/cli/journalists.py`
- Create: `src/pr/cli/campaigns.py`
- Create: `src/pr/cli/pitches.py`
- Create: `src/pr/cli/review.py`
- Create: `src/pr/cli/outreach.py`

- [ ] **Step 1: Journalists CLI**

```python
# src/pr/cli/journalists.py
import typer

from pr.cli.display import console, journalist_table
from pr.db import SessionLocal
from pr.crm.profiles import JournalistProfileManager
from pr.crm.search import JournalistSearch

app = typer.Typer(help="Manage journalist profiles.")


@app.command("list")
def list_journalists(
    limit: int = typer.Option(50, help="Max results"),
):
    """List all journalists ordered by warmth score."""
    session = SessionLocal()
    mgr = JournalistProfileManager(session)
    journalists = mgr.list_all(limit=limit)
    console.print(journalist_table(journalists))


@app.command("search")
def search_journalists(
    query: str = typer.Argument(help="Search term — matches name, beat, email, notes"),
    beat: str | None = typer.Option(None, help="Filter by beat"),
    topic: str | None = typer.Option(None, help="Filter by topic"),
    min_warmth: int | None = typer.Option(None, help="Minimum warmth score"),
):
    """Search journalists by keyword, beat, topic, or warmth."""
    session = SessionLocal()
    search = JournalistSearch(session)
    results = search.search(query=query, beat=beat, topic=topic, min_warmth=min_warmth)
    console.print(journalist_table(results))
    console.print(f"\n[dim]{len(results)} results[/dim]")


@app.command("show")
def show_journalist(
    journalist_id: int = typer.Argument(help="Journalist ID"),
):
    """Show full profile for a journalist."""
    session = SessionLocal()
    mgr = JournalistProfileManager(session)
    j = mgr.get(journalist_id)
    if not j:
        console.print(f"[red]Journalist {journalist_id} not found.[/red]")
        raise typer.Exit(1)

    console.print(f"\n[bold]{j.name}[/bold]")
    console.print(f"  Email: {j.email or '—'}")
    console.print(f"  Publication: {j.publication.name if j.publication else '—'}")
    console.print(f"  Beat: {j.beat or '—'}")
    console.print(f"  Topics: {', '.join(j.topics) if j.topics else '—'}")
    console.print(f"  Style: {j.writing_style or '—'}")
    console.print(f"  Warmth: {j.warmth_score}")
    console.print(f"  Status: {j.status.value}")
    console.print(f"  Twitter: {j.twitter_handle or '—'}")
    if j.notes:
        console.print(f"  Notes:\n    {j.notes}")

    if j.articles:
        console.print(f"\n  [bold]Recent Articles ({len(j.articles)}):[/bold]")
        for a in j.articles[:5]:
            console.print(f"    • {a.title} ({a.url})")
```

- [ ] **Step 2: Campaigns CLI**

```python
# src/pr/cli/campaigns.py
import typer

from pr.cli.display import console, campaign_table
from pr.db import SessionLocal
from pr.models import Campaign, CampaignStatus
from pr.config import settings
from pr.ai.client import AIClient
from pr.content.press_releases import PressReleaseGenerator

app = typer.Typer(help="Manage client campaigns.")


@app.command("create")
def create_campaign(
    client: str = typer.Option(..., "--client", prompt="Client name"),
    business: str = typer.Option("", "--business", prompt="Business type"),
    story: str = typer.Option(..., "--story", prompt="Story summary (what's the news?)"),
):
    """Create a new campaign for a client."""
    session = SessionLocal()
    campaign = Campaign(
        client_name=client,
        client_business=business,
        story_summary=story,
        status=CampaignStatus.draft,
    )
    session.add(campaign)
    session.commit()
    console.print(f"[green]Campaign #{campaign.id} created for {client}.[/green]")


@app.command("list")
def list_campaigns():
    """List all campaigns."""
    session = SessionLocal()
    campaigns = session.query(Campaign).order_by(Campaign.created_at.desc()).all()
    console.print(campaign_table(campaigns))


@app.command("press-release")
def generate_press_release(
    campaign_id: int = typer.Argument(help="Campaign ID"),
    quotes: list[str] = typer.Option([], "--quote", "-q", help="Quotes to include"),
):
    """Generate a press release for a campaign."""
    session = SessionLocal()
    ai = AIClient(api_key=settings.anthropic_api_key)
    gen = PressReleaseGenerator(session=session, ai_client=ai)
    text = gen.generate(campaign_id=campaign_id, quotes=quotes)
    session.commit()
    console.print("\n[bold]Generated Press Release:[/bold]\n")
    console.print(text)
```

- [ ] **Step 3: Pitches CLI**

```python
# src/pr/cli/pitches.py
import typer

from pr.cli.display import console
from pr.db import SessionLocal
from pr.config import settings
from pr.ai.client import AIClient
from pr.content.pitches import PitchGenerator
from pr.crm.search import JournalistSearch

app = typer.Typer(help="Generate pitch emails.")


@app.command("generate")
def generate_pitch(
    campaign_id: int = typer.Option(..., "--campaign", "-c", help="Campaign ID"),
    journalist_id: int | None = typer.Option(None, "--journalist", "-j", help="Journalist ID"),
    auto_match: bool = typer.Option(False, "--auto-match", help="AI picks best journalists"),
    limit: int = typer.Option(5, "--limit", help="Max journalists for auto-match"),
):
    """Generate a personalized pitch email."""
    session = SessionLocal()
    ai = AIClient(api_key=settings.anthropic_api_key)
    gen = PitchGenerator(session=session, ai_client=ai)

    if journalist_id:
        outreach = gen.generate(campaign_id=campaign_id, journalist_id=journalist_id)
        console.print(f"\n[bold]Pitch for {outreach.journalist.name}:[/bold]")
        console.print(f"  Subject: {outreach.email_subject}")
        console.print(f"  Body:\n{outreach.email_body}\n")
        console.print(f"[dim]Outreach #{outreach.id} created as draft. Use 'pr review' to approve.[/dim]")
        session.commit()

    elif auto_match:
        from pr.models import Campaign
        campaign = session.get(Campaign, campaign_id)
        search = JournalistSearch(session)
        # Search by story keywords
        keywords = campaign.story_summary.split()[:3]
        journalists = search.search(query=" ".join(keywords), limit=limit)

        if not journalists:
            console.print("[yellow]No matching journalists found. Try manual selection.[/yellow]")
            raise typer.Exit(1)

        console.print(f"[bold]Auto-matched {len(journalists)} journalists:[/bold]")
        for j in journalists:
            outreach = gen.generate(campaign_id=campaign_id, journalist_id=j.id)
            console.print(f"  • {j.name} — {outreach.email_subject}")

        session.commit()
        console.print(f"\n[dim]{len(journalists)} pitches created as drafts. Use 'pr review' to approve.[/dim]")

    else:
        console.print("[yellow]Specify --journalist or --auto-match[/yellow]")
        raise typer.Exit(1)
```

- [ ] **Step 4: Review CLI**

```python
# src/pr/cli/review.py
import typer

from pr.cli.display import console, outreach_table
from pr.db import SessionLocal
from pr.content.review_queue import ReviewQueue

app = typer.Typer(help="Review and approve outreach content.")


@app.callback(invoke_without_command=True)
def review_queue(
    campaign_id: int | None = typer.Option(None, "--campaign", "-c", help="Filter by campaign"),
):
    """Show pending content for review."""
    session = SessionLocal()
    queue = ReviewQueue(session)
    pending = queue.list_pending(campaign_id=campaign_id)

    if not pending:
        console.print("[dim]No content pending review.[/dim]")
        return

    console.print(outreach_table(pending))

    for item in pending:
        console.print(f"\n[bold]Outreach #{item.id} — {item.journalist.name}[/bold]")
        console.print(f"  Subject: {item.email_subject}")
        console.print(f"  Body:\n{item.email_body}\n")

        action = typer.prompt("  [a]pprove / [e]dit / [r]eject / [s]kip", default="s")

        if action == "a":
            queue.approve(item.id)
            console.print("  [green]Approved.[/green]")
        elif action == "e":
            new_body = typer.prompt("  New body")
            queue.edit(item.id, email_body=new_body)
            console.print("  [yellow]Edited. Review again to approve.[/yellow]")
        elif action == "r":
            queue.reject(item.id)
            console.print("  [red]Rejected and deleted.[/red]")
        else:
            console.print("  [dim]Skipped.[/dim]")

    session.commit()
```

- [ ] **Step 5: Outreach CLI (send, status, followup)**

```python
# src/pr/cli/outreach.py
import typer

from pr.cli.display import console, outreach_table
from pr.db import SessionLocal
from pr.config import settings
from pr.outreach.sender import EmailSender
from pr.outreach.scheduler import SendScheduler
from pr.models import Outreach, Campaign

app = typer.Typer(help="Send emails and track outreach.")


@app.command("send")
def send_campaign(
    campaign_id: int = typer.Argument(help="Campaign ID"),
):
    """Send all approved outreach for a campaign (respects daily limit)."""
    session = SessionLocal()
    scheduler = SendScheduler(session=session, daily_limit=settings.daily_send_limit)
    batch = scheduler.get_sendable_batch()

    # Filter to this campaign
    campaign_batch = [o for o in batch if o.campaign_id == campaign_id]

    if not campaign_batch:
        console.print("[yellow]No approved emails to send (or daily limit reached).[/yellow]")
        return

    sender = EmailSender(
        session=session,
        from_email=settings.smtp_from_email,
        api_key=settings.resend_api_key,
    )

    for outreach in campaign_batch:
        sender.send(outreach.id)
        console.print(f"  [green]Sent to {outreach.journalist.name}[/green]: {outreach.email_subject}")

    session.commit()
    console.print(f"\n[bold green]{len(campaign_batch)} emails sent.[/bold green]")


@app.command("status")
def campaign_status(
    campaign_id: int = typer.Argument(help="Campaign ID"),
):
    """Show outreach status for a campaign."""
    session = SessionLocal()
    records = (
        session.query(Outreach)
        .filter(Outreach.campaign_id == campaign_id)
        .order_by(Outreach.created_at)
        .all()
    )
    if not records:
        console.print("[dim]No outreach for this campaign.[/dim]")
        return
    console.print(outreach_table(records))

    # Summary
    from collections import Counter
    status_counts = Counter(o.status.value for o in records)
    console.print(f"\n[bold]Summary:[/bold] {dict(status_counts)}")


@app.command("followup")
def generate_followups(
    campaign_id: int = typer.Argument(help="Campaign ID"),
):
    """Generate follow-ups for sent emails with no reply."""
    from pr.ai.client import AIClient
    from pr.content.followups import FollowupGenerator
    from pr.models import OutreachStatus, OutreachContentType

    session = SessionLocal()
    ai = AIClient(api_key=settings.anthropic_api_key)
    gen = FollowupGenerator(session=session, ai_client=ai)

    # Find sent pitches with no reply
    sent_no_reply = (
        session.query(Outreach)
        .filter(
            Outreach.campaign_id == campaign_id,
            Outreach.status == OutreachStatus.sent,
            Outreach.content_type == OutreachContentType.pitch,
        )
        .all()
    )

    if not sent_no_reply:
        console.print("[dim]No outreach eligible for follow-up.[/dim]")
        return

    console.print(f"Generating follow-ups for {len(sent_no_reply)} emails...")
    for outreach in sent_no_reply:
        followup = gen.generate(outreach_id=outreach.id)
        console.print(f"  • {outreach.journalist.name}: {followup.email_subject}")

    session.commit()
    console.print(f"\n[dim]{len(sent_no_reply)} follow-ups created as drafts. Use 'pr review' to approve.[/dim]")
```

- [ ] **Step 6: Commit**

```bash
git add src/pr/cli/
git commit -m "feat: complete CLI — journalists, campaigns, pitches, review, outreach commands"
```

---

## Task 18: Integration Test — Full Workflow

**Files:**
- Create: `tests/test_workflow.py`

End-to-end test of the core workflow with mocked AI and email.

- [ ] **Step 1: Write integration test**

```python
# tests/test_workflow.py
"""Integration test: full workflow from journalist creation through pitch send."""
from unittest.mock import MagicMock

from pr.crm.profiles import JournalistProfileManager
from pr.crm.search import JournalistSearch
from pr.crm.warmth import WarmthScorer
from pr.content.pitches import PitchGenerator
from pr.content.review_queue import ReviewQueue
from pr.content.followups import FollowupGenerator
from pr.outreach.sender import EmailSender
from pr.outreach.replies import ReplyDetector
from pr.models import (
    Campaign, CampaignStatus, OutreachStatus, OutreachContentType,
    ReplyClassification,
)
from tests.factories import make_publication


def test_full_workflow(session):
    # --- 1. Create publication and journalist ---
    pub = make_publication(session, name="Austin Chronicle", market="Austin, TX")
    mgr = JournalistProfileManager(session)
    journalist = mgr.create(
        name="Jane Smith",
        email="jane@chronicle.com",
        publication_id=pub.id,
        beat="food & dining",
        writing_style="Conversational, story-driven",
        topics=["restaurants", "food trucks", "local chefs"],
    )

    # --- 2. Search for journalist ---
    search = JournalistSearch(session)
    results = search.search(topic="restaurants")
    assert len(results) == 1
    assert results[0].id == journalist.id

    # --- 3. Create campaign ---
    campaign = Campaign(
        client_name="Bob's BBQ",
        client_business="BBQ restaurant",
        story_summary="Bob's BBQ opening second location in South Austin with new brisket recipe",
        status=CampaignStatus.active,
    )
    session.add(campaign)
    session.flush()

    # --- 4. Generate pitch ---
    ai = MagicMock()
    ai.generate_pitch.return_value = {
        "subject": "Story idea: Bob's BBQ expanding to South Austin",
        "body": "Hi Jane,\n\nGiven your excellent coverage of Austin's food scene...",
    }
    pitch_gen = PitchGenerator(session=session, ai_client=ai)
    outreach = pitch_gen.generate(campaign_id=campaign.id, journalist_id=journalist.id)
    assert outreach.status == OutreachStatus.draft

    # --- 5. Review and approve ---
    queue = ReviewQueue(session)
    pending = queue.list_pending()
    assert len(pending) == 1
    queue.approve(outreach.id)
    session.refresh(outreach)
    assert outreach.status == OutreachStatus.approved

    # --- 6. Send ---
    import pr.outreach.sender as sender_mod
    sender_mod.resend = MagicMock()
    sender_mod.resend.Emails.send.return_value = {"id": "email_123"}
    sender = EmailSender(session=session, from_email="pr@agency.com", api_key="test")
    sender.send(outreach.id)
    session.refresh(outreach)
    assert outreach.status == OutreachStatus.sent

    # --- 7. Warmth score updates ---
    scorer = WarmthScorer(session)
    score = scorer.calculate(journalist.id)
    assert score > 0

    # --- 8. Reply received ---
    ai.classify_reply.return_value = {
        "classification": "interested",
        "reasoning": "Asked for more details",
    }
    detector = ReplyDetector(session=session, ai_client=ai)
    detector.process_reply(
        from_email="jane@chronicle.com",
        subject="Re: Story idea: Bob's BBQ expanding to South Austin",
        body="This sounds great! Can you send me photos and a quote from Bob?",
    )
    session.refresh(outreach)
    assert outreach.status == OutreachStatus.replied
    assert outreach.reply_classification == ReplyClassification.interested

    # --- 9. Warmth score increased after reply ---
    new_score = scorer.calculate(journalist.id)
    assert new_score > score
```

- [ ] **Step 2: Run integration test**

```bash
pytest tests/test_workflow.py -v
```

Expected: PASS

- [ ] **Step 3: Run full test suite**

```bash
pytest --tb=short -v
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/test_workflow.py
git commit -m "test: full workflow integration test — journalist → pitch → send → reply"
```

---

## Task 19: Final Setup & Documentation

**Files:**
- Create: `ai-pr-engine/README.md`

- [ ] **Step 1: Create README with setup instructions**

```markdown
# AI PR Engine

AI-powered journalist scraper, CRM, and outreach system for PR agencies.

## Setup

### Prerequisites
- Python 3.12+
- PostgreSQL
- Redis (for background jobs)

### Install

```bash
cd ai-pr-engine
pip install -e ".[dev]"
cp .env.example .env
# Edit .env with your credentials
```

### Database

```bash
createdb pr_engine
alembic upgrade head
```

### Usage

```bash
# Scrape journalists from local publications
pr scrape market "Austin, TX" --url https://austinchronicle.com

# Search journalists
pr journalists search "food"
pr journalists show 1

# Create a campaign
pr campaign create --client "Bob's BBQ" --story "Opening second location"

# Generate pitches
pr pitch generate --campaign 1 --journalist 1
pr pitch generate --campaign 1 --auto-match

# Review and approve
pr review

# Send
pr outreach send 1

# Check status
pr outreach status 1

# Follow up
pr outreach followup 1
```
```

- [ ] **Step 2: Run full test suite one final time**

```bash
pytest --tb=short -v
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README with setup and usage instructions"
```
