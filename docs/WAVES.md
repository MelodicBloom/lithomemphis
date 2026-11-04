# LITHOMEMPHIS — Waves 2 & 3 scope

> Preservative synthesis. Nothing here is decided unless marked **decided**. Everything for Wave 3 is **proposed**.
> As of **2026-11-04 (America/New_York)**. Sources: `README.md`, PRs #1–#4 on `MelodicBloom/lithomemphis`, the live specimen at https://lithomemphis.vercel.app, and agent session context (labelled).

**Evidence labels:** `measured` (build output, a file or route on `main`) · `self-reported` (owner or agent statement, not independently checked) · `agent-inferred` · `proposed` · `unverified` · `blocked`.
**Gaps** are marked **⚠ GAP**.

---

## 0. Intent, audience, goals

| | |
|---|---|
| **Intent** | A *specimen runtime*: a runnable, static demo of a print-born, neobrutalist creative-collective interface. `measured`: README title "Specimen Runtime". |
| **Audience** | (1) Jennipher, as portfolio evidence of design-engineering craft. (2) Reviewers and hiring readers who open the live link. `self-reported` / `agent-inferred` from the task context. ⚠ GAP: no written audience brief exists in the repo. |
| **Goals** | Bounded, runnable evidence over breadth. Faithful art direction. Auditable tokens (tokens:audit). No fake liveness: metrics read "—" and no auth. `measured` in README and the UI copy. |
| **Non-goals (so far)** | Real accounts, real commerce, live social data. `measured`: README "NOT built yet", Shop page copy. |

---

## 1. Current state (2026-11-04)

The runtime is a static SPA: Vite, React, TypeScript, Tailwind v4 and react-router, deployed on Vercel with a catch-all rewrite. There is no backend, no auth and no live metrics. `measured`

| Slice | Routes / artifacts | Merge | SHA | Evidence |
|---|---|---|---|---|
| W1 specimen | `/`, `/gallery` over `src/data/artifacts.json`; responsive layout, mobile drawer, filter sheet | pre-PR | `0b80820` | `measured` |
| Visual proof | `docs/visual-proof/` hero loop, poster, OG card, live badge | #1 | `3314f01` | `measured` |
| Lab + libs | `/lab` (20 live effect picks), `/lab/icons`, component/icon libs, Storybook at `/storybook`, token drift audit (`npm run tokens:audit` inside `build`) | #2 | `2a3f9f6` | `measured` |
| Gallery depth | Filters `?tab&tag&medium&year&q&view=list`; `/gallery/:id` detail page plus a specimen 404; `artifacts.json` gains `tags[]`, `description`, `series` | #3 | `6a62f16` | `measured` (build pass; visual proof run by the parent agent, `self-reported`) |
| Nav routes | `/archive`, `/community`, `/shop`, `/about`; shared `src/lib/nav.ts` used by `SiteHeader`, the Home `Sidebar` and `MobileNav`; `SpecimenPage` shell | #4 | `294c330` | `measured` |

**Done vs planned (original README W2 list):**

| Original W2 bullet | Status |
|---|---|
| Archive / Community / Shop / About routes | ✅ done (#4), as specimen content |
| Artifact detail pages; functional filters | ✅ done (#3) |
| Mobile nav drawer from the mobile comp | ◐ partial: the drawer exists (`0b80820`, #4 links). Comp fidelity is `unverified` |
| Dark "Tool Lab" / "Challenge Arena" templates | ◐ partial: Lab exists (#2). Challenge Arena not started |
| Tokens / drift audit | ✅ done (#2); not in the original list, added during W2 |
| Accounts/auth, profiles, XP/badges | ✗ not started |
| Challenges, voting, timers, leaderboard | ✗ not started |
| Live activity feed, comments | ✗ not started |
| Real 3D marble, photographic collage | ✗ not started (README lists it under W2; this doc proposes moving it to W3B) |

---

## 2. Wave 2: remaining (proposed slices, in dependency order)

Not everything here has to ship. Items 2.1–2.6 are cheap and keep the specimen honest. Items 2.7–2.9 are **platform** work, and their fate depends on the Wave 3 choice in §3.

### 2.1 Detail page header: full `SiteHeader` or the simplified back link (open decision)
- **Intent:** make `/gallery/:id` consistent with the other pages.
- **Options:** (a) full `SiteHeader` plus a back chip. Optimizes for consistency and wayfinding; costs some focus on the artifact. (b) Keep the back-link header. Optimizes for an object-viewer focus; costs nav parity.
- **Evidence:** `measured`: the detail page uses its own header (#3). Flagged in the #3 and #4 reports.
- **Acceptance:** one decision recorded here, and desktop nav visible or deliberately absent on the detail page.
- **Depends on:** nothing.

### 2.2 Explicit `archived` field
- **Intent:** `/archive` currently picks items by a heuristic (kind Archive/Editorial, year < 2024, or series Ephemera). `measured` in `src/pages/Archive.tsx`.
- **Chosen against:** keeping the heuristic. It needs zero data changes but is brittle and surprises curators.
- **Acceptance:** `archived: boolean` on every item in `artifacts.json`, and Archive filters on it only.
- **Depends on:** nothing. Pairs with 2.3.

### 2.3 Medium sidebar cleanup
- **Intent:** medium values mix true media with descriptors ("Series · 12 artifacts", "Field Notes No. 23", "Object study"). `measured` in `artifacts.json`.
- **Options:** split into `medium` plus `format`/`series`. That optimizes for clean filtering but breaks the display strings, which the detail page must then rebuild.
- **Acceptance:** the sidebar lists only true media; existing `?medium=` links either still resolve or are documented as changed.

### 2.4 Shared `studios.json`
- **Intent:** studio names are hard-coded in both Home and Community. `measured`
- **Acceptance:** one data file feeds both pages; every studio is still labelled fictional.

### 2.5 Shop "Inquire" (outward-facing, needs owner sign-off)
- **Options:** (a) stay disabled (current; specimen-pure). (b) A `mailto:` link. Real reach, but it exposes a contact address and implies a real business. (c) A form. Needs a backend, so it belongs to platform work.
- **Evidence:** `measured`: disabled buttons (#4). **Gate:** Jennipher has to approve any real contact channel. `blocked` until then.

### 2.6 Soft 404 for unknown gallery ids
- **Tension:** the SPA rewrite returns HTTP 200 for `/gallery/nope`; only the UI says 404. `measured` in `vercel.json`.
- **Options:** (a) accept it as a known SPA limitation (zero cost). (b) Prerender the known ids and serve a real 404 (a build step or Vercel config; optimizes for SEO and correctness, adds complexity).
- **Acceptance:** either documented as accepted, or `curl -I` returns 404 for unknown ids.

### 2.7 Accounts/auth, profiles, XP/badges (platform)
- **Intent:** let real users exist. **Chosen against so far:** any auth, because it breaks the "no accounts" specimen promise. README and About copy both say so. `measured`
- **Optimizes for:** a believable product demo. **Against:** specimen purity, cost, privacy surface, and deploy complexity (needs a provider such as Auth0, Supabase or Clerk; ⚠ GAP: none chosen).
- **Acceptance (if pursued):** behind a feature flag; the specimen still runs with auth off.
- **Depends on:** a backend decision (§3).

### 2.8 Challenges: submission, voting, timers, leaderboard (platform)
- **Depends on:** 2.7. **Interim option:** a *static* Challenge Arena template (dark), fictional and with no voting. It satisfies the README template bullet without a backend.
- **Acceptance (static variant):** `/challenges` exists as a specimen, with timers shown as "—" or fixed fictional dates.

### 2.9 Live activity feed and comments (platform)
- **Depends on:** 2.7. **Tension:** "The Collective is listening" copy against the no-fake-liveness rule. A sample feed is fine only if it's labelled "sample · not live", as Community does today.

### 2.10 Mobile polish
- **Remaining:** the MobileNav "W2" stubs (Challenges, Collectives, Activity, Messages) still show. Comp fidelity is `unverified`.
- **Acceptance:** stubs renamed or removed to match whatever survives 2.8 and 2.9.

---

## 3. Wave 3: proposed (never previously defined)

Two framings are kept side by side. **Neither is decided.**

### 3A. Platform wave
Real accounts, challenges, feeds and notifications, which require a backend.
- **Optimizes for:** a demo of the collective as a product, and realistic interaction states.
- **Against:** specimen purity, deploy and ops complexity, privacy and moderation, and the risk of *fake social scale* (empty platforms read worse than honest specimens).
- **Prereqs:** a backend and auth choice (⚠ GAP), a data model, moderation policy, and an environment and secrets setup.

### 3B. Craft / material wave
An R3F (React Three Fiber) marble object, a photographic collage pipeline, print/PDF/poster export, a deeper motion grammar, and a token bridge from tokens:audit to Figma and RELAY.
- **Optimizes for:** design-engineering portfolio evidence, and bounded work that stays runnable.
- **Against:** demonstrating social and product mechanics; heavier client bundles (3D); collage rights and sourcing (⚠ GAP: image sources undefined).
- **Prereqs:** performance budget, a fallback when WebGL is missing, and an asset-licensing stance.

### Decision matrix

| Criterion | 3A Platform | 3B Craft |
|---|---|---|
| Fit with "specimen runtime" identity | Low–medium | High |
| Portfolio signal (design-engineering) | Medium | High |
| Product/PM signal | High | Low–medium |
| Infra / ops stakes | High (backend, auth, data) | Low (static) |
| Reversibility | Low (users, data) | High |
| Main risk | Empty-platform feel; security | Bundle weight; asset rights |
| Contingency | Ship as feature-flagged experiments on the static base | Progressive enhancement: SVG/CSS fallbacks stay |

### Recommended default: **proposed, not decided**
Take **3B Craft/material** as Wave 3. Keep the W2 platform items (2.7–2.9) as **optional, gated experiments** behind flags, or as static templates.
- **Rationale (hypothesis):** the product is currently a specimen, and Jennipher's portfolio need is *bounded, runnable evidence*. `self-reported` / `agent-inferred` from the session context; not stated in the repo.
- **What would flip this:** a real collective or community wanting to use it, or a role that targets product/platform work.

### Pathways
1. **Default:** W2 cleanup (2.1–2.6) → static Challenge Arena (2.8 static) → W3B.
2. **Platform pivot:** W2 cleanup → pick a backend and auth → 2.7 → 2.8 → 2.9 as W3A.
3. **Hybrid:** W3B core plus one flagged 3A experiment (for example, an auth-gated "save favourite").

---

## 4. Design language (preserve across waves)
- **Palette** (`measured`, `src/index.css`, tokens audit): ink `#0E0E0E`, paper `#F7F6F2`, cornflower `#3B6FF0`, sunflower `#EABF41`, cherry `#D54545`, lime `#9BBF49`, mauve `#9B5478`, wine `#58294B`, brass `#B08D57`.
- **Type:** Fraunces (display, substituting for Canela), Instrument Serif (editorial, substituting for Noe), Space Mono (UI and data), Inter (body). `measured`, README.
- **Tactility:** paper cards with hard offset shadows, brass corner clips, registration marks, print frames, halftone, grain, and generated SVG botanicals and marble. All original SVG/CSS; no comp or stock assets. `measured`
- **Motion:** spring pressables, magnetic hover and shader backdrops from the Lab (#2). ⚠ GAP: there is no written motion grammar yet. That is a W3B candidate.
- **Honesty rules:** metrics read "—"; fictional content is labelled; no fake live counters. `measured` in the UI copy.

---

## 5. Open tensions (kept, not resolved)
1. Specimen purity against a believable product (3A against 3B).
2. Detail page focus against nav parity (2.1).
3. Medium as a display string against medium as a filter key (2.3).
4. Shop as pure specimen against a real inquiry channel (2.5; owner sign-off).
5. SPA simplicity against correct HTTP 404s (2.6).
6. Where "real 3D marble / collage" belongs: README W2, or proposed W3B.

---

## 6. Change log
- **2026-11-04:** #1 visual proof (`3314f01`), #2 Lab, Storybook and tokens (`2a3f9f6`), #3 gallery filters and `/gallery/:id` (`6a62f16`), and #4 Archive, Community, Shop, About plus shared nav (`294c330`) merged to `main`. This scope document was drafted on branch `docs/w2-w3-scope`.
