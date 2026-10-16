# Run: admin catalog follow-ups (#41, #43)

- Date: 2026-10-16
- Brief: One small PR for the follow-ups filed in the reviews of #40 and #42: clear the `?notice=` message after later actions and decide the zero-price rule (#41); show a visible message for a tampered hidden `expectedQuantity` and add an e2e test for the stale stock path (#43).
- Source doc: `.ai/specs/implemented/2026-10-15-admin-catalog-management.md` (implementation notes updated)
- Issues: #41, #43
- Branch: `fix/admin-followups-41-43` (worktree `wt-a2`)
- Engine: om-auto-create-pr (steps: 6, --loop: no)

## Goal

After create → save only the save message shows; a published product always costs more than 0.00 PLN (drafts may be 0); a broken hidden stock field gives a visible "reload" message; the stale stock path is covered end to end.

## Scope

- `core`: the published-price rule (create with status published, update of a published product, publish of a draft) with field-level / form-level messages.
- `app`: a small client component that drops `notice` from the address bar once shown (product and category pages); `stock.action.ts` maps an `expectedQuantity` field error to a form message; e2e for create → save, zero price and the stale stock path.
- Docs: admin catalog spec implementation notes (zero-price decision), README limitation line, lessons.

## Non-goals

- A DB check constraint for the price rule (would need a migration; the owner is the only writer, see Risks).
- Any change to the storefront or the stock use case.

## Decision (#41, zero prices)

Conservative default: a **published** product must cost more than 0.00 PLN; a **draft** may be saved at 0.00 PLN (work in progress). Enforced in core on every path that can produce a published zero-price product: create with "Published", saving a published product at 0, and publishing a draft priced at 0.

## Risks

- The update and publish checks read the product, then write it (no conditional write). A concurrent publish and price change by the single owner in two tabs could still produce a published 0.00 product; acceptable for the one-owner MVP, a DB check would close it later.
- `window.history.replaceState` must stay in sync with the Next router so a later `refresh()` renders the bare URL (Next 16 docs, "Native History API"); the e2e test proves it.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Zero-price rule (#41.2)

- [ ] 1.1 Core rule and messages for create, update and publish
- [ ] 1.2 Admin e2e for the zero-price paths

### Phase 2: Notice cleared after later actions (#41.1)

- [ ] 2.1 Drop `notice` from the URL once shown, on product and category pages, with e2e

### Phase 3: Stock panel follow-ups (#43)

- [ ] 3.1 Visible message for a broken `expectedQuantity`
- [ ] 3.2 E2E for the stale stock path

### Phase 4: Docs and gate

- [ ] 4.1 Spec notes, README, lessons, full validation gate
