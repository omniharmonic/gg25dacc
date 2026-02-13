# d/acc Interactive Map - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an interactive web demo where users click on a d/acc sector map to place themselves, submit a profile, and see others' submissions as clickable avatar pins.

**Architecture:** Next.js 14 App Router with a single page. SVG map rendered as a background image with absolutely-positioned pin overlays. Supabase for Postgres storage, file uploads (avatars bucket), and Realtime subscriptions for live pin updates.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (JS client v2), Vercel

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, etc. (via CLI)
- Create: `.gitignore`
- Create: `.env.local` (gitignored)

**Step 1: Create Next.js app**

Run from the project root (`gg25xdacc/`):
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Note: The `.` tells it to scaffold in the current directory. If prompted about existing files, proceed.

**Step 2: Install Supabase client**

```bash
npm install @supabase/supabase-js
```

**Step 3: Create `.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

User will fill in actual values after creating Supabase project.

**Step 4: Copy SVG map to public directory**

```bash
cp .claude/Back.svg public/map.svg
```

**Step 5: Verify dev server starts**

```bash
npm run dev
```

Expected: Dev server at http://localhost:3000, default Next.js page renders.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Supabase dependency"
```

---

### Task 2: Supabase Project Setup

**Files:**
- Create: `lib/supabase.ts`
- Create: `lib/types.ts`
- Create: `lib/sectors.ts`

**Step 1: Create Supabase project (manual)**

User must:
1. Go to https://supabase.com/dashboard
2. Create new project (name: `dacc-map` or similar)
3. Copy the project URL and anon key into `.env.local`

**Step 2: Create `pins` table via Supabase SQL Editor**

Run this SQL in Supabase Dashboard > SQL Editor:

```sql
CREATE TABLE pins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  telegram TEXT,
  email TEXT NOT NULL,
  image_url TEXT,
  ens TEXT,
  dacc_statement TEXT,
  sector TEXT NOT NULL,
  quadrant TEXT NOT NULL,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read pins
CREATE POLICY "Anyone can read pins" ON pins FOR SELECT USING (true);

-- Allow anyone to insert pins (public demo)
CREATE POLICY "Anyone can insert pins" ON pins FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pins;
```

**Step 3: Create `avatars` storage bucket**

In Supabase Dashboard > Storage:
1. Create new bucket named `avatars`
2. Set it as **Public**
3. Add policy: allow all uploads (for demo simplicity)

Or via SQL:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Anyone can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
```

**Step 4: Create `lib/supabase.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Step 5: Create `lib/types.ts`**

```typescript
export interface Pin {
  id: string;
  name: string;
  organization: string;
  telegram: string | null;
  email: string;
  image_url: string | null;
  ens: string | null;
  dacc_statement: string | null;
  sector: string;
  quadrant: string;
  x: number;
  y: number;
  created_at: string;
}

export interface PinFormData {
  name: string;
  organization: string;
  telegram: string;
  email: string;
  image: File | null;
  ens: string;
  dacc_statement: string;
  sector: string;
}
```

**Step 6: Create `lib/sectors.ts`**

```typescript
export interface Sector {
  name: string;
  quadrant: string;
}

export const SECTORS: Sector[] = [
  { name: "Resilient Manufacturing", quadrant: "Physical Defense" },
  { name: "Open Source Hardware & Silicon", quadrant: "Physical Defense" },
  { name: "Biodefense & Health Systems", quadrant: "Physical Defense" },
  { name: "Property Rights & Registries", quadrant: "Physical Coordination" },
  { name: "Decentralized Energy", quadrant: "Physical Coordination" },
  { name: "Civic Tech", quadrant: "Physical Coordination" },
  { name: "Carbon & Environmental Markets", quadrant: "Physical Coordination" },
  { name: "Privacy-Preserving Computation", quadrant: "Digital Defense" },
  { name: "Zero-Knowledge Systems", quadrant: "Digital Defense" },
  { name: "Decentralized Identity & Attestation", quadrant: "Digital Defense" },
  { name: "Formal Verification & Security", quadrant: "Digital Defense" },
  { name: "Secrets-as-a-Service", quadrant: "Digital Defense" },
  { name: "Communication & Messaging", quadrant: "Digital Defense" },
  { name: "Governance Tooling", quadrant: "Digital Coordination" },
  { name: "Decentralized Monetary Infrastructure", quadrant: "Digital Coordination" },
  { name: "Epistemic Infrastructure", quadrant: "Digital Coordination" },
  { name: "Democratic Funding Mechanisms", quadrant: "Digital Coordination" },
  { name: "Oracle Networks", quadrant: "Digital Coordination" },
  { name: "Cross-Chain Infrastructure", quadrant: "Digital Coordination" },
  { name: "Data Availability & Storage", quadrant: "Digital Coordination" },
  { name: "Streaming & Treasury", quadrant: "Digital Coordination" },
];

export const QUADRANTS = [
  "Physical Defense",
  "Physical Coordination",
  "Digital Defense",
  "Digital Coordination",
] as const;
```

**Step 7: Commit**

```bash
git add lib/
git commit -m "feat: add Supabase client, types, and sector data"
```

---

### Task 3: Build MapCanvas Component

**Files:**
- Create: `components/MapCanvas.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Step 1: Create `components/MapCanvas.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Pin } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import PinMarker from "./PinMarker";
import PinForm from "./PinForm";
import PinDetail from "./PinDetail";

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);

  // Fetch existing pins
  useEffect(() => {
    const fetchPins = async () => {
      const { data } = await supabase
        .from("pins")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setPins(data);
    };
    fetchPins();
  }, []);

  // Subscribe to realtime inserts
  useEffect(() => {
    const channel = supabase
      .channel("pins-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pins" },
        (payload) => {
          setPins((prev) => [...prev, payload.new as Pin]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (selectedPin) {
        setSelectedPin(null);
        return;
      }
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setClickPos({ x, y });
      setShowForm(true);
    },
    [selectedPin]
  );

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setClickPos(null);
  }, []);

  const handlePinClick = useCallback((pin: Pin) => {
    setSelectedPin(pin);
  }, []);

  return (
    <div className="relative w-full h-screen bg-gray-900 flex items-center justify-center overflow-hidden">
      <div
        ref={containerRef}
        className="relative cursor-crosshair"
        style={{
          width: "100%",
          maxWidth: "100vw",
          aspectRatio: "3508 / 2480",
          maxHeight: "100vh",
          backgroundImage: "url(/map.svg)",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
        onClick={handleMapClick}
      >
        {/* Click indicator */}
        {clickPos && (
          <div
            className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-blue-500 bg-blue-500/30 animate-pulse pointer-events-none z-20"
            style={{
              left: `${clickPos.x * 100}%`,
              top: `${clickPos.y * 100}%`,
            }}
          />
        )}

        {/* Pin markers */}
        {pins.map((pin) => (
          <PinMarker key={pin.id} pin={pin} onClick={handlePinClick} />
        ))}
      </div>

      {/* Form modal */}
      {showForm && clickPos && (
        <PinForm
          position={clickPos}
          onClose={handleFormClose}
        />
      )}

      {/* Detail popup */}
      {selectedPin && (
        <PinDetail pin={selectedPin} onClose={() => setSelectedPin(null)} />
      )}
    </div>
  );
}
```

**Step 2: Update `app/page.tsx`**

```tsx
import MapCanvas from "@/components/MapCanvas";

export default function Home() {
  return <MapCanvas />;
}
```

**Step 3: Update `app/globals.css`**

Keep Tailwind directives, add minimal custom styles:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  overflow: hidden;
}
```

**Step 4: Commit**

```bash
git add components/MapCanvas.tsx app/page.tsx app/globals.css
git commit -m "feat: add MapCanvas with click handling, pin overlay, and realtime"
```

---

### Task 4: Build PinMarker Component

**Files:**
- Create: `components/PinMarker.tsx`

**Step 1: Create `components/PinMarker.tsx`**

```tsx
"use client";

import { Pin } from "@/lib/types";

interface PinMarkerProps {
  pin: Pin;
  onClick: (pin: Pin) => void;
}

export default function PinMarker({ pin, onClick }: PinMarkerProps) {
  return (
    <button
      className="absolute -ml-5 -mt-5 w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden hover:scale-125 transition-transform z-10 hover:z-30 animate-in fade-in duration-500 cursor-pointer"
      style={{
        left: `${pin.x * 100}%`,
        top: `${pin.y * 100}%`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(pin);
      }}
      title={`${pin.name} - ${pin.organization}`}
    >
      {pin.image_url ? (
        <img
          src={pin.image_url}
          alt={pin.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
          {pin.name.charAt(0).toUpperCase()}
        </div>
      )}
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add components/PinMarker.tsx
git commit -m "feat: add PinMarker avatar component"
```

---

### Task 5: Build PinForm Component

**Files:**
- Create: `components/PinForm.tsx`

**Step 1: Create `components/PinForm.tsx`**

This is the modal form that opens when users click the map. It handles image upload to Supabase Storage and inserts the pin row.

```tsx
"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { SECTORS } from "@/lib/sectors";
import { PinFormData } from "@/lib/types";

interface PinFormProps {
  position: { x: number; y: number };
  onClose: () => void;
}

async function resizeImage(file: File, maxSize = 200): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    img.onload = () => {
      canvas.width = maxSize;
      canvas.height = maxSize;

      // Center crop
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxSize, maxSize);
      canvas.toBlob((blob) => resolve(blob!), "image/webp", 0.8);
    };

    img.src = URL.createObjectURL(file);
  });
}

export default function PinForm({ position, onClose }: PinFormProps) {
  const [formData, setFormData] = useState<PinFormData>({
    name: "",
    organization: "",
    telegram: "",
    email: "",
    image: null,
    ens: "",
    dacc_statement: "",
    sector: SECTORS[0].name,
  });
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let imageUrl: string | null = null;

      // Upload image if provided
      if (formData.image) {
        const resized = await resizeImage(formData.image);
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, resized, { contentType: "image/webp" });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      // Find quadrant for selected sector
      const sector = SECTORS.find((s) => s.name === formData.sector);

      // Insert pin
      const { error } = await supabase.from("pins").insert({
        name: formData.name,
        organization: formData.organization,
        telegram: formData.telegram || null,
        email: formData.email,
        image_url: imageUrl,
        ens: formData.ens || null,
        dacc_statement: formData.dacc_statement || null,
        sector: formData.sector,
        quadrant: sector?.quadrant || "Digital Coordination",
        x: position.x,
        y: position.y,
      });

      if (error) throw error;
      onClose();
    } catch (err) {
      console.error("Submit error:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 text-sm";
  const labelClass = "block text-xs font-medium text-white/70 mb-1";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Place Yourself on the Map
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/50 hover:text-white text-xl cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="space-y-3">
          {/* Image upload */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center overflow-hidden hover:border-blue-400 transition-colors flex-shrink-0 cursor-pointer"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white/40 text-2xl">+</span>
              )}
            </button>
            <div className="text-xs text-white/50">
              Click to upload your photo
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div>
            <label className={labelClass}>Name *</label>
            <input
              required
              className={inputClass}
              placeholder="Your name"
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
            />
          </div>

          {/* Organization */}
          <div>
            <label className={labelClass}>Organization / Project *</label>
            <input
              required
              className={inputClass}
              placeholder="Your organization or project"
              value={formData.organization}
              onChange={(e) =>
                setFormData((p) => ({ ...p, organization: e.target.value }))
              }
            />
          </div>

          {/* Sector */}
          <div>
            <label className={labelClass}>d/acc Sector *</label>
            <select
              required
              className={inputClass}
              value={formData.sector}
              onChange={(e) =>
                setFormData((p) => ({ ...p, sector: e.target.value }))
              }
            >
              {SECTORS.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.quadrant})
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>Email *</label>
            <input
              required
              type="email"
              className={inputClass}
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData((p) => ({ ...p, email: e.target.value }))
              }
            />
          </div>

          {/* Telegram */}
          <div>
            <label className={labelClass}>Telegram Username</label>
            <input
              className={inputClass}
              placeholder="@username"
              value={formData.telegram}
              onChange={(e) =>
                setFormData((p) => ({ ...p, telegram: e.target.value }))
              }
            />
          </div>

          {/* ENS */}
          <div>
            <label className={labelClass}>ENS</label>
            <input
              className={inputClass}
              placeholder="name.eth"
              value={formData.ens}
              onChange={(e) =>
                setFormData((p) => ({ ...p, ens: e.target.value }))
              }
            />
          </div>

          {/* d/acc statement */}
          <div>
            <label className={labelClass}>
              How do you see yourself as part of d/acc?
            </label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder="Describe your role in d/acc..."
              value={formData.dacc_statement}
              onChange={(e) =>
                setFormData((p) => ({ ...p, dacc_statement: e.target.value }))
              }
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors cursor-pointer"
        >
          {submitting ? "Placing..." : "Place on Map"}
        </button>
      </form>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/PinForm.tsx
git commit -m "feat: add PinForm with image upload and sector selection"
```

---

### Task 6: Build PinDetail Component

**Files:**
- Create: `components/PinDetail.tsx`

**Step 1: Create `components/PinDetail.tsx`**

```tsx
"use client";

import { Pin } from "@/lib/types";

interface PinDetailProps {
  pin: Pin;
  onClose: () => void;
}

export default function PinDetail({ pin, onClose }: PinDetailProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{pin.name}</h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white text-xl cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          {pin.image_url ? (
            <img
              src={pin.image_url}
              alt={pin.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
              {pin.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-white font-medium">{pin.organization}</div>
            <div className="text-sm text-blue-400">{pin.sector}</div>
            <div className="text-xs text-white/40">{pin.quadrant}</div>
          </div>
        </div>

        {pin.dacc_statement && (
          <div className="mb-4">
            <div className="text-xs text-white/50 mb-1">d/acc Statement</div>
            <p className="text-sm text-white/80">{pin.dacc_statement}</p>
          </div>
        )}

        <div className="space-y-2 text-sm">
          {pin.telegram && (
            <div className="flex items-center gap-2">
              <span className="text-white/50">Telegram:</span>
              <a
                href={`https://t.me/${pin.telegram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                {pin.telegram}
              </a>
            </div>
          )}
          {pin.ens && (
            <div className="flex items-center gap-2">
              <span className="text-white/50">ENS:</span>
              <span className="text-white/80">{pin.ens}</span>
            </div>
          )}
          {pin.email && (
            <div className="flex items-center gap-2">
              <span className="text-white/50">Email:</span>
              <a
                href={`mailto:${pin.email}`}
                className="text-blue-400 hover:underline"
              >
                {pin.email}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/PinDetail.tsx
git commit -m "feat: add PinDetail modal for viewing pin info"
```

---

### Task 7: Update Layout and Page

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Update `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "d/acc Map - Place Yourself",
  description: "Interactive map of d/acc sectors. Click to place yourself on the map.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900">{children}</body>
    </html>
  );
}
```

**Step 2: Verify the app compiles and renders the map**

```bash
npm run dev
```

Expected: Map renders as background, clicking anywhere opens the form.

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: update layout with metadata and dark theme"
```

---

### Task 8: Supabase Configuration and End-to-End Test

**Step 1: User fills in `.env.local` with actual Supabase credentials**

**Step 2: Run SQL from Task 2 in Supabase Dashboard**

**Step 3: Create avatars bucket in Supabase Dashboard**

**Step 4: Test end-to-end flow**

1. Open http://localhost:3000
2. Click on map
3. Fill out form with test data and image
4. Submit
5. Verify: pin appears on map
6. Click pin
7. Verify: detail popup shows all info
8. Open a second browser tab - verify pin appears there too (realtime)

**Step 5: Commit any adjustments**

```bash
git add -A
git commit -m "feat: complete end-to-end integration"
```

---

### Task 9: Deploy to Vercel

**Step 1: Push to GitHub**

```bash
git remote add origin <GITHUB_REPO_URL>
git push -u origin main
```

User must create a GitHub repo first.

**Step 2: Connect to Vercel**

1. Go to https://vercel.com/new
2. Import the GitHub repo
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

**Step 3: Verify production deployment**

Visit the Vercel URL, test the full flow.

**Step 4: Commit any production fixes**

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `lib/supabase.ts` | Create | Supabase client |
| `lib/types.ts` | Create | TypeScript types |
| `lib/sectors.ts` | Create | Sector/quadrant data |
| `components/MapCanvas.tsx` | Create | Main map with pins overlay |
| `components/PinMarker.tsx` | Create | Individual pin avatar |
| `components/PinForm.tsx` | Create | Submission form modal |
| `components/PinDetail.tsx` | Create | Pin detail popup |
| `app/page.tsx` | Modify | Render MapCanvas |
| `app/layout.tsx` | Modify | Metadata + dark theme |
| `app/globals.css` | Modify | Minimal styles |
| `public/map.svg` | Copy | d/acc sector map |
| `.env.local` | Create | Supabase credentials |
