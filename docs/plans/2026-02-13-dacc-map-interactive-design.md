# d/acc Map Interactive Demo - Design Document

## Overview

An interactive web demo where users can place themselves on a d/acc sector map. Users click a location on the map, fill out a profile form, and their avatar appears on the map. Other users can click avatars to see details.

## Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, TypeScript
- **Backend:** Supabase (Postgres + Storage + Realtime)
- **Deployment:** Vercel via GitHub
- **Map:** SVG background image (3508x2480, ~9MB)

## Data Model

### Supabase `pins` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | auto-generated |
| name | text | required |
| organization | text | required |
| telegram | text | optional |
| email | text | required |
| image_url | text | Supabase Storage URL |
| ens | text | optional |
| dacc_statement | text | "How I see myself in d/acc" |
| sector | text | Sector name from CSV |
| quadrant | text | One of 4 quadrants |
| x | float | Normalized 0-1 position on map |
| y | float | Normalized 0-1 position on map |
| created_at | timestamptz | auto |

### Supabase Storage

- Bucket: `avatars` (public)
- Images resized client-side to 200x200 before upload

## Sectors (from CSV)

4 Quadrants:
- **Physical Defense:** Resilient Manufacturing, Open Source Hardware & Silicon, Biodefense & Health Systems
- **Physical Coordination:** Property Rights & Registries, Decentralized Energy, Civic Tech, Carbon & Environmental Markets
- **Digital Defense:** Privacy-Preserving Computation, Zero-Knowledge Systems, Decentralized Identity & Attestation, Formal Verification & Security, Secrets-as-a-Service, Communication & Messaging
- **Digital Coordination:** Governance Tooling, Decentralized Monetary Infrastructure, Epistemic Infrastructure, Democratic Funding Mechanisms, Oracle Networks, Cross-Chain Infrastructure, Data Availability & Storage, Streaming & Treasury

## User Flow

1. User lands on page, sees d/acc map with existing pins
2. User clicks on map location
3. Modal opens with form: name, org/project, telegram, email, image upload, ENS, d/acc statement, sector dropdown
4. Clicked position shown as visual indicator on map
5. Submit: image -> Supabase Storage, data -> `pins` table
6. Pin appears immediately (Supabase Realtime)
7. Click any pin -> detail popup with all submitted info

## Component Architecture

```
app/
├── page.tsx              # Main page
├── layout.tsx            # Root layout
├── globals.css           # Tailwind + custom styles
├── components/
│   ├── MapCanvas.tsx      # SVG bg + pin overlay + click handler
│   ├── PinMarker.tsx      # Avatar circle on map
│   ├── PinForm.tsx        # Modal form
│   ├── PinDetail.tsx      # Detail popup
│   └── SectorSelect.tsx   # Sector dropdown
├── lib/
│   ├── supabase.ts        # Supabase client
│   ├── sectors.ts         # Sector data
│   └── types.ts           # Types
└── public/
    └── map.svg            # d/acc sector map
```

## Key Details

- **Map rendering:** SVG as CSS background-image. Pins are absolutely positioned divs. Coordinates normalized 0-1.
- **Image handling:** Client-side canvas resize to 200x200 before Supabase Storage upload.
- **Realtime:** Supabase Realtime INSERT subscription. New pins animate in.
- **Responsive:** Container preserves 3508:2480 aspect ratio. Pins reposition on resize.
- **No auth:** Public demo, anyone can submit, instant display.
