# PORTICO — concept, design, implementation notes

Status: **integrated specimen layer** on PR #5; concept is established, implementation is intentionally bounded.

## 1. What Portico is

Portico is the orientation and encounter grammar for LITHOMEMPHIS.

The architectural metaphor is a portico: a threshold between outside and inside that creates orientation before entry. In product terms, it means **shared discovery rather than top-down instruction**.

Portico is not a separate social network, database, brand skin, or backend. LITHOMEMPHIS supplies the tactile print-born material language; Portico supplies the rules for how a person moves through it, encounters other traces, understands relationships, makes a choice, and leaves useful context behind.

### Core principles

- **Orientation over instruction.**
- **Discovery over premature revelation.**
- **Footprints and fragments over monuments.**
- **Plural memory over a single authoritative narrative.**
- **Stewardship without ownership.**
- **Coherent divergence:** different paths can remain interoperable.
- **The environment teaches:** structure, adjacency, state and material cues explain the system through use.

## 2. Atomic unit: a meaningful encounter

A Portico encounter is:

1. **Context** — where am I; what is real; what is specimen?
2. **Invitation** — what direction is available?
3. **Exploration** — what can I inspect without committing?
4. **Recognition** — what relationships, provenance or patterns become visible?
5. **Choice** — what meaningful gate can I cross next?
6. **Reflection** — what did this path reveal?
7. **Departure** — what trace, artifact, question or handoff moves forward?

The sequence is a grammar, not a mandatory wizard. A route can enter or leave at different points.

## 3. Design translation

Portico keeps the existing LITHOMEMPHIS palette, typography and material vocabulary. It changes **composition and behavior**, not the identity.

Design rules:

- structure before decoration;
- spatial navigation rather than menu-only navigation;
- thresholds are visually legible;
- components have a purpose in the encounter;
- motion reveals relationship, state or passage rather than decorating idle surfaces;
- tactile material cues retain provenance through the existing token system;
- no fake liveness, fake rankings or implied collaboration.

Existing material family:

- fibrous paper / lithographic grain = foundational surface;
- brass inlay / clips = boundary and attachment cue;
- stained-glass / chromatic light = depth or state cue;
- chromatic aberration = interaction accent only, not a permanent surface treatment.

Use one foundational material, one depth/lighting treatment and one accent; avoid stacking every effect.

## 4. Current implementation

PR #5 adds a bounded `/portico` specimen route.

It implements:

- Portico definition and threshold framing;
- the seven encounter moments;
- traveling gates into the real existing routes: Gallery, Community, Archive and Lab;
- explicit torch-passing / handoff language;
- operating principles;
- responsive navigation entry through the shared route registry.

It deliberately does **not** implement:

- accounts or identity;
- live collaboration;
- persisted handoffs;
- activity feeds;
- voting;
- messaging;
- realtime presence;
- backend state.

Those remain platform work and must not be inferred from the Portico page.

## 5. Architecture relationship

A useful conceptual stack is:

    Constitution
      ↓
    Ontology
      ↓
    Grammar
      ↓
    Values
      ↓
    Narrative
      ↓
    Interaction
      ↓
    Architecture
      ↓
    Components

For this repository:

- LITHOMEMPHIS tokens and primitives occupy much of the **material/component** layer.
- Gallery, Archive, Community and Lab provide **encounter destinations**.
- Portico supplies **orientation, interaction grammar and relationship framing**.
- Future provenance or collaborative services may provide persistence, but they should not be required for the static specimen to remain coherent.

## 6. Product-system implications

Portico should eventually make the following concepts explicit and reusable:

- **Threshold** — a state change between contexts.
- **Gate** — a traversable choice with a clear destination.
- **Trace** — evidence left by an artifact, decision or participant.
- **Torch** — a bounded handoff carrying context forward.
- **Stewardship** — responsibility for a shared space without ownership claims.
- **Adjacency** — meaning produced by what is placed near what.
- **Return path** — a reversible way out of a branch.
- **Encounter receipt** — optional future evidence of what was seen, chosen and carried forward.

These should become typed concepts only when a real implementation needs them. Do not invent a backend schema merely to make the metaphor look complete.

## 7. Acceptance for this slice

This Portico slice passes when:

- `/portico` renders and is reachable from shared desktop and mobile navigation;
- every gate points to an existing route;
- the page is usable without accounts or backend state;
- language clearly distinguishes concept from implemented capability;
- existing tokens and primitives are reused instead of adding a second design system;
- reduced functionality does not masquerade as live collaboration;
- `npm run build` passes on the exact PR head;
- responsive visual review is performed at phone and desktop widths.

## 8. Next bounded slices

1. Visual acceptance of `/portico` against the intended tactile/editorial direction.
2. Add a small reusable `ThresholdLink` or gate primitive only after the route proves the pattern is repeated.
3. Define a motion grammar for crossing/returning that respects reduced motion.
4. Connect provenance/trace language to real artifact metadata before adding any persistent handoff.
5. If platform work is later approved, design collaboration from explicit privacy, moderation and ownership rules rather than adding generic social features.

## 9. Notes and provenance

Portico predates this PR and was previously discussed as a collaborative system centered on shared spaces, thresholds, traveling gates, torch-passing, guidance, collective experience and shared values.

Earlier implementation work did **not** actually land this concept in `MelodicBloom/lithomemphis` PR #5. This document records the recovered concept and the bounded implementation now attached to the PR.

Where this document describes future persistence, collaboration, provenance services or typed encounter records, those are **proposed** rather than implemented.
