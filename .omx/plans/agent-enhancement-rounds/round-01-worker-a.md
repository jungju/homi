### 1. Caregiver Quick Setup Wizard
- **Title:** Caregiver Quick Setup Wizard
- **Customer Problem:** A first-time caregiver lands on a friendly home face, but the path to a usable household setup is still too abstract and too JSON-heavy.
- **Customer Value:** Gets Homi from blank slate to first success in minutes by guiding the caregiver through starter content, the first reminder, the first dictation set, and basic notification choices.
- **Likely Surface:** Home face empty-state bubble, `/brain` onboarding card, handoff into `/engines/schedule` and `/engines/dictation`.
- **Why Now:** Homi already has the right core engines and import flow, but it lacks a guided first-run path, which is the biggest onboarding gap.

### 2. Goal-Based Starter Brain Packs
- **Title:** Goal-Based Starter Brain Packs
- **Customer Problem:** One generic sample bundle is rarely a good fit for real households with different routines, ages, and care needs.
- **Customer Value:** Gives families immediately useful starting points such as morning routine reminders, medication reminders, beginner dictation, and bedtime routines.
- **Likely Surface:** `/brain` sample tab, import preview, optional starter-pack picker in setup.
- **Why Now:** The sample import flow already exists, so expanding it into multiple high-relevance starter packs is a fast way to improve day-one usefulness.

### 3. Plain-Language Schedule and Dictation Builders
- **Title:** Plain-Language Schedule and Dictation Builders
- **Customer Problem:** Caregivers currently need to edit item arrays as raw JSON, which is a major blocker for non-technical setup.
- **Customer Value:** Lets households add reminders and first-week dictation content with large, simple fields instead of schema-shaped text blobs.
- **Likely Surface:** `/engines/schedule` and `/engines/dictation` dataset editor panels with tablet-readable forms.
- **Why Now:** Homi’s UI is otherwise approachable and large-format, so JSON-first editing is the sharpest mismatch with the product’s intended audience.

### 4. Replace-Impact Import Preview
- **Title:** Replace-Impact Import Preview
- **Customer Problem:** Replace-only import is scary because the current preview does not clearly show what existing datasets will disappear, be replaced, or disconnect from URL sync.
- **Customer Value:** Builds trust in brain management by making import consequences obvious before the caregiver commits.
- **Likely Surface:** `/brain` preview card with current-vs-incoming dataset summary, replace warnings, and URL-linking implications.
- **Why Now:** Import is already a core setup path, and replace-only behavior makes better preview clarity one of the highest-value safety improvements.

### 5. Local Brain Snapshot and One-Tap Undo
- **Title:** Local Brain Snapshot and One-Tap Undo
- **Customer Problem:** A bad import or mistaken edit can wipe out a working setup, which makes caregivers afraid to experiment during onboarding.
- **Customer Value:** Makes Homi feel safe by allowing rollback to the previous brain after an import or editing mistake without requiring cloud storage.
- **Likely Surface:** `/brain` history/restore section and post-import success state.
- **Why Now:** Homi is explicitly local-first, so lightweight local snapshots would turn that architecture into a customer-facing reliability advantage.

### 6. Recurring Quiet Hours and Protected Times
- **Title:** Recurring Quiet Hours and Protected Times
- **Customer Problem:** A manual 30-minute quiet toggle is not enough for sleep, school, therapy, naps, or other repeating household boundaries.
- **Customer Value:** Prevents Homi from becoming disruptive, which is critical for caregiver trust and first-week retention.
- **Likely Surface:** `/brain` quiet controls, home quiet-status text, and schedule/chime suppression behavior.
- **Why Now:** The product already knows how to suppress reminders and chimes; adding recurring caregiver-defined quiet windows would solve a real household pain with a natural extension of current behavior.