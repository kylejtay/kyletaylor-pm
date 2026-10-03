// Placeholder content. Everything here gets replaced by Kyle's real background,
// case studies and per-role job descriptions once that context is written.

export type RoleId = "ai-platform" | "growth" | "devtools";

export type Role = {
  id: RoleId;
  label: string;
  company: string;
  headlineWord: string;
  pitch: string;
  jdFile: string;
  emphasis: string[];
};

export const ROLES: Role[] = [
  {
    id: "ai-platform",
    label: "AI Platform PM",
    company: "Northwind AI",
    headlineWord: "agents",
    pitch:
      "I turn messy model capabilities into products people trust: agent workflows, eval loops and the platform pieces underneath them.",
    jdFile: "jd/northwind-ai-platform-pm.md",
    emphasis: ["Agent orchestration", "Evals & guardrails", "Platform APIs"],
  },
  {
    id: "growth",
    label: "Growth PM",
    company: "Brightline",
    headlineWord: "growth loops",
    pitch:
      "I find the moment a product clicks for someone and build the loops that get more people there faster, increasingly with AI in the loop.",
    jdFile: "jd/brightline-growth-pm.md",
    emphasis: ["Activation", "Experimentation", "AI-assisted onboarding"],
  },
  {
    id: "devtools",
    label: "Developer Tools PM",
    company: "Stackforge",
    headlineWord: "developer tools",
    pitch:
      "I build for developers the way I like to be built for: great APIs, honest docs, and tools like MCP servers that slot into the workflow they already have.",
    jdFile: "jd/stackforge-devtools-pm.md",
    emphasis: ["APIs & SDKs", "MCP integrations", "Docs as product"],
  },
];

export type ToolDef = {
  name: string;
  signature: string;
  description: string;
};

export const TOOLS: ToolDef[] = [
  {
    name: "get_case_study",
    signature: "get_case_study(slug: string)",
    description: "Pulls one case study in full when a question needs depth on a single project.",
  },
  {
    name: "search_experience",
    signature: "search_experience(query: string, limit?: number)",
    description: "Semantic search across roles, teams and outcomes for breadth questions.",
  },
  {
    name: "match_job_description",
    signature: "match_job_description(jd: string)",
    description: "Maps each requirement in the role's JD to evidence from Kyle's work.",
  },
  {
    name: "show_architecture",
    signature: "show_architecture(topic: string)",
    description: "Renders a system diagram when explaining how something is built.",
  },
  {
    name: "show_metrics",
    signature: "show_metrics(project: string)",
    description: "Returns verified outcome numbers, never estimates.",
  },
  {
    name: "book_intro_call",
    signature: "book_intro_call(reason: string)",
    description: "Hands off to a real conversation when the agent shouldn't answer alone.",
  },
];

export const GUARDRAILS = [
  "Answers only from Kyle's provided context; says so when it doesn't know.",
  "Never discusses compensation or makes commitments on Kyle's behalf.",
  "Cites the source file behind every claim it makes.",
];

export const CONTEXT_SOURCES = [
  { name: "resume.md", kind: "profile" },
  { name: "case_studies/*.md", kind: "4 docs" },
  { name: "principles.md", kind: "voice" },
  { name: "jd/<role>.md", kind: "per page" },
];

// ---------- Artifacts the agent can open ----------

export type CaseStudyArtifact = {
  kind: "case-study";
  id: string;
  path: string;
  title: string;
  subtitle: string;
  meta: { label: string; value: string }[];
  metrics: { value: string; label: string }[];
  sections: { heading: string; body: string }[];
};

export type ExperienceArtifact = {
  kind: "experience";
  id: string;
  path: string;
  title: string;
  subtitle: string;
  roles: { company: string; title: string; dates: string; summary: string; tags: string[] }[];
};

export type ArchitectureArtifact = {
  kind: "architecture";
  id: string;
  path: string;
  title: string;
  subtitle: string;
  notes: { heading: string; body: string }[];
};

export type FitArtifact = {
  kind: "fit";
  id: string;
  path: string;
  title: string;
  subtitle: string;
  rows: { requirement: string; evidence: string; strength: number }[];
};

export type Artifact = CaseStudyArtifact | ExperienceArtifact | ArchitectureArtifact | FitArtifact;

export type Flow = {
  id: string;
  chip: string;
  prompt: string;
  keywords: string[];
  reasoning: string;
  tool: { name: string; args: Record<string, string | number> };
  reply: string;
  cardLabel: string;
  cta: string;
  artifact: Artifact;
};

export function buildFlows(role: Role): Flow[] {
  return [
    {
      id: "case-study",
      chip: "Hardest thing you've shipped?",
      prompt: "What's the hardest thing you've shipped?",
      keywords: ["hard", "ship", "proud", "project", "case", "built", "launch", "complex"],
      reasoning: "Question wants depth on one project, so get_case_study beats a broad search.",
      tool: { name: "get_case_study", args: { slug: "ledger-copilot" } },
      reply:
        "Probably Ledger Copilot: an agent that closes the books with finance teams instead of for them. The hard part wasn't the model, it was earning trust on actions that move money. I pulled the full write-up.",
      cardLabel: "Case study",
      cta: "Open case study",
      artifact: {
        kind: "case-study",
        id: "ledger-copilot",
        path: "case_studies/ledger-copilot.md",
        title: "Ledger Copilot",
        subtitle: "An AI agent that helps finance teams close the month in days, not weeks.",
        meta: [
          { label: "Role", value: "Lead PM" },
          { label: "Team", value: "6 eng · 1 design · 1 DS" },
          { label: "Timeline", value: "9 months" },
          { label: "Company", value: "Placeholder Co." },
        ],
        metrics: [
          { value: "-41%", label: "time to close" },
          { value: "92%", label: "suggestions accepted" },
          { value: "0", label: "unreviewed postings" },
        ],
        sections: [
          {
            heading: "The problem",
            body: "Month-end close meant hundreds of manual reconciliations. Early automation pilots failed because accountants couldn't see why the system did what it did, so they redid the work anyway.",
          },
          {
            heading: "What I did",
            body: "Reframed the product from 'autopilot' to 'copilot with receipts'. Every proposed entry carried its evidence trail and a confidence band. I set up an eval harness on 2,000 historical entries before we let the agent touch production data, and staged autonomy by risk tier.",
          },
          {
            heading: "Outcome",
            body: "Close time dropped 41% across the first eight customers. The audit trail became the main selling point, which moved the roadmap toward explainability over raw automation.",
          },
        ],
      },
    },
    {
      id: "experience",
      chip: "Walk me through your experience",
      prompt: "Can you walk me through your experience?",
      keywords: ["experience", "background", "career", "worked", "resume", "history", "jobs"],
      reasoning: "Breadth question across roles, so search_experience with a role-weighted query.",
      tool: { name: "search_experience", args: { query: role.emphasis[0].toLowerCase(), limit: 3 } },
      reply: `Here are the three roles most relevant to ${role.label} work at ${role.company}, ordered by how closely they map to the job description.`,
      cardLabel: "Work experience",
      cta: "Open timeline",
      artifact: {
        kind: "experience",
        id: "experience",
        path: "resume.md",
        title: "Experience",
        subtitle: `Weighted for ${role.label} · ${role.company}`,
        roles: [
          {
            company: "Placeholder Co.",
            title: "Senior Product Manager, AI",
            dates: "2023 to now",
            summary: "Led the agent platform: tool registry, eval pipeline and the first customer-facing copilot.",
            tags: ["Agents", "Evals", "0→1"],
          },
          {
            company: "Example Labs",
            title: "Product Manager, Platform",
            dates: "2020 to 2023",
            summary: "Owned public APIs and the developer portal. Grew active integrations 3x.",
            tags: ["APIs", "DX", "Platform"],
          },
          {
            company: "Sample Studio",
            title: "Associate PM",
            dates: "2018 to 2020",
            summary: "Shipped onboarding experiments that lifted week-one activation by 18%.",
            tags: ["Growth", "Experimentation"],
          },
        ],
      },
    },
    {
      id: "architecture",
      chip: "How do you think about agents & MCP?",
      prompt: "How do you think about agents and MCP?",
      keywords: ["agent", "mcp", "ai", "llm", "tool", "api", "architecture", "model", "how does"],
      reasoning: "Conceptual question that's easier to see than read, so show_architecture.",
      tool: { name: "show_architecture", args: { topic: "this-site" } },
      reply:
        "Easiest way to answer is to show you the thing you're talking to. This page is a small agent: a model, a set of tools, context served over MCP, and guardrails. Here's the diagram.",
      cardLabel: "Architecture",
      cta: "Open diagram",
      artifact: {
        kind: "architecture",
        id: "architecture",
        path: "principles.md#agents",
        title: "How this agent works",
        subtitle: "The same pattern I use when scoping agent products.",
        notes: [
          {
            heading: "Tools over prompts",
            body: "Capabilities live in small, typed tools with clear contracts. The model decides which to call; the tools decide what's true.",
          },
          {
            heading: "Context as a product surface",
            body: "Resume, case studies and the job description are served through an MCP server, so the same context works in any client, not just this site.",
          },
          {
            heading: "Guardrails are UX",
            body: "Saying 'I don't know, let's get on a call' is a designed path, not a failure state.",
          },
        ],
      },
    },
    {
      id: "fit",
      chip: `Why are you a fit for ${role.company}?`,
      prompt: `Why are you a fit for this role at ${role.company}?`,
      keywords: ["fit", "why", "hire", "role", "job", "match", "qualified", "requirements"],
      reasoning: `Role-specific question, so match_job_description against ${role.jdFile}.`,
      tool: { name: "match_job_description", args: { jd: role.jdFile } },
      reply: `I lined up each requirement from the ${role.label} posting against evidence from my work. Strongest overlap is ${role.emphasis[0].toLowerCase()} and ${role.emphasis[1].toLowerCase()}.`,
      cardLabel: "Role match",
      cta: "Open match report",
      artifact: {
        kind: "fit",
        id: "fit",
        path: role.jdFile,
        title: `Fit for ${role.label}`,
        subtitle: `${role.company} · requirements vs. evidence`,
        rows: [
          {
            requirement: role.emphasis[0],
            evidence: "Led agent platform from prototype to 40+ enterprise customers.",
            strength: 0.95,
          },
          {
            requirement: role.emphasis[1],
            evidence: "Built the eval harness that gated every production release.",
            strength: 0.88,
          },
          {
            requirement: role.emphasis[2],
            evidence: "Owned public API and developer portal for three years.",
            strength: 0.8,
          },
          {
            requirement: "Cross-functional leadership",
            evidence: "Ran a 9-person pod across eng, design and data science.",
            strength: 0.76,
          },
        ],
      },
    },
  ];
}

// Keywords match at the start of a word, so "ship" hits "shipped" but not "leadership".
const startsWord = (q: string, k: string) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(q);

export function matchFlow(flows: Flow[], text: string): Flow {
  const q = text.toLowerCase();
  let best = flows[0];
  let bestScore = 0;
  for (const f of flows) {
    const score = f.keywords.reduce((s, k) => (startsWord(q, k) ? s + 1 : s), 0);
    if (score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return best;
}

// Game mode: one level per job, oldest first. Each obstacle is a product-life
// pain (with a quip); clearing it reveals a real accomplishment from that job.
// Accomplishments come straight from Kyle's resume; the jokes are just jokes.
export type ObstacleKind = "bug" | "barrier" | "stack" | "clock" | "hippo" | "fire";

export type CareerLevel = {
  world: string;
  company: string;
  title: string;
  years: string;
  summary: string;
  obstacles: { label: string; kind: ObstacleKind; quip: string; win: string }[];
};

export const CAREER_LEVELS: CareerLevel[] = [
  {
    world: "1-1",
    company: "Objective",
    title: "UX Lead / Full Stack Engineer",
    years: "2012–2015",
    summary: "Started as a designer who also shipped production code.",
    obstacles: [
      {
        label: "“it's just for us”",
        kind: "stack",
        quip: "Famous last words of every internal tool.",
        win: "Turned an internal product into a SaaS application with hundreds of external users.",
      },
      {
        label: "works on my machine",
        kind: "bug",
        quip: "It did. Then we put it in front of users.",
        win: "Designed the UX/UI and led prototyping and user testing with a team of 10 developers and designers.",
      },
      {
        label: "rage clicks",
        kind: "barrier",
        quip: "Analytics found them. The friction got deleted.",
        win: "Implemented analytics to track user behavior, eliminate friction and improve conversion rates.",
      },
    ],
  },
  {
    world: "1-2",
    company: "Latitude",
    title: "Co-founder / Head of Product",
    years: "2015–2016",
    summary: "Co-founded a marketplace connecting travelers with tour guides around the world.",
    obstacles: [
      {
        label: "chicken, meet egg",
        kind: "stack",
        quip: "Travelers want guides. Guides want travelers.",
        win: "Built a two-sided marketplace for travelers and tour guides from the ground up.",
      },
      {
        label: "app store review",
        kind: "clock",
        quip: "Waiting on Apple. Again.",
        win: "Shipped the product on both iOS and the web.",
      },
      {
        label: "product/market fit?",
        kind: "bug",
        quip: "Asked travelers before guessing.",
        win: "Ran customer research to steer the product toward product/market fit.",
      },
    ],
  },
  {
    world: "1-3",
    company: "Grow",
    title: "Senior Product Manager | Design Lead",
    years: "2016–2017",
    summary: "Ran product and design for a data dashboard company.",
    obstacles: [
      {
        label: "two roadmaps, one PM",
        kind: "stack",
        quip: "Dashboards on Monday, metric builder on Tuesday.",
        win: "Owned product management for both primary offerings: data dashboards and the metric builder.",
      },
      {
        label: "the 45-minute standup",
        kind: "clock",
        quip: "Twelve devs plus design. Somebody has to keep it moving.",
        win: "Managed a team of 12 developers and the entire design team, as both Senior PM and design lead.",
      },
      {
        label: "churn",
        kind: "bug",
        quip: "Users were leaving. Interviews said why.",
        win: "Ran customer interviews and in-app analytics, and prioritized features that improved retention and onboarding.",
      },
      {
        label: "the HiPPO",
        kind: "hippo",
        quip: "Highest Paid Person's Opinion. Wild in the boardroom.",
        win: "Partnered with the CEO, CTO and VP of Product on company-wide strategy and roadmap.",
      },
    ],
  },
  {
    world: "1-4",
    company: "SignGlasses",
    title: "Head of Product / CTO",
    years: "2018–2020",
    summary:
      "Scaled a Deaf and Hard of Hearing accessibility platform from concept to nationwide adoption at major universities and corporations.",
    obstacles: [
      {
        label: "no wifi",
        kind: "barrier",
        quip: "Captions that still work in airplane mode.",
        win: "Invented and prototyped an offline captioning system using ML-driven audio fingerprinting, and secured a granted patent.",
      },
      {
        label: "procurement",
        kind: "stack",
        quip: "The final boss of enterprise sales.",
        win: "Landed contracts with NBC Universal and other large organizations.",
      },
      {
        label: "“just one more feature”",
        kind: "bug",
        quip: "Research said no. Retention said thanks.",
        win: "Directed the full product lifecycle, using deep user research to refine the roadmap and improve retention.",
      },
      {
        label: "too many hats",
        kind: "clock",
        quip: "Strategy in the morning, Figma by night.",
        win: "Balanced strategic leadership with hands-on design and prototyping of accessibility-focused experiences.",
      },
    ],
  },
  {
    world: "1-5",
    company: "Conveyor",
    title: "Principal Product Manager, Network",
    years: "2020–2022",
    summary:
      "Hired to execute the CEO's vision for a B2B security trust network, owning strategy, roadmap and delivery.",
    obstacles: [
      {
        label: "cold start",
        kind: "stack",
        quip: "A network of zero is a lonely network.",
        win: "Grew the platform from zero to 3,000+ B2B connections in one year.",
      },
      {
        label: "the enterprise sales cycle",
        kind: "clock",
        quip: "Long. Very long. Worth it.",
        win: "Brought more than 30% of the Fortune 500 onto the network.",
      },
      {
        label: "untested assumptions",
        kind: "bug",
        quip: "A fake door is cheaper than a real one.",
        win: "De-risked initiatives with usability testing, surveys, fake-door tests and concierge tests.",
      },
      {
        label: "five teams, five roadmaps",
        kind: "barrier",
        quip: "Got everyone rowing in the same direction.",
        win: "Aligned sales, marketing, engineering and design to drive impact.",
      },
    ],
  },
  {
    world: "1-6",
    company: "Fresh Concept",
    title: "Owner, Product Development Agency",
    years: "2022–now",
    summary:
      "Partners with startups and growth-stage companies to design, launch and scale SaaS, marketplace and AI products.",
    obstacles: [
      {
        label: "hallucinations",
        kind: "bug",
        quip: "Turns out LLMs love to improvise.",
        win: "Built an AI platform for executives: a fine-tuned LLM agent that gathers employee insights, follows up with contextual prompts and surfaces recommendations.",
      },
      {
        label: "context window full",
        kind: "stack",
        quip: "Retrieve it, don't stuff it.",
        win: "Developed a RAG system for contextual retrieval across multiple APIs to power AI-driven decisions.",
      },
      {
        label: "Friday deploy",
        kind: "fire",
        quip: "Healthcare in multiple states. Bring a fire extinguisher.",
        win: "Built a nationwide blood lab and mobile phlebotomy platform. Multi-state adoption in year one, and the company was acquired.",
      },
      {
        label: "scope creep",
        kind: "barrier",
        quip: "Spotted it from a mile away.",
        win: "Acted as lead PM, designer and technical partner on zero-to-one builds, owning execution end to end.",
      },
    ],
  },
];
