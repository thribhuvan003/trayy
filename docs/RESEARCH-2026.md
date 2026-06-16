# Agentic Engineering & Claude Tooling — Research Brief (June 2026)

> Synthesis of 3 parallel research agents (top builders · community pulse · Claude ecosystem), compiled 2026-06-16.
> Purpose: give the founder an edge on where AI-assisted development is actually heading.

## ⚠️ Confidence / method caveat (read first)
The research agents had **WebSearch but NOT WebFetch** (page-fetch was permission-blocked in their sandbox). So everything below comes from **search-result summaries**, not full primary pages.
- **Feature/capability existence** (skills, subagents, hooks, MCP, Managed Agents, Dynamic Workflows, SDK billing change) = corroborated across multiple sources → high confidence.
- **Specific numbers** (GitHub stars, install counts, "4.2× cost", "36% hallucination reduction", survey %s) = **community/paper claims, NOT independently verified.** Treat as directional.
- To upgrade to verbatim/page-verified: re-run with WebFetch enabled (see "Unlock" at bottom).

---

## The one-paragraph picture
The center of gravity has moved **from the model to the harness around it.** Frontier models are seen as converged, so the skill gap between builders is now: **context engineering, eval/verification, and workflow design** — not prompt wording. "Prompt engineering is dead, context engineering replaced it" is now settled consensus. Karpathy calls **Dec 2025 the agentic-coding inflection point** ("vibe coding raises the floor; agentic engineering preserves the quality bar"); the developer is becoming an **orchestrator of agents**. The loudest unresolved fight is **MCP vs. raw CLI** (token overhead + a security scare). Autonomy hype is out; **bounded, "manage-it-like-a-junior-dev" orchestration** is in. Verification — not generation — is named the real 2026 bottleneck.

---

## 1. Context engineering (replaces prompt engineering)
- Karpathy's canonical definition: *"the delicate art and science of filling the context window with just the right information for the next step."*
- Anthropic frames context as a finite **"attention budget"** — *"every new token depletes this budget"*; goal = the smallest set of high-signal tokens.
- **Five canonical tactics:**
  1. **Just-in-time retrieval** — load data at runtime via tools (file path/query), don't pre-stuff. Use Bash (`head`/`tail`) to inspect big data without loading it.
  2. **Sub-agent isolation** — push noisy exploration into subagents that return short summaries ("most powerful and most underused").
  3. **Tool-result clearing** — drop old re-fetchable results, keep the record.
  4. **Compaction** — summarize history near the limit and reinitialize.
  5. **Structured note-taking** to external files (state lives on disk, not in the window).

## 2. Agentic engineering = a real discipline (vibe coding ≠ this)
- **Vibe coding** = YOLO, ignore the code. **Agentic engineering** = AI does implementation, *human owns architecture, quality, correctness*.
- Principles (Willison): *"code is now inexpensive"* → focus shifts to architecture; *preserve domain expertise* → delegate routine implementation, keep the thinking.
- **TDD is the single most-repeated concrete technique** — red/green tests keep "free" AI code honest with minimal extra prompting.
- Karpathy's closer: **"You can outsource your thinking, but you can't outsource your understanding."**

## 3. Orchestration patterns (match pattern to problem)
| Pattern | What | When to use | Cost note |
|---|---|---|---|
| **Autonomous loop** (`/goal`, `/loop`) | act→observe→decide until a *verifiable* stop condition; separate evaluator model checks each turn | task has an encodable success test (tests pass, diff matches) | only after you have evals |
| **Subagents** | separate session via Task tool, own context/tools | cheap fan-out, isolate noisy/bounded sub-problems; use a cheaper model | sprawl → OOM/cost; cap the count |
| **Agent Teams** (experimental) | teammates share findings, debate, self-coordinate | when agents need to challenge each other | higher |
| **Council / debate** | many heterogeneous models → consensus synthesizer | high-stakes, error-cost > inference-cost | **4.2× tokens, −35.9% hallucination** (verified, arXiv 2604.02923); **contested benefit** |
| **RFC/DAG pipeline** | fan-out/linear/supervisor/swarm; plan lives in a **file** | stable stages with clear dependencies | deterministic = controllable |
| **Dynamic Workflows** (research preview) | Claude writes its *own* orchestration, spins up tens–hundreds of parallel subagents | tasks too big to hand-author a pipeline | plan-tier gated |
- **Reality check:** parallel multi-agent burns **~15× tokens** (Anthropic's own figure for its multi-agent research system; token usage explained ~80% of performance variance). Parallelism isn't free → model-route (frontier only for hard problems).
- **"The Cost of Consensus" caveat:** research suggests *isolated self-correction often beats unguided debate*, and the synthesis step can hallucinate a consensus that doesn't exist. Skip council for routine work.

## 4. Evals / verification = the moat
- Shift: "building agents → building **verifiable** agent systems." **Verification capacity is the bottleneck, not generation speed.**
- Evaluate **harness + model together**; pair **rule-based judges** (deterministic: build exit codes, linters, fixture diffs, screenshots) with **LLM judges** (behavioral).
- LLM-as-judge is **not set-and-forget** (Hamel Husain, page-verified): *"start with around 30 examples and keep going until I do not see any new failure modes"*, aim for *">90% agreement"* with a human, and re-review *"at regular intervals and whenever something material changes"* — judgment, NOT a fixed count or fixed cadence. (Earlier "100+ examples/weekly" framing was wrong.) Start with error analysis on real traces.
- Tools: **DeepEval** (pytest-compatible, CI/CD), Hamel's eval-skills plugin (`error-analysis`, `write-judge-prompt`, `validate-evaluator`…).
- **Spec-driven development (SDD)** rising as the anti-drift method: executable, version-controlled spec → plan → atomic tasks → code. Flagship: **GitHub Spec Kit** (community-claimed ~90k stars).

## 5. The MCP vs. CLI debate (the big unresolved fight)
- **Anti-MCP:** huge token overhead (claims of "4–32×" / "17×" more tokens vs CLI), painful setup/debugging; an **April 2026 RCE in the MCP SDK stdio transport** (reportedly affecting all SDKs / 7,000+ servers); ~66% of scanned servers had security findings. Tools like `mcp2cli` ride this.
- **Pro-MCP:** token count is the wrong metric (what matters is tool-call accuracy with less context); enterprises need MCP's **auth/audit/governance**.
- **Status: genuinely split.** Don't over-invest in a sprawling MCP setup; keep a small high-value set.
- **A2A (Agent2Agent)** — Google's emerging vendor-neutral agent-interop standard, "MCP for agents."

## 6. Tools to know (most-cited)
**MCP "install-first" set:** **GitHub MCP** (repo/PR/issues) · **Context7** (live version-specific docs — biggest accuracy win, kills stale-doc hallucination) · **Playwright** (E2E via accessibility-tree snapshots) · **Chrome DevTools MCP** (inspect live pages). Rule: *Playwright to run flows, Chrome DevTools to inspect them.* **Serena** (whole-repo semantic code search) pays off on large repos. The GitHub+Context7+Playwright trio ≈ 80% of agent needs.
> Note: this environment **already has** `context7`, `playwright`, `chrome-devtools`, and Vercel/Supabase/Figma MCPs available.

**Skills (community-claimed, verify before trusting counts):** code-reviewer, git-commit-writer, pr-description-writer, readme-generator, env-doctor, changelog-generator; official Anthropic pdf/docx/xlsx/pptx; the "superpowers" family (brainstorming, TDD, systematic-debugging, writing-plans) — many already present here. Treat your skills folder like **versioned dotfiles**: 8–12 small, opinionated skills.

**Emerging / watch:** Conductor (parallel git-worktree orchestration) · OpenCode (OSS terminal agent) · Cline (VS Code, per-step approval) · Aider · frameworks LangGraph/CrewAI/Mastra/AutoGen · harness-engineering as a named discipline (`ai-boost/awesome-harness-engineering`).

## 7. Anthropic platform — what's new (corroborated existence)
- **Managed Agents** (public beta ~Apr 2026): hosted APIs for cloud agents — sandboxed exec, checkpointing, credential mgmt, scoped permissions, tracing. Framing: *"decouple the brain from the hands."*
- **Dynamic Workflows** (research preview ~June 2026): Claude authors its own orchestration, parallel subagents (up to ~16 concurrent / ~1000 per run).
- **Agent SDK billing (official): from 2026-06-15**, SDK + `claude -p` usage on subscription plans draws from a **separate monthly Agent SDK credit** distinct from interactive limits.
- **Fable 5** ("Mythos" tier above Opus, ~June 9 2026): 1M context, 128K output — *"big model smell: slow, expensive, capable"*; use only for hard problems.

## 8. Verified tooling catalog (★ = gh-api confirmed 2026-06-16, independently re-checked)
Every star/fork below was pulled from the live GitHub API and spot-verified by hand. None archived; all pushed recently unless flagged STALE.

### MCP servers — install these next (net-new, not already installed)
| Repo | ★ | forks | What it does |
|---|---|---|---|
| oraios/serena | 25,418 | 1,706 | Semantic code retrieval + LSP-grade editing. Strongest code-intel add. |
| github/github-mcp-server | 30,722 | 4,399 | Official GitHub MCP (issues/PRs/repos/Actions). |
| modelcontextprotocol/servers | 87,314 | 11,014 | Official servers — pull `memory` + `sequential-thinking`. |
| getzep/graphiti | 27,490 | 2,750 | Temporal knowledge-graph memory (cross-session). |

Install: `claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server` · `claude mcp add github -- npx -y @github/github-mcp-server` · `claude mcp add memory -- npx -y @modelcontextprotocol/server-memory` · `claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking` (verify package names in each README).

**Already installed (keep, don't re-add):** superpowers (229,427★), upstash/context7 (57,481★), microsoft/playwright-mcp (33,985★), exa.

### Skill collections / installers — net-new, high-star
| Repo | ★ | What it does |
|---|---|---|
| sickn33/antigravity-awesome-skills | 40,863 | 1,500+ installable cross-agent skills + CLI |
| wshobson/agents | 36,825 | Mature subagent + skill set for eng workflows |
| davila7/claude-code-templates | 28,100 | CLI to browse/install agents/commands/skills |
| yusufkaraaslan/Skill_Seekers | 14,104 | Turn any docs site / repo / PDF into a Claude skill |
| ComposioHQ/awesome-claude-skills | 64,795 | Discovery index (bookmark) |
| anthropics/skills | 151,432 | Official skills (frontend-design, pdf/docx/xlsx/pptx, mcp-builder) — mostly already enabled |

### Frontend / animation / 3D libraries (wire directly; no skill needed)
shadcn-ui/ui (116,714★) · vercel/next.js (140,038★) · tailwindcss (95,563★) · radix-ui/primitives (18,981★) · mrdoob/three.js (113,082★) · juliangarnier/anime (69,929★) · motiondivision/motion (32,375★, = former Framer Motion) · pmndrs/react-three-fiber (31,103★) · greensock/GSAP (25,903★) · rive-app (interactive, actively maintained). **lottie-web (31,926★) is STALE** (last push 2025-09) → prefer Rive for new interactive work.

### Honesty flags
- Per-skill popularity on directory sites (claudeskills.info, agentskills.io) is **not measurable** — only backing-repo stars are. No standalone *frontend/animation skill* repo has meaningful adoption (top was 364★); use the installed `frontend-design` skill + the high-star libraries above.
- Frameworks (LangGraph 34,916★ · CrewAI 53,687★ · AutoGen 59,002★ · Mastra 25,130★ · OpenCode 175,106★) are for building your *own* agent apps — not Claude Code add-ons. Mastra = best fit for your TS/Next.js stack.

---

## ✅ Prioritized "get ahead" action list
1. **Per-repo `CLAUDE.md` + clean repo tree.** Highest-leverage, zero-cost; stable rules + tidy structure shape every run. (Already partly done for Tray.)
2. **MCP trio: GitHub + Context7 + Playwright.** Context7 alone cuts wrong-API hallucinations. (Context7/Playwright already available here.)
3. **Subagents for research/review only, on a cheaper model, count-capped.** The single most impactful context move; avoid sprawl.
4. **Hooks for safety + verification** — block unsafe commands, auto-run tests/formatter, audit-log. Encodes "test before done" at the harness level.
5. **A lightweight eval harness before scaling any automation** — even just build/test exit codes + one LLM-judge check.
6. **Autonomous loops (`/goal`) only after #5** gives the evaluator a real stop condition.
7. **Make TDD + structured external state (JSON, not prose) the default** for multi-session tasks: feature list + progress file + git + init script.
8. **Don't over-invest yet:** council/debate (4×+ cost, contested), a sprawling MCP setup (token + security risk), full autonomy (doesn't work yet). **Watch** Dynamic Workflows, Managed Agents, Conductor.

---

## Sources (representative; from search summaries)
- karpathy.bearblog.dev/sequoia-ascent-2026 · anthropic.com/engineering/effective-context-engineering-for-ai-agents · simonwillison.net/2026/Feb/23/agentic-engineering-patterns · hamel.dev (evals) · eugeneyan.com/writing/working-with-ai · latent.space (Agent Labs thesis)
- HN threads: parallel-agent burnout (item 47962775), parallel coding lifestyle (item 45489884) · MCP-vs-CLI measurement write-ups (earezki, stacklok, tyk)
- GitHub lists: ai-boost/awesome-harness-engineering · rohitg00/awesome-claude-code-toolkit · wong2/awesome-mcp-servers · win4r/Awesome-Claude-MCP-Servers
- InfoQ / Anthropic engineering coverage of Managed Agents, Dynamic Workflows, harness papers (github.com/anthropics/cwc-long-running-agents)

## 🔓 To unlock deeper research
- **Enable WebFetch for agents** (settings) → re-run for verbatim quotes, exact stats, and publish dates from primary pages.
- **X/Twitter live posts:** paste account/tweet URLs or provide X API creds (Karpathy/Willison tweets are login-walled).
- **Specific YouTube videos:** paste URLs to mine transcripts.
