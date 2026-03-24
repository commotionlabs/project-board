# relay. Board — Implementation Tickets

## PB-101 — Rebrand header to `relay.`
- **Status:** ✅ Done
- **Scope:** Update dashboard top branding text and page metadata title/description.
- **Acceptance:** Header shows `relay.` on mobile and desktop; browser title updated.

## PB-102 — Configurable list columns (+assignee)
- **Status:** ✅ Done
- **Scope:** Add column selector for list view with toggles for Status/Priority/Assignee/Project/Due Date.
- **Acceptance:** User can show/hide columns; Assignee column available and rendered.

## PB-103 — Task detail sidebar (notes/files/timeline foundation)
- **Status:** 🟨 In progress (MVP implemented)
- **Scope:** Click task to open right sidebar with:
  - task metadata
  - notes section (add + view)
  - files section (upload + list)
  - timeline section
- **Acceptance (MVP):** Sidebar opens from list view, notes persist to task data, file metadata persists, timeline visible.
- **Known gaps:**
  - Drag/drop uploads not added yet
  - File preview/download UX not finalized
  - Kanban card click-to-open behavior not wired yet

## PB-104 — File handling hardening
- **Status:** ⏳ Planned
- **Scope:** Add file size/type guardrails, better storage strategy, download/preview actions.

## PB-105 — Activity timeline richness
- **Status:** ⏳ Planned
- **Scope:** Capture status changes, assignee changes, and edits as timeline events (not just notes/files/update timestamps).
