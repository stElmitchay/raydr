# 🔭 Raydr

[![Svelte](https://img.shields.io/badge/Svelte_5-%23ff3e00.svg?style=flat&logo=svelte&logoColor=white)](https://svelte.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-%2338B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![Claude](https://img.shields.io/badge/Claude_API-191919?style=flat&logo=anthropic&logoColor=white)](https://docs.anthropic.com/)

**Raydr** is an open platform where developers submit software projects, connect their GitHub repositories, and receive AI-powered progress analysis that reads their actual source code. Projects earn XP through monthly demo cycles, get evaluated against the Digital Public Goods Standard, and receive actionable next steps with concrete completion criteria. The platform serves both Christex Foundation teams (internal) and the broader developer community.

> 🚧 **Status**: Currently in active development. We welcome contributions and feedback from the community!

## 🌟 Features

### 📊 **AI-Powered Project Analysis**
- **Code-aware analysis**: Reads actual source code diffs, file trees, and key files — not just commit messages. When a commit says "fix stuff" but the diff shows a new authentication system, Raydr detects the real milestone
- **3-stage pipeline**: GitHub data collection → Idea evaluation → Synthesis. DPG compliance is provided separately by the [`christex-foundation/dpg-evaluator`](https://github.com/christex-foundation/dpg-evaluator) Claude Code Skill (run out-of-band) and consumed as input to synthesis
- **Evidence-based milestones**: Every detected milestone must cite specific files and code changes as evidence. No guessing from commit messages alone

### ✅ **Digital Public Goods Compliance**
- **9-criteria evaluation** against the [DPG Standard](https://digitalpublicgoods.net/standard/), produced by the [`christex-foundation/dpg-evaluator`](https://github.com/christex-foundation/dpg-evaluator) Claude Code Skill (Python; run from Claude Code, writes to `projects.dpgStatus` in Supabase)
- **Single source of truth**: Raydr displays whatever the skill last wrote — there is no in-app DPG prompt
- **Binary pass/fail per criterion** — backed by code:line evidence the skill collects
- **"Code over claims" philosophy**: Documentation describing unimplemented features counts *against* the project, not for it
- **Approval likelihood**: 7/9 passing = High, 4-6 = Medium, 0-3 = Low
- **Priority actions**: Ranked list of the most impactful improvements to reach DPG qualification
- **"Not yet evaluated" state** for projects the skill hasn't run against yet

### 🎯 **Actionable Next Steps**
- **Single source of truth**: All next steps come from the synthesis stage, which has the full picture across idea evaluation, DPG compliance, and progress analysis
- **Concrete completion criteria**: Every step includes a "done when" condition that can be objectively verified (e.g., *"LICENSE file exists in repo root with valid MIT text"*)
- **Evaluation-linked**: Each step tags which specific findings it addresses (e.g., `dpg:criterion-2`, `idea:feasibility`)
- **Persistent until fulfilled**: Unfulfilled steps carry over across analysis cycles — they stay visible until the code shows they're done

### 🛠️ **Implementation Plan Mode**
- **Plan before you push**: Instead of immediately generating code, the "Plan" button generates a reviewable implementation plan — which files to modify, the technical approach, and potential risks
- **Terminal-style plan viewer**: Plans appear inline in a dark, monospace terminal aesthetic with file change indicators (`+` create, `~` update) and risk callouts
- **Approve or reject**: Review the plan, then approve to generate code and open a PR, or reject to discard and try a different approach
- **Plan in the PR**: Approved plans become part of the PR description for traceability

### 💡 **Idea Evaluation**
- **Concept scoring** across 6 dimensions: problem clarity, solution fit, novelty, audience clarity, feasibility, and impact potential
- **Honest assessment**: A vague description scores low on clarity. A clone scores low on novelty. An overambitious scope scores low on feasibility
- **Strengths, concerns, and recommendations** in a structured breakdown

### 🏆 **Gamification & Demo Cycles**
- **XP system**: Earn XP for submitting projects, achieving milestones, fulfilling next steps, and claiming tool requests
- **Monthly demo cycles**: Projects are showcased on the last Thursday of each month with auto-detected Demo Day mode
- **Leaderboards**: Ranked by XP with department and role filtering
- **Streaks**: Track consecutive monthly demo cycle participation
- **Auto-generated newsletters**: Claude summarizes each demo cycle's highlights, top projects, and leaderboard changes

### 🔗 **GitHub Integration**
- **OAuth connection**: Secondary GitHub connection (separate from Supabase auth) for API access
- **Diff-based analysis**: Uses the GitHub compare API to fetch actual code diffs between analyses
- **File tree awareness**: Reads the full repository structure to understand project architecture
- **Key file sampling**: Automatically identifies and reads the most important files (package.json, entry points, configs) for context
- **AI-generated PRs**: Implementation plans that get approved result in branches and pull requests created via the GitHub API

### 👥 **Community**
- **Open to all**: Both Christex Foundation employees (`@christex.foundation` emails auto-tagged as internal) and community developers
- **Project comments**: Threaded discussions on each project
- **Adoption tracking**: Users can "adopt" projects they use, contributing to adoption metrics
- **Builder profiles**: Public profiles with contribution history, XP, level, and department
- **Tool requests**: A bounty board where users request tools and others claim and fulfill them for bonus XP

### 🔐 **Security & Authentication**
- **Supabase Auth**: Server-side session management via `@supabase/ssr` with per-request client creation
- **Row Level Security**: Database-level access control on all tables
- **Service-role isolation**: Admin operations use a separate service-role client that bypasses RLS
- **GitHub OAuth**: CSRF-protected OAuth flow with state parameter validation

## 🏗️ Architecture & Technology Stack

### **Frontend Technologies**
- **[SvelteKit](https://kit.svelte.dev/)**: Svelte 5 with runes (`$state`, `$props`, `$derived`) + TypeScript
- **[Tailwind CSS v4](https://tailwindcss.com/)**: Via `@tailwindcss/vite` plugin with CSS-based config in `app.css`
- **Editorial dark theme**: Custom design tokens for typography, color, and spacing
- **[`@sveltejs/adapter-auto`](https://kit.svelte.dev/docs/adapter-auto)**: Automatic deployment adapter

### **Backend & Infrastructure**
- **[Supabase](https://supabase.com/)**: PostgreSQL database, authentication, Row Level Security, storage buckets, and RPC functions
- **[Vite](https://vitejs.dev/)**: Build tool powering the SvelteKit development experience
- **Server-side rendering**: SvelteKit form actions for mutations, `+server.ts` routes for OAuth

### **AI & External APIs**
- **[Claude API](https://docs.anthropic.com/)** (direct fetch, no SDK): Powers progress analysis, idea evaluation, synthesis, README generation, newsletter generation, and implementation code generation. (DPG analysis is owned by the [`dpg-evaluator`](https://github.com/christex-foundation/dpg-evaluator) skill, not the web app.)
- **[GitHub API](https://docs.github.com/en/rest)** (direct fetch, no Octokit): Repo info, commits, diffs, file tree, file contents, branch creation, and PR creation

### **AI Analysis Pipeline**

```
GitHub Data Collection
  ├── Repo info (metadata, languages, visibility)
  ├── Code diffs (compare API, ~30KB budget)
  ├── File tree with sizes
  ├── Key source files (auto-detected, ~50KB budget)
  ├── README content
  └── License info
         │
         ├──→ Idea Evaluation (6 dimensions, concept-only)  ───────────┐
         │                                                              │
         └──→ Progress Analysis (milestones from actual diffs)  ───────┤
                                                                        ├──→ Synthesis
         (DPG status read from projects.dpgStatus, populated by  ──────┘     (sole source of next steps)
          the dpg-evaluator skill out-of-band)
                                                                          │
                                                                          ▼
                                                                   Next Steps
                                                                   (with done_when + addresses)
```

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- A **[Supabase](https://supabase.com/)** project
- A **[GitHub OAuth app](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)**
- An **[Anthropic API key](https://console.anthropic.com/)**

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/stElmitchay/raydr.git
   cd raydr
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```

   Then configure your `.env` file:

   | Variable | Description | Required |
   |----------|-------------|----------|
   | `PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
   | `PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) | ✅ |
   | `GITHUB_CLIENT_ID` | GitHub OAuth app client ID | ✅ |
   | `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret | ✅ |
   | `GITHUB_REDIRECT_URI` | GitHub OAuth callback URL | ✅ |
   | `ANTHROPIC_API_KEY` | Anthropic API key for Claude | ✅ |

4. **Database Setup**

   Run the SQL migrations in order in your Supabase SQL Editor:

   ```sql
   -- Run these in sequence:
   supabase/setup.sql
   supabase/migration-001-features.sql
   supabase/migration-002-platform-evolution.sql
   supabase/migration-003-next-features.sql
   supabase/migration-004-idea-evaluation.sql
   supabase/migration-005-synthesis.sql
   supabase/migration-006-performance-indexes.sql
   supabase/migration-007-analysis-redesign.sql
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   Your application will be available at `http://localhost:5173`

### Development Commands

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# TypeScript + Svelte type checking
npm run check

# Type checking with watch mode
npm run check:watch
```

## 📁 Project Structure

```
raydr/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── analyze.ts          # Analysis pipeline orchestrator
│   │   │   ├── claude.ts           # Claude API client + progress analysis
│   │   │   ├── dpg-status.ts       # Adapter for the dpg-evaluator skill's projects.dpgStatus output
│   │   │   ├── idea-eval.ts        # Idea/concept evaluation
│   │   │   ├── synthesis.ts        # Evaluation synthesis + next step generation
│   │   │   ├── ai-implement.ts     # Implementation plan generation + execution
│   │   │   ├── github.ts           # GitHub API helpers (diffs, tree, files, PRs)
│   │   │   ├── newsletter.ts       # Demo cycle newsletter generation
│   │   │   ├── demo-cycle.ts       # Monthly demo cycle utilities
│   │   │   ├── demo-day.ts         # Demo day auto-detection
│   │   │   ├── expire-claims.ts    # Tool request claim expiration
│   │   │   └── supabase-admin.ts   # Service-role Supabase client
│   │   ├── components/
│   │   │   ├── ui/                 # Shared UI components
│   │   │   └── layout/             # NavBar, FullScreenMenu, CommandPalette
│   │   ├── types.ts                # TypeScript type definitions
│   │   └── constants.ts            # XP constants and limits
│   ├── routes/
│   │   ├── +page.svelte            # Dashboard (analytics, charts, leaderboard)
│   │   ├── projects/               # Project listing + detail + analysis
│   │   ├── leaderboard/            # XP leaderboard with filters
│   │   ├── profiles/               # Builder directory
│   │   ├── challenges/             # Department challenges
│   │   ├── recaps/                 # Demo cycle recaps + newsletters
│   │   ├── catalog/                # Tool catalog
│   │   ├── requests/               # Tool request bounty board
│   │   ├── auth/                   # Login + GitHub OAuth flow
│   │   ├── submit/                 # Project submission
│   │   └── demo-day/               # Live demo day dashboard
│   ├── app.html                    # HTML template
│   └── app.css                     # Global styles + Tailwind config
├── supabase/
│   ├── setup.sql                   # Initial schema
│   └── migration-*.sql             # Schema migrations (001-007)
├── svelte.config.js                # SvelteKit configuration
├── package.json                    # Dependencies and scripts
└── CLAUDE.md                       # AI assistant context file
```

## 🔄 How Analysis Works

1. **User clicks "Run Analysis"** on their project page
2. **GitHub data is fetched** in parallel: repo metadata, commit history, code diffs (via compare API), full file tree, and key source files
3. **DPG status is read** from `projects.dpgStatus` — populated by the [`dpg-evaluator`](https://github.com/christex-foundation/dpg-evaluator) skill, run separately from Claude Code. If a project hasn't been evaluated yet, synthesis simply skips DPG considerations that cycle.
4. **Idea evaluation** scores the project concept across 6 dimensions
5. **Progress analysis** reads the actual code diffs to detect milestones, checking each against the previous analysis to avoid double-counting
6. **Synthesis** combines DPG status, idea evaluation, and progress into strengths, critical gaps, and 3-5 prioritized next steps — each with a concrete "done when" condition
7. **Results are stored**: milestones recorded, fulfilled goals marked complete with XP awarded, new next steps added alongside existing unfulfilled ones

To populate or refresh DPG status for a project, run the skill from Claude Code:

```bash
python3 scripts/evaluate.py <project_id>   # writes projects.dpgStatus
```

## 🛠️ How Implementation Plan Mode Works

1. **User clicks "Plan"** on a next step
2. **AI reads the repo** — fetches the file tree and reads up to 10 relevant files for context
3. **Plan is generated** — which files to modify/create, the technical approach, and potential risks (no code written yet)
4. **Plan appears inline** in a terminal-style viewer below the step
5. **User reviews and decides**:
   - **Approve**: AI generates the actual code changes, creates a branch, commits files, and opens a PR
   - **Reject**: Plan is discarded, step returns to its original state

## 🤝 Contributing

We welcome contributions from developers! Here's how to get involved:

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** from `main`
4. **Make your changes** following existing code conventions
5. **Run `npm run check`** to verify types
6. **Submit a pull request** with a clear description

### Development Guidelines
- Follow the existing code style and Svelte 5 runes patterns
- Write meaningful commit messages
- Keep PRs focused and manageable in size
- Update documentation when necessary

## 📄 License

This project is licensed under the **MIT License** by Mitchel Dennis - see the [LICENSE](./LICENSE) file for details.

---

<div align="center">

**[📖 Documentation](./CLAUDE.md)** · **[🤝 Contribute](#-contributing)** · **[🐛 Report Issues](https://github.com/stElmitchay/raydr/issues)**

Made with ❤️ by Mitchel Dennis

</div>
