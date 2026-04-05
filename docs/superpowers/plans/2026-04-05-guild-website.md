# Guild Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Guild digital agency website — an immersive, black & gold, Three.js-powered Next.js site with lead gen and portfolio showcase.

**Architecture:** Next.js 15 App Router with SSG. Three.js (via @react-three/fiber) for the hero 3D diamond scene. Framer Motion for scroll animations and page transitions. Tailwind CSS v4 for styling with custom Guild brand tokens. Content stored as TypeScript data files (no CMS). Contact form via Next.js API route + Resend.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, Three.js, @react-three/fiber, @react-three/drei, Framer Motion, GSAP, Lenis, Resend

**Spec:** `docs/superpowers/specs/2026-04-04-guild-website-design.md`

---

## File Structure

```
guild-website/
├── public/
│   └── fonts/
│       ├── Satoshi-Variable.woff2
│       └── Satoshi-Variable.ttf
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout — metadata, fonts, nav, footer, global effects
│   │   ├── page.tsx                # Home — assembles all sections
│   │   ├── contact/
│   │   │   └── page.tsx            # Contact page
│   │   ├── case-studies/
│   │   │   └── [slug]/
│   │   │       └── page.tsx        # Dynamic case study page
│   │   └── api/
│   │       └── contact/
│   │           └── route.ts        # POST handler — validates + sends email
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx          # Fixed nav — transparent → glass on scroll
│   │   │   ├── Footer.tsx          # Minimal footer
│   │   │   └── MobileMenu.tsx      # Full-screen overlay menu
│   │   ├── hero/
│   │   │   ├── HeroScene.tsx       # R3F Canvas wrapper (lazy loaded)
│   │   │   ├── Diamond.tsx         # 3D diamond mesh + refraction material
│   │   │   ├── Particles.tsx       # Gold particle system
│   │   │   └── HeroContent.tsx     # Text overlay with staggered animation
│   │   ├── sections/
│   │   │   ├── Services.tsx        # 3-card grid with corner accents
│   │   │   ├── About.tsx           # Brand story + differentiators
│   │   │   ├── Portfolio.tsx       # 2x2 case study preview grid
│   │   │   ├── Testimonials.tsx    # Carousel with auto-rotate
│   │   │   └── CallToAction.tsx    # Final CTA with dual buttons
│   │   ├── case-study/
│   │   │   ├── CaseStudyHeader.tsx # Title, description, tags
│   │   │   ├── StatCounter.tsx     # Animated count-up number
│   │   │   └── CaseStudyContent.tsx# Challenge/Approach/Results columns
│   │   ├── contact/
│   │   │   ├── ContactForm.tsx     # Form with service pills + validation
│   │   │   └── ContactInfo.tsx     # Email, response time, socials
│   │   └── ui/
│   │       ├── GoldButton.tsx      # Solid + outline variants
│   │       ├── SectionHeader.tsx   # Label + title + divider pattern
│   │       ├── CursorTrail.tsx     # Gold glow that follows mouse
│   │       ├── ScrollProgress.tsx  # Top gold progress bar
│   │       └── PageTransition.tsx  # Framer Motion route transitions
│   ├── data/
│   │   ├── case-studies.ts         # Case study content + metadata
│   │   ├── testimonials.ts         # Testimonial quotes
│   │   └── services.ts             # Service card content
│   ├── hooks/
│   │   ├── useCursorPosition.ts    # Mouse position tracker
│   │   └── useScrollProgress.ts    # Scroll percentage 0-1
│   └── styles/
│       └── globals.css             # Tailwind v4 imports + CSS custom properties
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Task 1: Project Scaffold & Tailwind Theme

**Files:**
- Create: `guild-website/package.json`
- Create: `guild-website/tsconfig.json`
- Create: `guild-website/next.config.ts`
- Create: `guild-website/tailwind.config.ts`
- Create: `guild-website/src/styles/globals.css`
- Create: `guild-website/src/app/layout.tsx`
- Create: `guild-website/src/app/page.tsx`

- [ ] **Step 1: Create Next.js project**

```bash
cd C:/Users/roota
npx create-next-app@latest guild-website --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

Expected: Project scaffolded with App Router, TypeScript, Tailwind.

- [ ] **Step 2: Install dependencies**

```bash
cd C:/Users/roota/guild-website
npm install @react-three/fiber @react-three/drei three framer-motion gsap @studio-freight/lenis resend
npm install -D @types/three
```

Expected: All packages installed.

- [ ] **Step 3: Set up Tailwind theme with Guild brand tokens**

Replace `tailwind.config.ts` with:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        guild: {
          black: "#050505",
          "black-light": "#080808",
          "black-card": "#111111",
          gold: "#d4af37",
          "gold-dim": "rgba(212,175,55,0.4)",
          "gold-glow": "rgba(212,175,55,0.15)",
        },
      },
      fontFamily: {
        heading: ["Satoshi", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      letterSpacing: {
        "guild-wide": "0.5em",
        "guild-heading": "0.25em",
        "guild-label": "0.5em",
        "guild-nav": "0.2em",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Set up globals.css with CSS custom properties**

Replace `src/styles/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --black: #050505;
    --black-light: #080808;
    --black-card: #111111;
    --gold: #d4af37;
    --gold-dim: rgba(212, 175, 55, 0.4);
    --gold-glow: rgba(212, 175, 55, 0.15);
    --white: #ffffff;
    --white-body: rgba(255, 255, 255, 0.45);
    --white-muted: rgba(255, 255, 255, 0.2);
  }

  body {
    background-color: var(--black);
    color: var(--white);
    font-family: "Inter", sans-serif;
  }

  ::selection {
    background-color: var(--gold);
    color: var(--black);
  }
}
```

- [ ] **Step 5: Download Satoshi font**

Download Satoshi Variable from https://api.fontsource.org/v1/fonts/satoshi/latin-400-normal.woff2 or use the npm package:

```bash
cd C:/Users/roota/guild-website
npm install @fontsource-variable/satoshi
```

Then in `src/styles/globals.css`, add at the top (before the `@tailwind` directives):

```css
@import "@fontsource-variable/satoshi";
```

- [ ] **Step 6: Set up root layout with Inter + Satoshi fonts**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Guild — Craft. Strategy. Mastery.",
  description:
    "Guild is a digital agency specializing in website design, artificial intelligence, and social media strategy for startups and small businesses.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-guild-black text-white font-body antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Set up placeholder home page**

Replace `src/app/page.tsx` with:

```tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-heading font-extrabold tracking-guild-heading uppercase text-white">
        GUILD
      </h1>
    </main>
  );
}
```

- [ ] **Step 8: Verify dev server runs**

```bash
cd C:/Users/roota/guild-website && npm run dev
```

Open http://localhost:3000 — should see "GUILD" centered on a black background.

- [ ] **Step 9: Commit**

```bash
cd C:/Users/roota/guild-website
git init
git add .
git commit -m "feat: scaffold Guild website with Next.js, Tailwind, and brand theme"
```

---

## Task 2: Reusable UI Components

**Files:**
- Create: `src/components/ui/GoldButton.tsx`
- Create: `src/components/ui/SectionHeader.tsx`

- [ ] **Step 1: Create GoldButton component**

Create `src/components/ui/GoldButton.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";

interface GoldButtonProps {
  children: React.ReactNode;
  variant?: "solid" | "outline";
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function GoldButton({
  children,
  variant = "outline",
  href,
  onClick,
  className = "",
}: GoldButtonProps) {
  const baseStyles =
    "inline-block px-9 py-3.5 text-[13px] font-bold tracking-[4px] uppercase cursor-pointer transition-all duration-300";

  const variantStyles =
    variant === "solid"
      ? "bg-guild-gold text-guild-black hover:bg-[#c4a030]"
      : "border border-guild-gold text-guild-gold hover:bg-guild-gold hover:text-guild-black";

  const Component = href ? motion.a : motion.button;

  return (
    <Component
      href={href}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${className}`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </Component>
  );
}
```

- [ ] **Step 2: Create SectionHeader component**

Create `src/components/ui/SectionHeader.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";

interface SectionHeaderProps {
  label: string;
  title: string;
}

export function SectionHeader({ label, title }: SectionHeaderProps) {
  return (
    <motion.div
      className="text-center mb-14"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
    >
      <p className="text-[11px] tracking-[8px] text-guild-gold uppercase mb-3">
        {label}
      </p>
      <h2 className="text-4xl font-heading font-bold tracking-guild-heading uppercase text-white">
        {title}
      </h2>
      <div className="w-10 h-px bg-guild-gold mx-auto mt-5" />
    </motion.div>
  );
}
```

- [ ] **Step 3: Verify components render**

Update `src/app/page.tsx` temporarily to import and render both:

```tsx
import { GoldButton } from "@/components/ui/GoldButton";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8">
      <SectionHeader label="Testing" title="Guild Components" />
      <div className="flex gap-4">
        <GoldButton variant="outline">Outline</GoldButton>
        <GoldButton variant="solid">Solid</GoldButton>
      </div>
    </main>
  );
}
```

Run dev server and visually verify gold buttons and section header render correctly.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/components/ui/GoldButton.tsx src/components/ui/SectionHeader.tsx src/app/page.tsx
git commit -m "feat: add GoldButton and SectionHeader reusable UI components"
```

---

## Task 3: Navbar & Footer

**Files:**
- Create: `src/components/layout/Navbar.tsx`
- Create: `src/components/layout/MobileMenu.tsx`
- Create: `src/components/layout/Footer.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create Navbar component**

Create `src/components/layout/Navbar.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MobileMenu } from "./MobileMenu";

const navLinks = [
  { label: "Services", href: "/#services" },
  { label: "Portfolio", href: "/#portfolio" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-6 transition-all duration-500 ${
          scrolled
            ? "bg-guild-black/80 backdrop-blur-md border-b border-white/5"
            : "bg-transparent"
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-8 border border-guild-gold/50 rounded-[2px_2px_40%_40%] flex items-center justify-center">
            <div className="w-2.5 h-2.5 border border-guild-gold rotate-45" />
          </div>
          <span className="text-[15px] tracking-[6px] text-guild-gold font-bold uppercase">
            Guild
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-xs tracking-guild-nav uppercase text-white/50 hover:text-guild-gold transition-colors duration-300"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA + Hamburger */}
        <div className="flex items-center gap-4">
          <Link
            href="/contact"
            className="hidden md:block px-5 py-2 border border-guild-gold/50 text-[11px] tracking-[3px] text-guild-gold uppercase hover:bg-guild-gold hover:text-guild-black transition-all duration-300"
          >
            Book a Call
          </Link>
          <button
            className="md:hidden text-white/50 hover:text-guild-gold transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8h18M3 16h18" />
            </svg>
          </button>
        </div>
      </motion.nav>

      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        links={navLinks}
      />
    </>
  );
}
```

- [ ] **Step 2: Create MobileMenu component**

Create `src/components/layout/MobileMenu.tsx`:

```tsx
"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links: { label: string; href: string }[];
}

export function MobileMenu({ isOpen, onClose, links }: MobileMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] bg-guild-black flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            className="absolute top-6 right-10 text-white/50 hover:text-guild-gold transition-colors"
            onClick={onClose}
            aria-label="Close menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>

          <nav className="flex flex-col items-center gap-8">
            {links.map((link, i) => (
              <motion.div
                key={link.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
              >
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="text-2xl tracking-[6px] uppercase text-white/70 hover:text-guild-gold transition-colors duration-300"
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Link
                href="/contact"
                onClick={onClose}
                className="mt-4 px-8 py-3 border border-guild-gold text-guild-gold text-sm tracking-[4px] uppercase hover:bg-guild-gold hover:text-guild-black transition-all duration-300"
              >
                Book a Call
              </Link>
            </motion.div>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Create Footer component**

Create `src/components/layout/Footer.tsx`:

```tsx
import Link from "next/link";

const socialLinks = [
  { label: "X", href: "#" },
  { label: "IG", href: "#" },
  { label: "LI", href: "#" },
];

export function Footer() {
  return (
    <footer className="bg-[#030303] border-t border-guild-gold/[0.08]">
      <div className="max-w-[900px] mx-auto px-10 py-10 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-[22px] h-[26px] border border-guild-gold/40 rounded-[2px_2px_40%_40%] flex items-center justify-center">
            <div className="w-2 h-2 border border-guild-gold rotate-45" />
          </div>
          <span className="text-[13px] tracking-[4px] text-guild-gold/60 font-semibold uppercase">
            Guild
          </span>
        </Link>

        {/* Copyright */}
        <p className="text-[11px] text-white/20 tracking-wide">
          © {new Date().getFullYear()} Guild. All rights reserved.
        </p>

        {/* Social */}
        <div className="flex gap-5">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[11px] tracking-[2px] text-white/30 uppercase hover:text-guild-gold transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Update root layout to include Navbar and Footer**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Guild — Craft. Strategy. Mastery.",
  description:
    "Guild is a digital agency specializing in website design, artificial intelligence, and social media strategy for startups and small businesses.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="bg-guild-black text-white font-body antialiased">
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify nav and footer render**

Run dev server. Verify:
- Transparent nav at top with Guild logo, links, "Book a Call" button
- Nav becomes frosted glass when scrolling
- Footer at bottom with logo, copyright, social links
- Mobile: hamburger opens full-screen overlay

- [ ] **Step 6: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/components/layout/ src/app/layout.tsx
git commit -m "feat: add Navbar with scroll glass effect, MobileMenu, and Footer"
```

---

## Task 4: Global Effects — Cursor Trail, Scroll Progress, Smooth Scroll

**Files:**
- Create: `src/hooks/useCursorPosition.ts`
- Create: `src/hooks/useScrollProgress.ts`
- Create: `src/components/ui/CursorTrail.tsx`
- Create: `src/components/ui/ScrollProgress.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create useCursorPosition hook**

Create `src/hooks/useCursorPosition.ts`:

```tsx
"use client";

import { useState, useEffect } from "react";

export function useCursorPosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return position;
}
```

- [ ] **Step 2: Create useScrollProgress hook**

Create `src/hooks/useScrollProgress.ts`:

```tsx
"use client";

import { useState, useEffect } from "react";

export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return progress;
}
```

- [ ] **Step 3: Create CursorTrail component**

Create `src/components/ui/CursorTrail.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

export function CursorTrail() {
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.1;
      currentY += (targetY - currentY) * 0.1;

      if (trailRef.current) {
        trailRef.current.style.transform = `translate(${currentX - 150}px, ${currentY - 150}px)`;
      }

      animationId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Hide on touch devices
  return (
    <div
      ref={trailRef}
      className="fixed top-0 left-0 w-[300px] h-[300px] rounded-full pointer-events-none z-[9999] hidden md:block"
      style={{
        background:
          "radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)",
      }}
    />
  );
}
```

- [ ] **Step 4: Create ScrollProgress component**

Create `src/components/ui/ScrollProgress.tsx`:

```tsx
"use client";

import { useScrollProgress } from "@/hooks/useScrollProgress";

export function ScrollProgress() {
  const progress = useScrollProgress();

  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-[100]">
      <div
        className="h-full bg-guild-gold transition-[width] duration-100"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
```

- [ ] **Step 5: Add global effects to layout**

Update `src/app/layout.tsx` — add imports and render inside body:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CursorTrail } from "@/components/ui/CursorTrail";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Guild — Craft. Strategy. Mastery.",
  description:
    "Guild is a digital agency specializing in website design, artificial intelligence, and social media strategy for startups and small businesses.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="bg-guild-black text-white font-body antialiased">
        <CursorTrail />
        <ScrollProgress />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Verify effects**

Run dev server. Verify:
- Gold glow follows cursor (desktop only)
- Gold progress bar fills at top of page as you scroll
- Smooth scroll behavior on anchor links

- [ ] **Step 7: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/hooks/ src/components/ui/CursorTrail.tsx src/components/ui/ScrollProgress.tsx src/app/layout.tsx
git commit -m "feat: add cursor gold trail, scroll progress bar, and smooth scrolling"
```

---

## Task 5: Data Files

**Files:**
- Create: `src/data/services.ts`
- Create: `src/data/case-studies.ts`
- Create: `src/data/testimonials.ts`

- [ ] **Step 1: Create services data**

Create `src/data/services.ts`:

```tsx
export interface Service {
  id: string;
  title: string;
  icon: string;
  description: string;
  featured?: boolean;
}

export const services: Service[] = [
  {
    id: "website",
    title: "Website\nDesign",
    icon: "◇",
    description:
      "Bespoke websites that convert visitors into clients. From landing pages to full platforms — designed to perform and built to impress.",
  },
  {
    id: "ai",
    title: "Artificial\nIntelligence",
    icon: "⟡",
    description:
      "AI-powered automation, chatbots, and intelligent workflows. We integrate cutting-edge AI into your business to save time and scale smarter.",
    featured: true,
  },
  {
    id: "social",
    title: "Social Media\nStrategy",
    icon: "◈",
    description:
      "End-to-end social media consulting — from content strategy to execution. We grow your audience, build your brand, and drive real engagement.",
  },
];
```

- [ ] **Step 2: Create case studies data**

Create `src/data/case-studies.ts`:

```tsx
export interface CaseStudyStat {
  value: string;
  label: string;
}

export interface CaseStudy {
  slug: string;
  title: string;
  tags: string[];
  tint: string;
  icon: string;
  description: string;
  stats: CaseStudyStat[];
  challenge: string;
  approach: string;
  results: string;
  testimonial?: {
    quote: string;
    author: string;
    role: string;
  };
}

export const caseStudies: CaseStudy[] = [
  {
    slug: "novapay",
    title: "NovaPay Fintech",
    tags: ["Website", "AI Chatbot"],
    tint: "from-[#111] to-[#1a1a1a]",
    icon: "◈",
    description:
      "A complete digital overhaul for an emerging fintech startup — from a dated WordPress site to a high-converting platform with an AI-powered customer support chatbot.",
    stats: [
      { value: "340%", label: "Lead Increase" },
      { value: "2.1s", label: "Load Time" },
      { value: "87%", label: "Ticket Deflection" },
      { value: "6 wks", label: "Delivery Time" },
    ],
    challenge:
      "NovaPay had a slow, template-based WordPress site that wasn't converting. Their support team was drowning in repetitive tickets, and their brand felt generic in a crowded fintech space.",
    approach:
      "We rebuilt from scratch with Next.js for speed, designed a bold visual identity, and deployed an AI chatbot trained on their knowledge base to handle tier-1 support automatically.",
    results:
      "Leads tripled within 30 days of launch. The AI chatbot deflects 87% of support tickets, saving 20+ hours per week. Page load dropped from 8s to 2.1s.",
    testimonial: {
      quote:
        "Guild didn't just build us a website — they built us a brand. Our leads tripled in the first month. The AI chatbot alone saves us 20 hours a week.",
      author: "Jordan Mitchell",
      role: "CEO, NovaPay",
    },
  },
  {
    slug: "aura-beauty",
    title: "Aura Beauty Co",
    tags: ["Social Media", "Strategy"],
    tint: "from-[#0f0a1a] to-[#1a1020]",
    icon: "◇",
    description:
      "A social media transformation for a DTC beauty brand — from inconsistent posting to a cohesive content strategy that grew their Instagram from 2K to 45K followers.",
    stats: [
      { value: "45K", label: "Followers Gained" },
      { value: "12x", label: "Engagement Rate" },
      { value: "280%", label: "Revenue Growth" },
      { value: "3 mo", label: "Timeline" },
    ],
    challenge:
      "Aura Beauty had great products but zero social media presence. Their Instagram was a graveyard of inconsistent posts with no visual identity or content strategy.",
    approach:
      "We built a complete content playbook — visual guidelines, posting cadence, hashtag strategy, and influencer partnerships. Then we executed it relentlessly for 3 months.",
    results:
      "Instagram grew from 2K to 45K followers. Engagement rate increased 12x. Social-driven revenue grew 280%, making Instagram their #1 sales channel.",
    testimonial: {
      quote:
        "Their social media strategy transformed our Instagram from 2K to 45K followers in three months. Every post is on-brand, on-time, and on-point.",
      author: "Priya Sharma",
      role: "Founder, Aura Beauty",
    },
  },
  {
    slug: "greenloop",
    title: "GreenLoop SaaS",
    tags: ["Website", "AI Automation"],
    tint: "from-[#0a1a0f] to-[#101a15]",
    icon: "⬡",
    description:
      "A SaaS dashboard redesign paired with AI-powered data pipelines — making sustainability reporting beautiful and effortless.",
    stats: [
      { value: "60%", label: "Time Saved" },
      { value: "4.8★", label: "User Rating" },
      { value: "92%", label: "Retention" },
      { value: "8 wks", label: "Delivery Time" },
    ],
    challenge:
      "GreenLoop's sustainability dashboard was functional but ugly. Users complained it felt like a spreadsheet. Data entry was manual and error-prone.",
    approach:
      "We redesigned the entire UI with a clean, dark-mode dashboard aesthetic. Built AI pipelines to auto-ingest and categorize sustainability data from multiple sources.",
    results:
      "User satisfaction jumped to 4.8 stars. Manual data entry dropped 60%. Customer retention hit 92% — up from 74%.",
    testimonial: {
      quote:
        "We needed a SaaS dashboard that didn't look like every other SaaS dashboard. Guild delivered something our users actually enjoy using.",
      author: "Marcus Chen",
      role: "CTO, GreenLoop",
    },
  },
  {
    slug: "ember-streetwear",
    title: "Ember Streetwear",
    tags: ["Full Service"],
    tint: "from-[#1a0a0a] to-[#201010]",
    icon: "✦",
    description:
      "Full-service digital launch for an underground streetwear brand — website, AI-powered inventory, and a social media blitz that sold out their first drop in 4 hours.",
    stats: [
      { value: "4 hrs", label: "First Drop Sellout" },
      { value: "18K", label: "Email Signups" },
      { value: "2.4M", label: "Social Impressions" },
      { value: "10 wks", label: "Full Build" },
    ],
    challenge:
      "Ember was a brand with hype but no infrastructure. No website, no email list, no inventory system. They needed to go from zero to launch in 10 weeks.",
    approach:
      "We built a Shopify-integrated Next.js storefront, implemented AI demand forecasting for inventory, and ran a coordinated social media launch campaign across X, Instagram, and TikTok.",
    results:
      "First drop sold out in 4 hours. Built an 18K email list pre-launch. Social campaign generated 2.4M impressions in the first week.",
  },
];
```

- [ ] **Step 3: Create testimonials data**

Create `src/data/testimonials.ts`:

```tsx
export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  initials: string;
}

export const testimonials: Testimonial[] = [
  {
    quote:
      "Guild didn't just build us a website — they built us a brand. Our leads tripled in the first month. The AI chatbot alone saves us 20 hours a week.",
    author: "Jordan Mitchell",
    role: "CEO, NovaPay",
    initials: "JM",
  },
  {
    quote:
      "Their social media strategy transformed our Instagram from 2K to 45K followers in three months. Every post is on-brand, on-time, and on-point.",
    author: "Priya Sharma",
    role: "Founder, Aura Beauty",
    initials: "PS",
  },
  {
    quote:
      "We needed a SaaS dashboard that didn't look like every other SaaS dashboard. Guild delivered something our users actually enjoy using.",
    author: "Marcus Chen",
    role: "CTO, GreenLoop",
    initials: "MC",
  },
];
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/data/
git commit -m "feat: add services, case studies, and testimonials data files"
```

---

## Task 6: Hero Section — Content & Animations (No 3D Yet)

**Files:**
- Create: `src/components/hero/HeroContent.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create HeroContent with staggered animations**

Create `src/components/hero/HeroContent.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { GoldButton } from "@/components/ui/GoldButton";

export function HeroContent() {
  return (
    <div className="relative z-10 text-center px-5">
      <motion.p
        className="text-sm tracking-[10px] text-guild-gold/70 uppercase font-light mb-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0 }}
      >
        Craft. Strategy. Mastery.
      </motion.p>

      <motion.h1
        className="text-[72px] md:text-[72px] text-[40px] font-heading font-extrabold tracking-[16px] uppercase leading-none"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        GUILD
      </motion.h1>

      <motion.div
        className="w-[60px] h-px mx-auto my-6"
        style={{
          background:
            "linear-gradient(90deg, transparent, #d4af37, transparent)",
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      />

      <motion.p
        className="text-[15px] text-white/45 tracking-[3px] font-light max-w-[500px] mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        Websites · Artificial Intelligence · Social Media Strategy
      </motion.p>

      <motion.div
        className="mt-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.0 }}
      >
        <GoldButton href="/contact">Book a Consultation</GoldButton>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.5 }}
      >
        <p className="text-[10px] tracking-[4px] text-white/25 uppercase mb-2">
          Scroll
        </p>
        <div
          className="w-px h-[30px] mx-auto"
          style={{
            background:
              "linear-gradient(to bottom, rgba(212,175,55,0.4), transparent)",
          }}
        />
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Update home page with hero**

Replace `src/app/page.tsx` with:

```tsx
import { HeroContent } from "@/components/hero/HeroContent";

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center bg-guild-black overflow-hidden">
        <HeroContent />
      </section>

      {/* Placeholder sections for scrolling */}
      <section id="services" className="min-h-screen bg-guild-black-light" />
      <section id="about" className="min-h-screen bg-guild-black" />
      <section id="portfolio" className="min-h-screen bg-guild-black-light" />
    </main>
  );
}
```

- [ ] **Step 3: Verify hero renders**

Run dev server. Verify:
- Full-screen hero with staggered text animation
- "GUILD" title, tagline, services line, CTA button, scroll indicator
- All gold accents render correctly
- Scroll indicator at bottom

- [ ] **Step 4: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/components/hero/HeroContent.tsx src/app/page.tsx
git commit -m "feat: add hero section with staggered reveal animations"
```

---

## Task 7: Hero 3D Scene — Diamond, Particles, Cursor Lighting

**Files:**
- Create: `src/components/hero/Diamond.tsx`
- Create: `src/components/hero/Particles.tsx`
- Create: `src/components/hero/HeroScene.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create Diamond component**

Create `src/components/hero/Diamond.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";

export function Diamond() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
      meshRef.current.rotation.x = Math.sin(Date.now() * 0.0003) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} scale={1.8}>
      <octahedronGeometry args={[1, 0]} />
      <MeshTransmissionMaterial
        backside
        samples={8}
        thickness={0.5}
        chromaticAberration={0.2}
        anisotropy={0.3}
        distortion={0.2}
        distortionScale={0.3}
        temporalDistortion={0.1}
        color="#d4af37"
        attenuationColor="#d4af37"
        attenuationDistance={0.6}
        roughness={0.1}
        ior={2.4}
      />
    </mesh>
  );
}
```

- [ ] **Step 2: Create Particles component**

Create `src/components/hero/Particles.tsx`:

```tsx
"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 200;

export function Particles() {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, []);

  const sizes = useMemo(() => {
    const s = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      s[i] = Math.random() * 2 + 0.5;
    }
    return s;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posArray = pointsRef.current.geometry.attributes.position
      .array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArray[i * 3 + 1] += delta * 0.05;
      if (posArray[i * 3 + 1] > 7.5) {
        posArray[i * 3 + 1] = -7.5;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={PARTICLE_COUNT}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#d4af37"
        size={0.03}
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
```

- [ ] **Step 3: Create HeroScene wrapper**

Create `src/components/hero/HeroScene.tsx`:

```tsx
"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Diamond } from "./Diamond";
import { Particles } from "./Particles";
import * as THREE from "three";

function CursorLight() {
  const lightRef = useRef<THREE.PointLight>(null);
  const { viewport } = useThree();

  useFrame(({ pointer }) => {
    if (lightRef.current) {
      lightRef.current.position.set(
        (pointer.x * viewport.width) / 2,
        (pointer.y * viewport.height) / 2,
        3
      );
    }
  });

  return (
    <pointLight
      ref={lightRef}
      color="#d4af37"
      intensity={2}
      distance={10}
      decay={2}
    />
  );
}

export function HeroScene() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <PerformanceMonitor>
          <Suspense fallback={null}>
            <ambientLight intensity={0.2} />
            <directionalLight position={[5, 5, 5]} intensity={0.3} color="#d4af37" />
            <CursorLight />
            <Diamond />
            <Particles />
          </Suspense>
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 4: Add HeroScene to home page (lazy loaded)**

Update `src/app/page.tsx`:

```tsx
import dynamic from "next/dynamic";
import { HeroContent } from "@/components/hero/HeroContent";

const HeroScene = dynamic(
  () => import("@/components/hero/HeroScene").then((mod) => ({ default: mod.HeroScene })),
  { ssr: false }
);

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center bg-guild-black overflow-hidden">
        <HeroScene />
        <HeroContent />
      </section>

      {/* Placeholder sections for scrolling */}
      <section id="services" className="min-h-screen bg-guild-black-light" />
      <section id="about" className="min-h-screen bg-guild-black" />
      <section id="portfolio" className="min-h-screen bg-guild-black-light" />
    </main>
  );
}
```

- [ ] **Step 5: Verify 3D scene**

Run dev server. Verify:
- 3D diamond rotates slowly in center of hero
- Gold particles drift upward
- Moving mouse controls gold point light illuminating the diamond
- Text content overlays the 3D scene cleanly
- No console errors

- [ ] **Step 6: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/components/hero/ src/app/page.tsx
git commit -m "feat: add Three.js hero scene with diamond, particles, and cursor lighting"
```

---

## Task 8: Services Section

**Files:**
- Create: `src/components/sections/Services.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create Services component**

Create `src/components/sections/Services.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { services } from "@/data/services";

function ServiceCard({
  service,
  index,
}: {
  service: (typeof services)[0];
  index: number;
}) {
  return (
    <motion.div
      className={`relative bg-white/[0.02] border border-guild-gold/[0.12] p-10 text-center overflow-hidden group ${
        service.featured ? "-mt-3" : ""
      }`}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      whileHover={{
        boxShadow: "0 0 40px rgba(212,175,55,0.08)",
      }}
    >
      {/* Gold corner accents */}
      <div className="absolute top-0 left-0 w-5 h-px bg-guild-gold" />
      <div className="absolute top-0 left-0 w-px h-5 bg-guild-gold" />
      <div className="absolute bottom-0 right-0 w-5 h-px bg-guild-gold" />
      <div className="absolute bottom-0 right-0 w-px h-5 bg-guild-gold" />

      {/* Featured badge */}
      {service.featured && (
        <div className="absolute top-3 right-3 text-[9px] tracking-[2px] text-guild-black bg-guild-gold px-2.5 py-0.5 uppercase font-semibold">
          Featured
        </div>
      )}

      {/* Diamond icon */}
      <motion.div
        className="w-[60px] h-[60px] mx-auto mb-6 border border-guild-gold/30 rotate-45 flex items-center justify-center"
        initial={{ rotate: 0, opacity: 0 }}
        whileInView={{ rotate: 45, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: index * 0.15 + 0.3, type: "spring" }}
      >
        <span className="-rotate-45 text-[22px] text-guild-gold">
          {service.icon}
        </span>
      </motion.div>

      {/* Title */}
      <h3 className="text-base font-heading font-semibold tracking-[4px] text-white uppercase mb-4 whitespace-pre-line">
        {service.title}
      </h3>

      {/* Description */}
      <p className="text-[13px] text-white/45 leading-[1.7] tracking-wide">
        {service.description}
      </p>

      {/* Learn More */}
      <div className="mt-6">
        <a
          href="/#about"
          className="text-[11px] tracking-[3px] text-guild-gold uppercase border-b border-guild-gold/30 pb-0.5 hover:border-guild-gold transition-colors duration-300"
        >
          Learn More →
        </a>
      </div>
    </motion.div>
  );
}

export function Services() {
  return (
    <section
      id="services"
      className="relative py-24 bg-guild-black-light overflow-hidden"
    >
      {/* Subtle gold grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent, transparent 99px, rgba(212,175,55,0.03) 99px, rgba(212,175,55,0.03) 100px), repeating-linear-gradient(0deg, transparent, transparent 99px, rgba(212,175,55,0.03) 99px, rgba(212,175,55,0.03) 100px)",
        }}
      />

      <div className="relative z-10 max-w-[1000px] mx-auto px-6">
        <SectionHeader label="What We Do" title="Our Services" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {services.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add Services to home page**

Update `src/app/page.tsx` — replace the placeholder `#services` section:

```tsx
import dynamic from "next/dynamic";
import { HeroContent } from "@/components/hero/HeroContent";
import { Services } from "@/components/sections/Services";

const HeroScene = dynamic(
  () => import("@/components/hero/HeroScene").then((mod) => ({ default: mod.HeroScene })),
  { ssr: false }
);

export default function Home() {
  return (
    <main>
      <section className="relative h-screen flex items-center justify-center bg-guild-black overflow-hidden">
        <HeroScene />
        <HeroContent />
      </section>

      <Services />

      {/* Placeholder sections */}
      <section id="about" className="min-h-screen bg-guild-black" />
      <section id="portfolio" className="min-h-screen bg-guild-black-light" />
    </main>
  );
}
```

- [ ] **Step 3: Verify services section**

Run dev server. Verify:
- Three service cards with gold corner accents
- AI card elevated with "Featured" badge
- Diamond icons rotate in on scroll
- Cards slide up with stagger animation
- Gold glow on hover

- [ ] **Step 4: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/components/sections/Services.tsx src/app/page.tsx
git commit -m "feat: add services section with animated cards and gold corner accents"
```

---

## Task 9: About Section

**Files:**
- Create: `src/components/sections/About.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create About component**

Create `src/components/sections/About.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";

const differentiators = [
  {
    title: "No Templates",
    description:
      "Every project is built from scratch. Your brand deserves its own identity.",
  },
  {
    title: "AI-Native Thinking",
    description:
      "We don't bolt AI on. We design with intelligence from day one.",
  },
  {
    title: "Startup DNA",
    description:
      "We move fast, communicate clearly, and respect your budget. No corporate bloat.",
  },
];

export function About() {
  return (
    <section
      id="about"
      className="relative py-24 bg-guild-black-light overflow-hidden"
    >
      {/* Diagonal lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(135deg, transparent, transparent 49px, rgba(212,175,55,0.02) 49px, rgba(212,175,55,0.02) 50px)",
        }}
      />

      <div className="relative z-10 max-w-[900px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16">
        {/* Left — brand story */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-[11px] tracking-[8px] text-guild-gold uppercase mb-3">
            The Guild
          </p>
          <h2 className="text-[30px] font-heading font-bold tracking-[3px] text-white uppercase leading-[1.2] mb-5">
            Built Different.
            <br />
            By Design.
          </h2>
          <p className="text-sm text-white/40 leading-[1.9] mb-6">
            We&apos;re not an agency — we&apos;re a guild. A tight collective of
            strategists, designers, and engineers who obsess over craft. Every
            pixel, every prompt, every post is intentional.
          </p>
          <p className="text-sm text-white/40 leading-[1.9]">
            We work with startups and small businesses who refuse to look small.
            If you want cookie-cutter, we&apos;re not your team. If you want
            extraordinary — welcome to the Guild.
          </p>
        </motion.div>

        {/* Right — differentiators */}
        <div className="flex flex-col gap-5">
          {differentiators.map((item, i) => (
            <motion.div
              key={item.title}
              className="pl-6 py-5 pr-6 border-l-2 border-guild-gold bg-guild-gold/[0.03]"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
            >
              <h3 className="text-[13px] font-semibold tracking-[2px] text-white uppercase mb-1.5">
                {item.title}
              </h3>
              <p className="text-[13px] text-white/40 leading-[1.6]">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add About to home page**

Update `src/app/page.tsx` — import and add `<About />` after `<Services />`, remove the `#about` placeholder.

```tsx
import dynamic from "next/dynamic";
import { HeroContent } from "@/components/hero/HeroContent";
import { Services } from "@/components/sections/Services";
import { About } from "@/components/sections/About";

const HeroScene = dynamic(
  () => import("@/components/hero/HeroScene").then((mod) => ({ default: mod.HeroScene })),
  { ssr: false }
);

export default function Home() {
  return (
    <main>
      <section className="relative h-screen flex items-center justify-center bg-guild-black overflow-hidden">
        <HeroScene />
        <HeroContent />
      </section>

      <Services />
      <About />

      {/* Placeholder */}
      <section id="portfolio" className="min-h-screen bg-guild-black" />
    </main>
  );
}
```

- [ ] **Step 3: Verify about section**

Run dev server. Verify:
- Brand story fades in from left
- Differentiator blocks stagger in from right
- Gold left borders and tinted backgrounds render

- [ ] **Step 4: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/components/sections/About.tsx src/app/page.tsx
git commit -m "feat: add about section with brand story and differentiator blocks"
```

---

## Task 10: Portfolio Section

**Files:**
- Create: `src/components/sections/Portfolio.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create Portfolio component**

Create `src/components/sections/Portfolio.tsx`:

```tsx
"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { caseStudies } from "@/data/case-studies";

function PortfolioCard({
  study,
  index,
}: {
  study: (typeof caseStudies)[0];
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useTransform(mouseY, [0, 1], [5, -5]);
  const rotateY = useTransform(mouseX, [0, 1], [-5, 5]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ scale: 1.03 }}
      style={{ rotateX, rotateY, perspective: 800 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={`/case-studies/${study.slug}`}
        className="block relative h-60 overflow-hidden border border-guild-gold/[0.08] cursor-pointer group"
      >
        {/* Background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${study.tint}`}
        />

        {/* Preview placeholder */}
        <div className="absolute top-5 left-5 right-5 bottom-16 bg-white/[0.03] border border-white/[0.06] rounded flex items-center justify-center">
          <div className="text-center">
            <span className="text-[28px] text-guild-gold/30">{study.icon}</span>
            <p className="text-[10px] text-white/20 tracking-[2px] mt-2">
              SITE PREVIEW
            </p>
          </div>
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-5 py-4 bg-gradient-to-t from-guild-black/95 to-transparent">
          <h3 className="text-sm font-semibold tracking-[2px] text-white uppercase">
            {study.title}
          </h3>
          <p className="text-[11px] text-guild-gold tracking-[2px] mt-1">
            {study.tags.join(" · ").toUpperCase()}
          </p>
        </div>

        {/* Top gold border */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-guild-gold to-transparent opacity-40 group-hover:opacity-80 transition-opacity duration-500" />
      </Link>
    </motion.div>
  );
}

export function Portfolio() {
  return (
    <section id="portfolio" className="py-24 bg-guild-black">
      <div className="max-w-[900px] mx-auto px-6">
        <SectionHeader label="Selected Work" title="The Portfolio" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {caseStudies.map((study, i) => (
            <PortfolioCard key={study.slug} study={study} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add Portfolio to home page**

Update `src/app/page.tsx` — import `Portfolio`, add after `<About />`, remove placeholder.

```tsx
import dynamic from "next/dynamic";
import { HeroContent } from "@/components/hero/HeroContent";
import { Services } from "@/components/sections/Services";
import { About } from "@/components/sections/About";
import { Portfolio } from "@/components/sections/Portfolio";

const HeroScene = dynamic(
  () => import("@/components/hero/HeroScene").then((mod) => ({ default: mod.HeroScene })),
  { ssr: false }
);

export default function Home() {
  return (
    <main>
      <section className="relative h-screen flex items-center justify-center bg-guild-black overflow-hidden">
        <HeroScene />
        <HeroContent />
      </section>

      <Services />
      <About />
      <Portfolio />
    </main>
  );
}
```

- [ ] **Step 3: Verify portfolio section**

Run dev server. Verify:
- 2x2 grid of case study cards
- Cards have parallax tilt on mouse move
- Cards scale up on hover
- Gold border brightens on hover
- Clicking a card navigates to `/case-studies/[slug]`

- [ ] **Step 4: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/components/sections/Portfolio.tsx src/app/page.tsx
git commit -m "feat: add portfolio section with parallax tilt cards"
```

---

## Task 11: Testimonials Section

**Files:**
- Create: `src/components/sections/Testimonials.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create Testimonials component**

Create `src/components/sections/Testimonials.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { testimonials } from "@/data/testimonials";

export function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % testimonials.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(next, 6000);
    return () => clearInterval(interval);
  }, [paused, next]);

  const testimonial = testimonials[current];

  return (
    <section
      className="py-24 bg-guild-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-[900px] mx-auto px-6">
        <SectionHeader label="Voices" title="Client Testimonials" />

        <div className="max-w-[700px] mx-auto text-center min-h-[280px] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {/* Quote mark */}
              <p className="text-5xl text-guild-gold/20 leading-none mb-4">
                &ldquo;
              </p>

              {/* Quote */}
              <p className="text-lg text-white/60 leading-[1.8] italic font-light">
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              {/* Avatar & attribution */}
              <div className="mt-7">
                <div className="w-12 h-12 rounded-full border border-guild-gold/30 mx-auto mb-3 flex items-center justify-center bg-guild-gold/5">
                  <span className="text-base text-guild-gold">
                    {testimonial.initials}
                  </span>
                </div>
                <p className="text-[13px] font-semibold tracking-[2px] text-white uppercase">
                  {testimonial.author}
                </p>
                <p className="text-[11px] text-guild-gold/60 tracking-[2px] mt-1">
                  {testimonial.role}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="flex gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-6 h-0.5 transition-colors duration-300 ${
                  i === current ? "bg-guild-gold" : "bg-white/15"
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add Testimonials to home page**

Update `src/app/page.tsx` — import `Testimonials`, add after `<Portfolio />`.

```tsx
import dynamic from "next/dynamic";
import { HeroContent } from "@/components/hero/HeroContent";
import { Services } from "@/components/sections/Services";
import { About } from "@/components/sections/About";
import { Portfolio } from "@/components/sections/Portfolio";
import { Testimonials } from "@/components/sections/Testimonials";

const HeroScene = dynamic(
  () => import("@/components/hero/HeroScene").then((mod) => ({ default: mod.HeroScene })),
  { ssr: false }
);

export default function Home() {
  return (
    <main>
      <section className="relative h-screen flex items-center justify-center bg-guild-black overflow-hidden">
        <HeroScene />
        <HeroContent />
      </section>

      <Services />
      <About />
      <Portfolio />
      <Testimonials />
    </main>
  );
}
```

- [ ] **Step 3: Verify testimonials**

Run dev server. Verify:
- Testimonial carousel auto-rotates every 6 seconds
- Pauses on hover
- Clicking dots switches testimonials
- Smooth crossfade animation between slides

- [ ] **Step 4: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/components/sections/Testimonials.tsx src/app/page.tsx
git commit -m "feat: add testimonials carousel with auto-rotate and hover pause"
```

---

## Task 12: CTA Section

**Files:**
- Create: `src/components/sections/CallToAction.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create CallToAction component**

Create `src/components/sections/CallToAction.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { GoldButton } from "@/components/ui/GoldButton";

export function CallToAction() {
  return (
    <section className="relative py-24 overflow-hidden" style={{
      background: "linear-gradient(180deg, #080808 0%, #0a0805 100%)",
    }}>
      {/* Gold radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none" style={{
        background: "radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)",
      }} />

      <motion.div
        className="relative z-10 text-center px-6"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
      >
        <p className="text-[11px] tracking-[8px] text-guild-gold uppercase mb-4">
          Ready?
        </p>
        <h2 className="text-[40px] md:text-[40px] text-3xl font-heading font-bold tracking-[4px] text-white uppercase leading-[1.2] mb-4">
          Let&apos;s Build Something
          <br />
          Extraordinary
        </h2>
        <p className="text-[15px] text-white/40 max-w-[500px] mx-auto mb-9 leading-[1.7]">
          Book a free consultation. No pitch decks, no fluff — just a real
          conversation about what you need and how we can help.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <GoldButton variant="solid" href="/contact">
            Book a Call
          </GoldButton>
          <GoldButton variant="outline" href="/contact">
            Send a Message
          </GoldButton>
        </div>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 2: Add CTA to home page**

Update `src/app/page.tsx` — import `CallToAction`, add after `<Testimonials />`:

```tsx
import dynamic from "next/dynamic";
import { HeroContent } from "@/components/hero/HeroContent";
import { Services } from "@/components/sections/Services";
import { About } from "@/components/sections/About";
import { Portfolio } from "@/components/sections/Portfolio";
import { Testimonials } from "@/components/sections/Testimonials";
import { CallToAction } from "@/components/sections/CallToAction";

const HeroScene = dynamic(
  () => import("@/components/hero/HeroScene").then((mod) => ({ default: mod.HeroScene })),
  { ssr: false }
);

export default function Home() {
  return (
    <main>
      <section className="relative h-screen flex items-center justify-center bg-guild-black overflow-hidden">
        <HeroScene />
        <HeroContent />
      </section>

      <Services />
      <About />
      <Portfolio />
      <Testimonials />
      <CallToAction />
    </main>
  );
}
```

- [ ] **Step 3: Verify CTA section**

Run dev server. Verify:
- Gold radial glow visible behind text
- "Let's Build Something Extraordinary" headline
- Two buttons: solid + outline
- Section fades up on scroll

- [ ] **Step 4: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/components/sections/CallToAction.tsx src/app/page.tsx
git commit -m "feat: add final CTA section with gold glow and dual buttons"
```

---

## Task 13: Case Study Page

**Files:**
- Create: `src/components/case-study/StatCounter.tsx`
- Create: `src/components/case-study/CaseStudyHeader.tsx`
- Create: `src/components/case-study/CaseStudyContent.tsx`
- Create: `src/app/case-studies/[slug]/page.tsx`

- [ ] **Step 1: Create StatCounter component**

Create `src/components/case-study/StatCounter.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface StatCounterProps {
  value: string;
  label: string;
}

export function StatCounter({ value, label }: StatCounterProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [displayed, setDisplayed] = useState(value);

  // Extract numeric part for animation
  useEffect(() => {
    if (!isInView) return;

    const numericMatch = value.match(/^([\d.]+)/);
    if (!numericMatch) {
      setDisplayed(value);
      return;
    }

    const target = parseFloat(numericMatch[1]);
    const suffix = value.replace(numericMatch[1], "");
    const duration = 1500;
    const start = Date.now();
    const isDecimal = numericMatch[1].includes(".");

    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = target * eased;

      setDisplayed(
        `${isDecimal ? current.toFixed(1) : Math.floor(current)}${suffix}`
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      className="bg-white/[0.02] border border-guild-gold/10 p-5 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-[32px] font-bold text-guild-gold">{displayed}</p>
      <p className="text-[10px] tracking-[2px] text-white/40 uppercase mt-1.5">
        {label}
      </p>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create CaseStudyHeader component**

Create `src/components/case-study/CaseStudyHeader.tsx`:

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { StatCounter } from "./StatCounter";
import type { CaseStudy } from "@/data/case-studies";

interface CaseStudyHeaderProps {
  study: CaseStudy;
}

export function CaseStudyHeader({ study }: CaseStudyHeaderProps) {
  return (
    <div className="max-w-[900px] mx-auto px-6 pt-32 pb-12">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Link
          href="/#portfolio"
          className="text-[11px] tracking-[3px] text-guild-gold/60 uppercase hover:text-guild-gold transition-colors"
        >
          ← Back to Portfolio
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
        {/* Left — description */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <p className="text-[11px] tracking-[6px] text-guild-gold uppercase mb-3">
            Case Study
          </p>
          <h1 className="text-[32px] font-heading font-bold tracking-[3px] text-white uppercase mb-4">
            {study.title}
          </h1>
          <p className="text-sm text-white/45 leading-[1.8]">
            {study.description}
          </p>
          <div className="flex gap-3 mt-5">
            {study.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 border border-guild-gold/20 text-[10px] tracking-[2px] text-guild-gold uppercase"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Right — stats */}
        <div className="grid grid-cols-2 gap-4">
          {study.stats.map((stat) => (
            <StatCounter
              key={stat.label}
              value={stat.value}
              label={stat.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create CaseStudyContent component**

Create `src/components/case-study/CaseStudyContent.tsx`:

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { CaseStudy } from "@/data/case-studies";

interface CaseStudyContentProps {
  study: CaseStudy;
  nextStudy?: CaseStudy;
}

const sections = [
  { key: "challenge" as const, label: "The Challenge" },
  { key: "approach" as const, label: "The Approach" },
  { key: "results" as const, label: "The Results" },
];

export function CaseStudyContent({ study, nextStudy }: CaseStudyContentProps) {
  return (
    <div className="max-w-[900px] mx-auto px-6 pb-24">
      <div className="border-t border-guild-gold/[0.08] pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sections.map((section, i) => (
            <motion.div
              key={section.key}
              className="p-5 bg-white/[0.015] border border-white/[0.04] rounded"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <p className="text-[11px] tracking-[3px] text-guild-gold uppercase mb-2">
                {section.label}
              </p>
              <p className="text-[13px] text-white/40 leading-[1.7]">
                {study[section.key]}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Testimonial if available */}
      {study.testimonial && (
        <motion.div
          className="mt-12 text-center max-w-[600px] mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-3xl text-guild-gold/20 mb-3">&ldquo;</p>
          <p className="text-base text-white/50 italic leading-[1.8] font-light">
            &ldquo;{study.testimonial.quote}&rdquo;
          </p>
          <p className="text-[13px] text-white font-semibold tracking-[2px] uppercase mt-4">
            {study.testimonial.author}
          </p>
          <p className="text-[11px] text-guild-gold/60 tracking-[2px] mt-1">
            {study.testimonial.role}
          </p>
        </motion.div>
      )}

      {/* Next project CTA */}
      {nextStudy && (
        <motion.div
          className="mt-16 pt-8 border-t border-guild-gold/[0.08] text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-[11px] tracking-[4px] text-white/30 uppercase mb-3">
            Next Project
          </p>
          <Link
            href={`/case-studies/${nextStudy.slug}`}
            className="text-xl font-heading font-bold tracking-[3px] text-white uppercase hover:text-guild-gold transition-colors duration-300"
          >
            {nextStudy.title} →
          </Link>
        </motion.div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create case study page**

Create `src/app/case-studies/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { caseStudies } from "@/data/case-studies";
import { CaseStudyHeader } from "@/components/case-study/CaseStudyHeader";
import { CaseStudyContent } from "@/components/case-study/CaseStudyContent";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return caseStudies.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const study = caseStudies.find((s) => s.slug === slug);
  if (!study) return { title: "Not Found" };

  return {
    title: `${study.title} — Guild Case Study`,
    description: study.description,
  };
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const study = caseStudies.find((s) => s.slug === slug);

  if (!study) {
    notFound();
  }

  const studyIndex = caseStudies.findIndex((s) => s.slug === slug);
  const nextStudy = caseStudies[(studyIndex + 1) % caseStudies.length];

  return (
    <main className="bg-guild-black min-h-screen">
      <CaseStudyHeader study={study} />
      <CaseStudyContent study={study} nextStudy={nextStudy} />
    </main>
  );
}
```

- [ ] **Step 5: Verify case study pages**

Run dev server. Navigate to `/case-studies/novapay`. Verify:
- Back link to portfolio
- Title, description, tags
- Stats count up from 0
- Challenge/Approach/Results columns
- Testimonial quote if present
- Try other slugs: `/case-studies/aura-beauty`, `/case-studies/greenloop`, `/case-studies/ember-streetwear`

- [ ] **Step 6: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/components/case-study/ src/app/case-studies/
git commit -m "feat: add case study pages with animated stat counters and content sections"
```

---

## Task 14: Contact Page

**Files:**
- Create: `src/components/contact/ContactForm.tsx`
- Create: `src/components/contact/ContactInfo.tsx`
- Create: `src/app/contact/page.tsx`
- Create: `src/app/api/contact/route.ts`

- [ ] **Step 1: Create ContactForm component**

Create `src/components/contact/ContactForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GoldButton } from "@/components/ui/GoldButton";

const serviceOptions = ["Website", "AI", "Social"];

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    services: [] as string[],
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  const toggleService = (service: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus("sent");
        setFormData({ name: "", email: "", services: [], message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const inputStyles =
    "w-full bg-white/[0.03] border border-guild-gold/[0.12] px-[18px] py-3.5 text-[13px] text-white/70 tracking-wide outline-none focus:border-guild-gold/40 transition-colors duration-300 placeholder:text-white/25";

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <input
        type="text"
        placeholder="Your Name"
        required
        value={formData.name}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, name: e.target.value }))
        }
        className={inputStyles}
      />

      <input
        type="email"
        placeholder="Email Address"
        required
        value={formData.email}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, email: e.target.value }))
        }
        className={inputStyles}
      />

      {/* Service toggles */}
      <div className="flex gap-3">
        {serviceOptions.map((service) => (
          <button
            key={service}
            type="button"
            onClick={() => toggleService(service)}
            className={`flex-1 py-2.5 px-3.5 border text-[11px] tracking-[2px] uppercase text-center transition-all duration-300 ${
              formData.services.includes(service)
                ? "border-guild-gold bg-guild-gold/10 text-guild-gold"
                : "border-guild-gold/[0.12] bg-white/[0.03] text-guild-gold/50"
            }`}
          >
            {service}
          </button>
        ))}
      </div>

      <textarea
        placeholder="Tell us about your project..."
        required
        value={formData.message}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, message: e.target.value }))
        }
        className={`${inputStyles} min-h-[120px] resize-y`}
      />

      <GoldButton variant="solid" onClick={() => {}}>
        {status === "sending"
          ? "Sending..."
          : status === "sent"
          ? "Message Sent ✓"
          : "Send Message"}
      </GoldButton>

      {status === "error" && (
        <p className="text-red-400 text-[13px]">
          Something went wrong. Please try again or email us directly.
        </p>
      )}
    </motion.form>
  );
}
```

- [ ] **Step 2: Create ContactInfo component**

Create `src/components/contact/ContactInfo.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";

const socialLinks = [
  { label: "X", href: "#" },
  { label: "IG", href: "#" },
  { label: "LI", href: "#" },
];

export function ContactInfo() {
  return (
    <motion.div
      className="pt-16"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="mb-8">
        <p className="text-[11px] tracking-[4px] text-guild-gold uppercase mb-2">
          Email
        </p>
        <p className="text-sm text-white/50">hello@guilddigital.com</p>
      </div>

      <div className="mb-8">
        <p className="text-[11px] tracking-[4px] text-guild-gold uppercase mb-2">
          Response Time
        </p>
        <p className="text-sm text-white/50">Within 24 hours</p>
      </div>

      <div>
        <p className="text-[11px] tracking-[4px] text-guild-gold uppercase mb-2">
          Social
        </p>
        <div className="flex gap-4 mt-2">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="w-9 h-9 border border-guild-gold/20 flex items-center justify-center text-xs text-guild-gold hover:bg-guild-gold/10 transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 3: Create contact page**

Create `src/app/contact/page.tsx`:

```tsx
import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { ContactInfo } from "@/components/contact/ContactInfo";

export const metadata: Metadata = {
  title: "Contact — Guild",
  description:
    "Book a free consultation with Guild. Website design, AI integration, and social media strategy for startups.",
};

export default function ContactPage() {
  return (
    <main className="bg-guild-black min-h-screen">
      <div className="max-w-[900px] mx-auto px-6 pt-32 pb-24 grid grid-cols-1 md:grid-cols-2 gap-16">
        {/* Left — form */}
        <div>
          <p className="text-[11px] tracking-[8px] text-guild-gold uppercase mb-3">
            Get In Touch
          </p>
          <h1 className="text-[28px] font-heading font-bold tracking-[3px] text-white uppercase mb-8">
            Start a Project
          </h1>
          <ContactForm />
        </div>

        {/* Right — info */}
        <ContactInfo />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Create API route for contact form**

Create `src/app/api/contact/route.ts`:

```tsx
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, services, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Log for now — replace with Resend integration when API key is available
    console.log("Contact form submission:", {
      name,
      email,
      services,
      message,
      timestamp: new Date().toISOString(),
    });

    // TODO: Uncomment when Resend API key is configured
    // import { Resend } from 'resend';
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'Guild <noreply@guilddigital.com>',
    //   to: ['hello@guilddigital.com'],
    //   subject: `New inquiry from ${name}`,
    //   text: `Name: ${name}\nEmail: ${email}\nServices: ${services.join(', ')}\n\n${message}`,
    // });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Verify contact page**

Run dev server. Navigate to `/contact`. Verify:
- Form renders with all fields
- Service pills toggle on click (gold fill when selected)
- Form submits without errors (check console for logged data)
- Contact info renders on the right
- Social icons have hover effect

- [ ] **Step 6: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/components/contact/ src/app/contact/ src/app/api/
git commit -m "feat: add contact page with form, service toggles, and API route"
```

---

## Task 15: Page Transitions & Smooth Scroll (Lenis)

**Files:**
- Create: `src/components/ui/PageTransition.tsx`
- Create: `src/components/ui/SmoothScroll.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create PageTransition component**

Create `src/components/ui/PageTransition.tsx`:

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Create SmoothScroll component**

Create `src/components/ui/SmoothScroll.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";

export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return null;
}
```

- [ ] **Step 3: Add to layout**

Update `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CursorTrail } from "@/components/ui/CursorTrail";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import { PageTransition } from "@/components/ui/PageTransition";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Guild — Craft. Strategy. Mastery.",
  description:
    "Guild is a digital agency specializing in website design, artificial intelligence, and social media strategy for startups and small businesses.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="bg-guild-black text-white font-body antialiased">
        <SmoothScroll />
        <CursorTrail />
        <ScrollProgress />
        <Navbar />
        <PageTransition>{children}</PageTransition>
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify smooth scroll and page transitions**

Run dev server. Verify:
- Scrolling is smooth and buttery with Lenis
- Clicking nav links fades between pages
- Anchor links (Services, Portfolio, About) smooth-scroll on home page

- [ ] **Step 5: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/components/ui/PageTransition.tsx src/components/ui/SmoothScroll.tsx src/app/layout.tsx
git commit -m "feat: add Lenis smooth scrolling and Framer Motion page transitions"
```

---

## Task 16: Final Polish — Responsive Fixes & Meta

**Files:**
- Modify: `src/app/layout.tsx` (Open Graph meta)
- Modify: `src/components/hero/HeroContent.tsx` (responsive text)
- Modify: `src/components/layout/Footer.tsx` (mobile stack)

- [ ] **Step 1: Add Open Graph metadata**

Update the `metadata` export in `src/app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  title: "Guild — Craft. Strategy. Mastery.",
  description:
    "Guild is a digital agency specializing in website design, artificial intelligence, and social media strategy for startups and small businesses.",
  openGraph: {
    title: "Guild — Craft. Strategy. Mastery.",
    description:
      "Website design, AI integration, and social media strategy for startups who refuse to look small.",
    url: "https://guilddigital.com",
    siteName: "Guild",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guild — Craft. Strategy. Mastery.",
    description:
      "Website design, AI integration, and social media strategy for startups who refuse to look small.",
  },
};
```

- [ ] **Step 2: Fix hero responsive text sizing**

In `src/components/hero/HeroContent.tsx`, update the h1 className:

```tsx
<motion.h1
  className="text-[40px] md:text-[72px] font-heading font-extrabold tracking-[8px] md:tracking-[16px] uppercase leading-none"
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, delay: 0.3 }}
>
  GUILD
</motion.h1>
```

- [ ] **Step 3: Fix footer mobile layout**

In `src/components/layout/Footer.tsx`, update the flex container:

```tsx
<div className="max-w-[900px] mx-auto px-6 md:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
```

- [ ] **Step 4: Test responsive breakpoints**

Run dev server. Test at:
- Desktop (1280px+): full layout
- Tablet (768px): grids collapse, nav stays horizontal
- Mobile (375px): hamburger menu, single columns, scaled hero text

- [ ] **Step 5: Commit**

```bash
cd C:/Users/roota/guild-website
git add src/app/layout.tsx src/components/hero/HeroContent.tsx src/components/layout/Footer.tsx
git commit -m "feat: add Open Graph meta, fix responsive breakpoints"
```

- [ ] **Step 6: Final build check**

```bash
cd C:/Users/roota/guild-website && npm run build
```

Expected: Build succeeds with no errors. Pages are statically generated.
