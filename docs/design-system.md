# CommerceOS design system: short guide for agents

The full manual is the Storybook at `packages/app` (`npm run storybook`), group **Design system**. This file is the short version. Where the two differ, the Storybook pages win and this file gets fixed.

## Character

Words: bold, concrete. Never: hard to read, overloaded. The store is light inside a dark brand frame, with one red color for buying. The admin is dense and neutral: graphite main button, color only for status, links and errors.

## Build a screen

1. Name the screen's job and copy the structure of the same screen type in the epic pages (`Design system/Epics`).
2. Choose components by what they do (table below), not by how they look.
3. Use semantic tokens only (`bg-action`, `gap-related`, `rounded-card`, `type-h2`, `h-control-md`). No palette classes, no arbitrary values, no `dark:` in components.
4. Design the data states: loading (`SkeletonGroup` with a label), empty (why and the next step), error (what happened and what to do), long text at 320 px, demo data labelled `[DEMO]` / `DEMO-` (buyer demo orders too, with the demo Alert on their confirmation and order pages). Order confirmation: see Storybook, What is missing, E02-S03. Confirmation pages have the light body and the dark frame header and footer, as checkout does.
5. Run `npm run check:tokens` and check both themes and both densities (`data-density="admin"` on the admin layout).

## Components

21 components in `packages/app/src/components/ui/`, imported as `@/components/ui/<file>`.

| Component | Import | Use when | Do not use when |
| --- | --- | --- | --- |
| Button | `Button`, `buttonVariants` (`ui/button`) | an action on this screen; `action` (red) only for a purchase step; a navigation step as a link with `buttonVariants` (`default` main, `secondary` supporting) | red in the admin |
| Text link | `TextLink` (`ui/text-link`) | navigation inside running text; a resource name in a table (`resource`) | an action (Button); a navigation step (`buttonVariants`) |
| Input | `Input` | one line of text | several lines (Textarea); a choice (Select, Radio group) |
| Textarea | `Textarea` | several lines | one line (Input) |
| Label | `Label` | a visible name outside a form layout | inside a form (use `FieldLabel`) |
| Field | `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldSet`, `FieldLegend`, `FieldContent` (`ui/field`) | every form control: label, control, hint, error | a form-level message (Alert) |
| Select | `NativeSelect`, `NativeSelectOption`, `NativeSelectOptGroup` (`ui/native-select`) | one choice from a longer list | two to five options (Radio group) |
| Checkbox | `Checkbox` (`ui/checkbox`) in a horizontal `Field` | an on/off value saved with the form | one of several (Radio group) |
| Radio group | `RadioGroup`, `RadioGroupItem` (`ui/radio-group`) | one choice from two to five visible options | a long list (Select) |
| Badge | `Badge` (`ui/badge`) | a status in words | a link or a button |
| Alert | `Alert`, `AlertTitle`, `AlertDescription` (`ui/alert`) | a message about a page or a form: info, success, warning, destructive, demo | a field error (FieldError); a failed page load (ErrorState) |
| Card | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` (`ui/card`) | one topic in a panel | the product tile (one `--surface-product` surface); a card inside a card |
| Table | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`, `TableFooter` (`ui/table`) | records to scan and compare | product browsing; layout |
| Tabs | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`; `TabsNav`, `TabsNavLink` (`ui/tabs`) | panels on one page; views that change the URL (`TabsNav`) | steps of a flow (separate pages); category filters |
| Skeleton | `Skeleton`, `SkeletonGroup` (`ui/skeleton`) | every `<Suspense>` fallback | a spinner or "Loading…" text alone |
| Empty state | `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`, `EmptyContent` (`ui/empty`) | nothing here yet; no results; not found | an error |
| Error state | `ErrorState` (`ui/error-state`) | a page or section failed to load | field errors; a form error (Alert) |
| Disclosure | `Disclosure`, `DisclosureTrigger`, `DisclosureContent` (`ui/disclosure`) | extra content behind a summary; works without JS | information needed for the decision |
| Dialog | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogBody`, `DialogFooter`, `DialogClose` (`ui/dialog`) | a short task on top of the page that can be left | a confirmation (Alert dialog); anything worth a URL |
| Alert dialog | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction` (`ui/alert-dialog`) | confirming what cannot be undone | a reversible action |
| Navigation menu | `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuGrid`, `NavigationMenuLink` (`ui/navigation-menu`) | the store's category megamenu from 768 px | below 768 px (Disclosure) |

Not in the system (use the fallback): action menu, popover, drawer, tooltip, toast, avatar, switch, Base UI select, indeterminate checkbox, segmented control, accordion, row selection, spinner. Details: Storybook, *What is missing*.

## Tokens and density

- Semantic tokens live in `packages/app/src/app/globals.css` (light and `.dark`). Names describe the purpose: `--primary`, `--action`, `--muted-foreground`, `--surface-product`, `--frame*`, `--sidebar*`, `--success`, `--warning`, `--demo`, `--input`, `--ring`, `--link`.
- Gap and radius tokens by relation: `related` 8 px, `group-item` 16 / 12 px (admin), `group` 24 / 16 px, `panel`, `section`, `gutter`. Grid is 4 px.
- Radius: 8 px controls, 12 px cards, 4 px badges; pill only for the cart count.
- Density: store controls 40 / 44 / 48 px; admin 28 / 32 / 36 px on desktop; 44 px and up on a phone in both.
- Themes: light by default, dark through the switch or the system setting. Every new color pair is checked in both themes.

## Accessibility (WCAG 2.2 AA)

- Native elements first. Every control has a visible label. Focus is always visible (2 px `--ring` outline, 2 px offset).
- Errors: `FieldError` under the field with `aria-describedby` and `aria-invalid`; one `role="alert"` per form error, `role="status"` for success; focus to the first invalid field.
- Color is never the only signal. Red fill means buying, red text means an error.
- Motion: 120 / 200 / 300 ms; reduced motion removes movement and the skeleton pulse.
- Targets: 44 px on a phone, 24 px everywhere.

## Avoid

- Opacity for disabled or hover (`opacity-50`, `bg-primary/80`): use the state tokens.
- Palette classes (`text-amber-700`) and arbitrary values (`text-[0.8rem]`): use tokens.
- Gradients, shadows on cards, pills everywhere, cards inside cards, emoji as icons.
- `<div onClick>`, positive `tabIndex`, placeholder as label, `role="alert"` on every field.
- Red buttons in the admin; prices in the action color; a computed price shown as final.
- Errors that the user must act on in a toast.

## Add a component or a variant

- A component only when the same need appears in at least two places. Otherwise keep it in the screen with tokens.
- A variant only with at least two uses (planned or existing). Remove unused variants.
- Add with `npx shadcn@latest add <name>` in `packages/app`, then check the diff, the icon library (Tabler), and no `dark:` classes.
- The owner approves every token, component, variant and rule. New rules without a source go to the P list in *What is missing*.

## Where the documentation is

- Storybook (`npm run storybook`, port 6006): **Design system** (Start here, Components, How to choose, Usage and accessibility, Content, What to avoid, What is missing, Contributing, Epics), **Foundations**, **Primitives** (13 sections per component).
- Design records: `.ai/design/` (`referencje.md`, `audyt.md`, `tokeny.md`, `POSTEP.md`); spec `.ai/specs/2026-10-24-design-system.md`.

## Commands

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test:coverage          # unit tests, 100% coverage
npm run build-storybook        # static Storybook in packages/app/storybook-static
npm run test:storybook         # stories as tests (axe, light theme)
npm run test:storybook:themes  # stories in light and dark, axe as errors
npm run check:tokens           # palette classes, color literals, arbitrary values: file and line
```
