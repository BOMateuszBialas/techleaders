# Run: Button wrap for suggested questions (320 px overflow)

Branch `fix/ds-button-wrap` from `origin/main` (29c7cd1). Bug fix, no spec.

## Reproduction (before the fix)

Storybook story `patterns-copilot-question-form--idle` in a 320 px viewport, Playwright (Chromium):

| Density | Theme | Page scrollWidth | First button right edge |
|---|---|---|---|
| store (default) | dark | 361 px | 360.6 px |
| store | light | 361 px | 360.6 px |
| admin (`data-density="admin"`, as in the admin layout) | dark | 320 px | 315.1 px (content edge 304 px) |

The reported 361 px matches the store density. In the admin density the label
runs about 11 px past the 16 px gutter but does not add page scroll at 320 px.

## Fix

- `packages/app/src/components/ui/button.tsx`: `whitespace-nowrap` moves from the
  shared base into the non-wrapping sizes (`default`, `sm`, `lg`, icon sizes), so
  their computed style is unchanged. New size `sm-wrap` (`min-h-control-sm`,
  `max-w-full`, `py-0.5`, `text-start`, no `whitespace-nowrap`).
- `packages/app/src/components/admin/copilot/copilot-panel-view.tsx`: suggested
  questions use `size="sm-wrap"`.
- Why a size and not a className override: `cn` does not merge the project token
  classes, so a local `whitespace-normal` or `h-auto` would race the CSS order.

## Checks

- Story `patterns-copilot-question-form--long-questions-narrow-320` and
  `primitives-button--wrap-long-label-narrow` assert the frame does not scroll and
  the button stays inside it. Before the fix: frame scrollWidth 636 vs 318.
- Computed-style snapshot of every story (179 stories, 242 elements) before and
  after, store 320 light and admin 320 dark: only the Copilot question buttons changed.
  Five non-Button stories showed colour noise in the short capture; a longer
  capture shows no difference.
- Admin density at 1440 px: the Copilot buttons keep 28 px height and nowrap is
  now `normal` only on `sm-wrap`.
