# Spec 07: Animacje i mikrointerakcje

**Branch:** `feat/07-animacje` · **Route(s):** all

## Goal
Add short, subtle motion that makes the app feel responsive and easier to follow. Every animation must do at least one of these jobs:
- **Feedback:** confirm that an action registered (press, hover, save, error).
- **Continuity:** show where something came from or went (form opens out of the page, a new card appears at the top of the list).
- **Orientation:** show the direction of a change (next week slides in from the right).

Motion that does none of these is out of scope. Nothing may delay input or hide content the user is waiting for.

## Principles
- **Short.** Hover and press: 120 ms. Enter and exit: 150–250 ms. Movement across the screen: at most 320 ms. Nothing above 400 ms.
- **Easing:**
  - things appearing use ease-out (fast start, gentle stop);
  - things leaving use ease-in, and leave faster than things enter;
  - things moving in place use ease-in-out.
- **Cheap to render.** Animate only `opacity` and `transform`. The exceptions are height on collapsible panels and the layout animations listed below, which Motion turns into transforms itself.
- **Reduced motion is respected everywhere.** With `prefers-reduced-motion: reduce`:
  - slides, scaling and layout movement are removed;
  - opacity crossfades stay, so state changes are still visible;
  - see "Reduced motion" below.
- **Interruptible.** Starting a new action mid-animation (e.g. clicking "next week" twice quickly) never queues animations or leaves elements half-visible.
- **Progressive.** Browsers without View Transitions support simply don't animate those parts. Nothing breaks.

## Tools
Three tools, each for the kind of change it handles best. No other animation libraries.

| Tool | Use it for | Why |
|------|-----------|-----|
| **CSS transitions** in `globals.css` | Hover, focus and press states; colour and border changes; dropzone drag-over | No JavaScript; works in Server Components |
| **React `<ViewTransition>`** (built into React 19.3, no dependency) | Changes caused by navigation: switching pages, changing the week, group or instructor, and Suspense fallback → content | Next.js runs every navigation (including `router.replace`) as a transition, so these animate with no extra state. See `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`. |
| **Motion** (`motion` package, `import … from "motion/react"`; the successor of Framer Motion) | Local UI state: panels opening and closing, items entering and leaving lists, list reflow, banners, the sidebar's active pill | Mount/unmount (`AnimatePresence`) and layout animations that CSS can't do |

### Motion setup
- Install `motion` (14.x; supports React 18 and 19).
- `src/components/motion/MotionProvider.tsx` is a client component, rendered once in `AppShell` around the content:
  - `<MotionConfig reducedMotion="user">` makes Motion follow the OS setting;
  - `<LazyMotion features={loadFeatures} strict>`, where `loadFeatures` dynamically imports `domMax` from `src/components/motion/features.ts`, so the initial bundle carries only the small `m` component.
- Components use `m.div` and friends, never `motion.div`. `strict` makes the wrong one throw in development.
- Motion is client-only. Server Components stay server components; wrap only the animated part in a small client component.

### Shared tokens
- `globals.css` `:root` gains:
  - `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`
  - `--ease-in: cubic-bezier(0.55, 0, 1, 0.45)`
  - `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`
  - `--dur-fast: 120ms`
  - `--dur-enter: 220ms`
  - `--dur-exit: 150ms`
  - `--dur-move: 320ms`
- `src/lib/motion.ts` exports the same values for Motion, e.g.:
  - `EASE_OUT = [0.22, 1, 0.36, 1]`;
  - `DUR = { fast: 0.12, enter: 0.22, exit: 0.15, move: 0.32 }`;
  - ready-made transitions: `enter`, `exit` and `collapse`.
- Values live in these two places only. Components never hard-code durations or curves.

### Reusable motion components (`src/components/motion/`)
- `Collapse`: `AnimatePresence` + `m.div`. It animates `height: 0 → auto` and `opacity`, enter `DUR.enter` ease-out, exit `DUR.exit` ease-in. Used for the add-instructor form, the import result panel and error/success banners.
- `FadeIn`: opacity 0 → 1 plus `y: 8 → 0`, ease-out. With reduced motion, opacity only.
- `AnimatedList`: wraps list items in `AnimatePresence` with `m.div layout`. New items fade and scale in from 0.98, removed items fade out, and the remaining items glide into place with `layout`.

## Catalogue
What animates, where, and with which tool. Anything not listed stays static.

### Global (CSS)
| Element | Animation |
|---------|-----------|
| `.btn`, `.btn-icon`, `.grupa-link`, `.week-nav button` | `background-color`, `border-color`, `color` over `--dur-fast` `--ease-out`. On `:active`, `transform: scale(0.98)`. |
| `.nav-item` | Colour change on hover over `--dur-fast`. |
| `.instructor-card`, `.kierunek-card` | On hover, the shadow changes from `--shadow-card` to `--shadow-hover` and the card lifts with `translateY(-1px)`, over `--dur-fast`. |
| Inputs and selects | `border-color` and `outline-color` over `--dur-fast` on focus. |
| `.dropzone` | `border-color` and `background` over `--dur-fast` when `.drag-over` toggles; the icon lifts `translateY(-2px)`. |
| `.import-result-row` | `background-color` over `--dur-enter` when a row changes between conflict, replaced and skipped. |

### Sidebar (Motion)
- The black active pill moves between nav items: an `m.span` with `layoutId="nav-active"` behind the active label, over `--dur-move` ease-in-out.
- With reduced motion it switches instantly.

### Page changes (`<ViewTransition>`)
- Each `page.tsx` wraps its content in `<ViewTransition enter="page-enter" exit="page-exit" default="none">`:
  - the old page fades out over 150 ms;
  - the new page fades in and rises 8 px over 220 ms.
- The sidebar has `viewTransitionName: "sidebar"` with its animation set to `none`, so it never fades.
- The wrapper goes in each page, not in the layout. Layouts persist across navigations, so enter and exit never fire there.

### Harmonogram grup / prowadzącego (`<ViewTransition>`)
- **Week change:** `WeekNav` calls `router.replace(url, { scroll: false, transitionTypes: ["tydzien-nastepny"] })`, or `"tydzien-poprzedni"` for the previous week.
  - The calendar is wrapped in a `ViewTransition` keyed by the week, with `enter`/`exit` maps for those two types.
  - Next week: old grid slides out to the left and the new one comes in from the right, 40 px offset.
  - Previous week: the opposite direction.
  - Both slides fade over 150 ms out and 220 ms in.
- **Group or instructor change:** the calendar, and for spec 04 the summary card, crossfade, keyed by group or instructor id with `enter="auto" share="auto"`. There is no slide, because it's the same place with different content.
- **Pending state:**
  - while a filter or week navigation is in flight (`isPending` from the existing `useTransition`), the calendar dims to `opacity: 0.6` over `--dur-fast`;
  - the calendar gets `aria-busy="true"`;
  - this is CSS only.
- **Suspense reveal:** the "Wczytywanie harmonogramu…" fallback exits with a fade, and the content enters with `FadeIn`-style CSS keyframes.

### Kierunki i grupy (Motion)
- Search results use `AnimatedList`:
  - programmes and group rows that stop matching fade out;
  - the rest close the gap smoothly;
  - the empty-state message fades in.

### Prowadzący (Motion)
- The "Nowy prowadzący" form opens and closes with `Collapse`. The first field gets focus after the open animation starts, not after it ends.
- Field error messages fade in with `y: -4 → 0` over `DUR.enter`. No shaking.
- A saved instructor's card enters at the top of `AnimatedList` and the other cards shift down with `layout`.
- The success banner enters with `Collapse`.
- Search filtering uses `AnimatedList`, as on Kierunki.

### Import i eksport (Motion + CSS)
- The import result panel (summary, rows and buttons) opens with `Collapse` when a file is read, and closes on "Anuluj" or after a successful import.
- Conflict, success and info banners use `Collapse`.
- "Pomiń" and "Zastąp" change the row's background with a CSS transition. The note text crossfades.
- The export target select (Kierunek/Grupa/Prowadzący) appears and disappears with `FadeIn` and exits with a fade.

## Reduced motion
- Motion: `MotionConfig reducedMotion="user"` turns off transform and layout animations and keeps opacity.
- View transitions and CSS: one block in `globals.css` under `@media (prefers-reduced-motion: reduce)` that:
  - sets slide offsets and `translate`/`scale` values to 0, keeping fades (see the Next.js guide's note on not removing all motion);
  - removes the `:active` scale and the card lift.
- Test it manually with the OS setting, and in Chromium DevTools with Rendering → "Emulate CSS prefers-reduced-motion".

## Testing (extends spec 06)
- **Component tests:** `vitest.setup.ts` sets `MotionGlobalConfig.skipAnimations = true` (from `motion/react`), so animations finish instantly. Assertions that an element disappeared use `waitFor` or `waitForElementToBeRemoved`, because `AnimatePresence` removes exiting elements asynchronously.
- **E2e tests:** `playwright.config.ts` sets `use.reducedMotion: "reduce"` for all projects, so existing tests stay fast and deterministic.
- New `e2e/motion.spec.ts` runs with `test.use({ reducedMotion: "no-preference" })` and checks:
  - after a week change, a filter change, opening the instructor form and loading an import, the affected content ends fully visible: computed `opacity` is 1 and no element is left with a non-identity `transform`;
  - while each of those animations runs, every entry of `document.getAnimations()` has `duration + delay <= 400`;
  - clicking "Następny tydzień" three times quickly ends on the correct week, with a single calendar in the DOM;
  - with `reducedMotion: "reduce"`, no running animation changes `transform`.
- Every existing unit, component and e2e test still passes.

## Out of scope
- Spring or bounce physics, parallax, scroll-linked effects, animated number counters.
- Skeleton screens. The existing text fallbacks stay; only their exit and enter are animated.
- Page transitions in browsers without View Transitions support.

## Acceptance criteria
- Every item in the catalogue is implemented with the listed tool, and uses the shared tokens.
- No animation is longer than 400 ms, including delay. `motion.spec.ts` enforces this.
- With reduced motion, nothing slides, scales or moves, and state changes are still visible as fades.
- Rapid repeated actions never leave stale or half-faded content.
- `motion` is the only new runtime dependency. Lighthouse "Total Blocking Time" and the first-load JS of `/kierunki` don't grow by more than 15 kB gzip, thanks to `LazyMotion`.
- `npm run lint`, `npm run build`, `npm run test` and `npm run test:e2e` pass.
