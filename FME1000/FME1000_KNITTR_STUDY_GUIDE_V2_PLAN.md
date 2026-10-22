# FME 1000 Knittr Study Guide v2 — Plan and Build Script

## Status

Approved October 20, 2026. Built October 20, 2026 as `public-study-guide/knittr-guide.html` beside the original guide, awaiting review.

What was built differs from this plan in three places:

- Flashcards reuse `tools/flashcards.py` and filter by session only, not by topic.
- The new page's checks live in `tools/check_site.mjs` rather than a separate `check_knittr_site.mjs`.
- Each session ends with a C-E-A-R model answer in its last topic's Practice view instead of separate model-question and check-yourself blocks.

## 1. Goal

Create a new localhost version of the FME 1000 study guide that is easier to study at two levels:

1. **The overarching session:** What the session is about and how its ideas connect.
2. **The specific topics:** The individual definitions, distinctions, frameworks, and actions taught within that session.

Every concept connected to entrepreneurship will also be applied to the **Knittr case**, because the entrepreneurship portion of the exam will use that case. The guide should help a student move from understanding a concept generally to recognizing it in Knittr and using it in a short written answer.

The existing guide should remain available while this version is built and checked.

## 2. Core learning structure

The new guide will follow this pattern:

> Course area → Session overview → Specific topic → General explanation → Knittr evidence → Analysis → Recommended action → Exam practice

Each entrepreneurship-connected session will contain:

- **Session in one sentence:** The central purpose of the session.
- **Why the session matters:** How its topics fit together.
- **Topic map:** A short list of every examinable topic in that session.
- **Specific topic sections:** A definition, important distinction, recognition clues, and common mistake for each topic.
- **Knittr application:** Facts from the case connected directly to each relevant topic.
- **What Knittr should do next:** Specific actions justified by the concepts.
- **C-E-A-R model response:** One complete exam-style answer.
- **Check yourself:** Recall and application questions.

This keeps general knowledge separate from case analysis while still showing how they connect.

## 3. Content rules

### General concepts

- Define concepts without depending on Knittr, so the explanation still works in a different example.
- Use the course's exact vocabulary when it matters.
- Explain differences that could be confused on the exam, such as an idea versus an opportunity or a feature versus a benefit.
- Include a concrete recognition clue: what a student would see in a case if the concept is present or missing.
- End with an action when the concept is meant to guide a decision.

### Knittr application

- Use only facts found in the assigned Knittr case or other approved course materials.
- Keep a fact separate from an interpretation. For example:
  - **Case fact:** What Knittr's founder actually said or did.
  - **Concept:** The relevant course idea.
  - **Analysis:** Why the fact demonstrates the concept.
  - **Response:** What should happen next and what it should improve.
- Do not carry facts, people, or recommendations from other example cases into Knittr.
- If a needed Knittr fact has not been supplied, mark it as `[KNITTR SOURCE NEEDED]` rather than inventing it.
- Reuse a case fact across sessions only when the new section analyzes it through a genuinely different concept.

### Exam answers

Use C-E-A-R:

1. **Concept:** Name and briefly define the concept.
2. **Evidence:** Cite a specific Knittr fact.
3. **Analysis:** Explain what the evidence reveals and why it matters.
4. **Response and result:** Recommend an observable action and explain the expected improvement.

## 4. Session and topic map

The entrepreneurship case spine covers Sessions **1, 3, 5, 7, 8, 9, 11, and 12**. Sessions 1 and 9 are joint sessions, but their entrepreneurship concepts will still be applied to Knittr.

### Session 1 — Entrepreneurial Thought and Action

**Overarching session:** How entrepreneurs choose actions when the future is uncertain.

Specific topics:

- Prediction or causal logic
- Creation or effectual logic
- CreAction
- Means at hand: who I am, what I know, and whom I know
- Affordable or acceptable loss
- Acting, learning, and adjusting
- Intelligent failure as information
- When prediction is useful and when creation is useful

Knittr connection: diagnose whether the venture is planning from unsupported predictions or learning through small, affordable actions.

### Session 3 — Problem Solving and Idea Generation

**Overarching session:** How to move from an early idea toward a credible opportunity and generate alternatives before choosing a solution.

Specific topics:

- Idea versus opportunity
- Meaningful customer problem
- Existing alternatives and workarounds
- Attractive, durable, timely, and value-creating opportunity tests
- Customer-centered problem statement
- “How might we?” question
- Divergent versus convergent thinking
- Brainstorming rules
- Anchoring and premature evaluation
- AI for idea generation and the limits of AI judgment

Knittr connection: identify the current idea, the customer problem it assumes, the evidence still missing, and the process Knittr should use to develop multiple testable solutions.

### Session 5 — Empathy and Design Thinking

**Overarching session:** How to understand a problem from the customer's perspective and improve a solution through an iterative process.

Specific topics:

- Empathy versus sympathy
- Observation, context, behavior, friction, and workarounds
- Discovery interviews
- Open, neutral, behavior-based questions
- Leading and hypothetical questions
- Listening and neutral probing
- Empathize, define, ideate, prototype, test, and iterate
- Evidence versus founder assumptions

Knittr connection: evaluate the quality of the venture's customer understanding and redesign its discovery process around real past behavior.

### Session 7 — Value Proposition and Target Market

**Overarching session:** How a venture chooses whom to serve and states why that customer should choose its offer.

Specific topics:

- Market segmentation
- First target market
- Customer, consumer or user, payer, and decision-maker
- Research-based persona
- Customer pains, goals, constraints, and buying criteria
- Feature versus benefit
- Value proposition
- Resonate, differentiate, and substantiate
- Overt benefit, dramatic difference, and real reason to believe
- Creating, delivering, and capturing value
- Business Model Canvas and its nine blocks

Knittr connection: identify the people involved in buying and using the offer, evaluate whether the current target and persona are evidence-based, and rewrite the value proposition around a specific benefit and credible proof.

### Session 8 — Prototyping

**Overarching session:** How to learn about a risky assumption before committing to a complete product.

Specific topics:

- Riskiest assumption
- Prototype as a learning tool
- Fidelity appropriate to the question
- Smallest credible test
- Observable evidence and success criteria
- Customer behavior versus compliments
- Feedback and iteration
- Minimum viable product
- Concierge and manual tests
- Sunk-cost commitment and testing too late

Knittr connection: name the venture's riskiest assumption and design the smallest prototype that can produce observable evidence about it.

### Session 9 — Rocket Pitch

**Overarching session:** How to communicate the logic of an opportunity clearly and persuasively.

Specific topics:

- Specific customer
- Customer problem supported by evidence
- Focused solution
- Benefit rather than feature list
- Meaningful difference from alternatives
- Reason to believe
- Clear next step, test, or request
- Team handoffs and rehearsal
- Using feedback to improve the argument

Knittr connection: organize the case into a customer → problem → solution → benefit → difference → proof → next-step pitch rather than presenting unsupported features.

### Session 11 — Opportunity Evaluation

**Overarching session:** How to determine whether the same opportunity is wanted, deliverable, and sustainable.

Specific topics:

- Desirability
- Feasibility
- Viability
- Direct competitors, indirect alternatives, current workaround, and doing nothing
- Team skills and resource gaps
- Partners, suppliers, technology, time, quality, and operations
- Price, costs, margin, purchase frequency, and customer acquisition
- Key assumptions and risks
- Financial, social, and environmental consequences
- Honest impact claims and responsible venture choices

Knittr connection: create separate evidence columns for desirability, feasibility, and viability; identify the weakest lens; and recommend the next test for that weakness.

### Session 12 — Market Research

**Overarching session:** How to collect reliable evidence for a specific venture decision.

Specific topics:

- Primary versus secondary research
- Qualitative versus quantitative research
- Exploratory versus confirmatory questions
- Interviews, observation, focus groups, surveys, and experiments
- Sampling and representativeness
- Convenience sampling
- Leading, vague, double-barreled, and hypothetical questions
- Confirmation and moderator bias
- Patterns, contradictions, and disconfirming evidence
- Limits of small qualitative samples
- Product, price, place, and promotion
- Revenue drivers

Knittr connection: audit the case's current evidence, match each unanswered question to the right research method, and improve any biased sample or question design.

## 5. Organizational Behavior structure

Sessions **2, 4, 6, 10, and 13** will use the same general-to-specific hierarchy, but they will remain broadly applicable instead of being forced into Knittr unless the assigned materials explicitly connect them to the case.

- **Session 2:** Culture, visible and invisible assumptions, rules, norms, charters, and reinforcement
- **Session 4:** Emotional intelligence, responding instead of reacting, resonant leadership, and trust through authenticity, logic, and empathy
- **Session 6:** Team effectiveness, psychological safety, productive failure, mistakes, task conflict, relationship conflict, process gains and losses, and leadership interventions
- **Session 10:** DiSC preferences, flexing communication, and designing a process that uses different styles
- **Session 13:** Personal and social identity, diversity, inclusion, belonging, faultlines, bias, airtime, roles, and decision influence

Each OB session will contain a short independent team vignette and a C-E-A-R model response.

## 6. Knittr case spine

The new guide will include a dedicated Knittr case hub before the entrepreneurship sessions.

### Case hub contents

- A neutral case summary using only assigned facts
- People and organizations in the case
- Current customer claim
- Current problem claim
- Current solution or offer
- Research completed so far
- Resources and capabilities
- Revenue and cost assumptions
- Competitors and alternatives
- Important quotations or actions
- Open questions that the case does not answer

### Fact ledger

Before drafting applications, create a fact ledger with these columns:

| Source location | Exact fact or short quotation | Relevant session(s) | Safe interpretation | Unknown or limitation |
| --- | --- | --- | --- | --- |
| `[KNITTR SOURCE NEEDED]` |  |  |  |  |

The ledger will prevent the same unsupported assumption from being repeated throughout the site.

### Case progression

The session order should make Knittr feel like one developing venture:

1. Choose how to act under uncertainty.
2. Separate the idea from the opportunity and frame the problem.
3. Understand customers through empathy and discovery.
4. Choose a target and form a value proposition.
5. Prototype the riskiest assumption.
6. Explain the opportunity in a Rocket Pitch.
7. Evaluate desirability, feasibility, and viability.
8. Design stronger research for the remaining decisions.

The guide may refer backward to prior evidence, but it should not pretend that a proposed action has already happened.

## 7. Markdown content script

The study guide should be written in Markdown before the page is generated. A consistent structure will let the builder create a nested outline automatically.

```markdown
## Entrepreneurship

### Session 7: Value Proposition and Target Market

#### Session overview

[One-paragraph explanation of the session's central question and how its topics connect.]

#### Topic map

- Market segmentation
- Target market
- Customer, user, payer, and decision-maker
- Persona
- Feature versus benefit
- Value proposition
- Business model

#### Topic: Value proposition

##### General concept

[Definition that works independently of Knittr.]

##### Important distinctions

[Feature versus benefit; claim versus evidence; customer versus broad market.]

##### How to recognize it in a case

[Signals of a strong or weak value proposition.]

##### Knittr application

- **Evidence:** [Verified case fact or `[KNITTR SOURCE NEEDED]`]
- **Analysis:** [Why the evidence matters]
- **Next action:** [Specific recommendation]
- **Expected result:** [What the action should improve]

##### Exam-ready language

> [Short C-E-A-R paragraph using verified facts.]

#### Session model question

[Knittr application prompt]

#### Model answer

[Complete C-E-A-R response]

#### Check yourself

- [General recall question]
- [Knittr evidence question]
- [Action or comparison question]
```

## 8. Localhost information architecture

Build the new version beside the current site instead of replacing it immediately.

### Proposed files

- `public-study-guide/FME1000_Knittr_Study_Guide.md` — single source of truth for the new guide
- `public-study-guide/knittr-guide.html` — generated reading experience
- `public-study-guide/tools/build_knittr_guide.py` — converts the Markdown hierarchy into the site
- `public-study-guide/tools/flashcards_knittr.py` — terms organized by session and specific topic
- `public-study-guide/tools/check_knittr_site.mjs` — automated interaction and content checks
- `public-study-guide/site.css` — shared design tokens, with new styles added only when necessary
- `.conductor/settings.local.toml` — a local run action that serves `public-study-guide` on `$CONDUCTOR_PORT`

### Page layout

Desktop:

- Left rail: course area → session → specific topic
- Main column: the selected session's complete reading content
- Optional right-side or inline Knittr summary: current case facts and connections

Mobile:

- Collapsible outline above the content
- One-column reading flow
- Sticky return-to-top or session navigation controls

### Main controls

- Filter by All, Entrepreneurship, Organizational Behavior, or Not studied
- Search definitions, topics, and Knittr evidence
- Mark individual topics and complete sessions as studied
- Switch between **Learn**, **Knittr application**, and **Practice** within a session
- Open the Knittr case hub from any entrepreneurship session
- Copy the C-E-A-R answer framework
- Use flashcards filtered by session or topic

## 9. Build and localhost script

The current site is static and does not require an application framework. Keep that approach unless the new interaction design proves it insufficient.

### Conductor run action to add during implementation

```toml
[scripts.run.knittr_guide]
available_in = [ "local" ]
command = "python3 -m http.server $CONDUCTOR_PORT --directory public-study-guide"
default = true
icon = "book-open-check"
```

Expected local URL:

```text
http://127.0.0.1:$CONDUCTOR_PORT/knittr-guide.html
```

In this workspace, the currently allocated port is `55040`, but the saved command must use `$CONDUCTOR_PORT` so parallel Conductor workspaces do not collide.

### Planned build commands

```bash
cd public-study-guide
python3 tools/build_knittr_guide.py
node tools/check_knittr_site.mjs --shots ../.context/knittr-guide-check
python3 -m http.server "$CONDUCTOR_PORT"
```

The server command is for manual terminal use. Conductor's run action should remain the normal way to start the localhost preview.

## 10. Implementation sequence

### Phase 1 — Confirm source and scope

1. Confirm the spelling **Knittr**.
2. Locate or receive the assigned Knittr case and any instructor study guide.
3. Build the fact ledger before writing case analysis.
4. Confirm that Knittr becomes the case spine only in the new version.

### Phase 2 — Write the Markdown source first

1. Create the new Markdown file without touching the current guide.
2. Add the overarching explanation for all 13 sessions.
3. Break each session into the specific topics listed in this plan.
4. Draft general definitions and distinctions.
5. Apply Sessions 1, 3, 5, 7, 8, 9, 11, and 12 to verified Knittr facts.
6. Add model questions, C-E-A-R answers, and check-yourself questions.
7. Review the Markdown for gaps, duplication, and unsupported claims before building the page.

### Phase 3 — Build the reading experience

1. Add a separate builder for the nested Markdown hierarchy.
2. Generate the area, session, and topic navigation.
3. Add Learn, Knittr application, and Practice views.
4. Preserve search, studied tracking, copy buttons, dark mode, and responsive behavior from the current site.
5. Namespace new browser-storage keys so the v2 guide does not overwrite current progress.

### Phase 4 — Add review tools

1. Build flashcards from the new topic structure.
2. Add Knittr case questions to the written case coach.
3. Ensure questions test both concept recall and case application.
4. Keep model answers hidden until the student attempts a response.

### Phase 5 — Add localhost and verification

1. Add the Conductor run action using `$CONDUCTOR_PORT`.
2. Extend or create automated checks for the new page.
3. Run the builder and interaction checks.
4. Inspect desktop and phone screenshots.
5. Open the localhost for user review.
6. Replace or promote the existing guide only after approval.

## 11. Verification checklist

### Content

- All 13 sessions appear once.
- Every session has an overarching explanation and specific topic sections.
- Sessions 1, 3, 5, 7, 8, 9, 11, and 12 each contain verified Knittr applications.
- No names or facts from other example cases appear in the Knittr content.
- Every Knittr claim can be traced to the fact ledger.
- Definitions remain understandable without reading the case.
- Every model answer includes concept, evidence, analysis, and response/result.
- The value proposition is expressed as a customer benefit with a difference and reason to believe, not only as a feature list.

### Interface

- The nested outline reaches every area, session, and topic.
- Search returns both general concepts and Knittr applications.
- Filters do not hide the section reached through a navigation link.
- Studied state persists after reload and remains separate from the existing guide.
- Flashcards can be filtered by session and topic.
- Keyboard navigation, focus states, headings, labels, and contrast remain usable.
- The layout works at desktop and phone widths.

### Technical

- The Markdown builder completes without errors.
- Generated HTML contains no unresolved template markers.
- All internal links resolve.
- The page loads without browser console errors.
- Automated checks exercise navigation, search, filters, progress, flashcards, practice answers, and mobile layout.
- The Conductor run action uses `$CONDUCTOR_PORT` and can run alongside other workspaces.
- The current guide and practice test still work throughout development.

## 12. Review decisions before implementation

The first content build needs these items confirmed:

1. The official Knittr case file or text and any related slides.
2. Whether **Knittr** is the exact spelling used by the course.
3. Whether Organizational Behavior should remain based on separate mini-cases.
4. Whether the new version should eventually replace the current public guide or remain a separate page.
5. Whether the practice test should be rewritten during the same build or after the reading guide is approved.

Until those decisions are made, development can safely prepare the new file structure and builder, but it should not draft unsupported Knittr analysis.
