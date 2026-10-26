# Product gallery: a `.ts` and `.tsx` with one basename shadow each other, and handlers need a test

- `product-gallery.ts` (view logic) and `product-gallery.tsx` (component) made `import "./product-gallery"` resolve to the `.ts` file, so the component was missing. Name the logic module differently (`product-gallery-state.ts`).
- The repo has no DOM test library, and the 100% gate counts closures in `.tsx` files. The gallery's click, key and ref handlers are covered by a unit test that replaces `useState` and `useRef` with plain objects (`vi.mock("react")`) and invokes the handlers from the element tree. Do not write `?? initial` for a value that is always set: the unreachable branch breaks the branch gate.
- Storybook allows one default export per stories file: split a file with two `meta` objects.
- An exact `getByText` does not match a paragraph that holds two lines; match a regex on the sentence.
