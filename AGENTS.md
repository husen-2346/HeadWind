# AGENTS.md - Rules for AI Coding Tools

These rules apply to any AI coding assistant or engineer working on the Headwind codebase.

1. **Handoff Protocol**:
   - First action in EVERY session: Read `progress.md`, then read `AGENTS.md`.
   - Update `progress.md` before ending each session or completing a phase.

2. **Design Fidelity & Styling**:
   - Match the design references in `docs/design` exactly for layout, spacing, typography, and mood.
   - **Tokens only**: Never use hard-coded hex color codes or arbitrary font sizes anywhere in components or styles. Use design token CSS variables and Tailwind utility classes.
   - **Numerals**: Always use Geist Mono (`font-mono`) and tabular numbers (`tabular-nums`) for all numbers, metrics, coordinates, and times.
   - **Risk Colors**: Risk colors (`low`, `moderate`, `high`, `severe`, `no-travel`) must ONLY be used for weather data visualization and must ALWAYS be paired with a text label or geometric shape (never color alone).

3. **Code Quality & Architecture**:
   - **TypeScript Strict**: `strict: true`, no `any`, strictly typed props, state, and API models.
   - **Component Structure**: Small components with single responsibilities. Organized into `components/` and `features/`.
   - **Backend Separation**: All domain and weather risk logic lives in pure, deterministically testable functions under `trips/services/` with comprehensive pytest tests. Django views must remain thin HTTP adapters.
   - **Zero Secrets**: Never commit API keys, tokens, or `.env` files.
   - **No Fluff**: No placeholder lorem ipsum, no unused dead code, no speculative abstractions.

4. **Accessibility (a11y)**:
   - Visible focus states on interactive elements (`focus-visible:ring-2 focus-visible:ring-accent`).
   - Keyboard operable controls for all interactive workflows.
   - Maintain WCAG AA contrast standards.
   - Respect `prefers-reduced-motion`.

5. **Phase Execution Discipline**:
   - Work strictly on one phase at a time. Do not build ahead.
   - At the end of each phase:
     1. Run lint (`npm run lint`, python formatting/checks).
     2. Run tests (`pytest`, `npm test` if configured).
     3. Run type-checking and build (`npm run build`).
     4. Fix all warnings and errors.
     5. Update `progress.md` status, log, and next step.
     6. Make a conventional git commit.
   - **Verification Requirement**: Never mark a task done if it was not run, executed, and verified.
