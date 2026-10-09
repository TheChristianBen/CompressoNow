import type { Message, SampleChat, GroundTruthItem } from "@/core/schema";

function msg(
  id: number,
  day: number,
  hour: number,
  min: number,
  sender: string,
  text: string,
  replyTo: string | null = null,
  threadId: string | null = null,
): Message {
  const base = new Date(2026, 9, 6, 9, 0, 0).getTime();
  const ts = base + day * 86400000 + hour * 3600000 + min * 60000;
  return {
    id: `sample-${id}`,
    timestamp: ts,
    sender,
    text,
    replyTo,
    threadId,
    sourceFormat: "whatsapp",
    originalRaw: undefined,
  };
}

function buildSampleMessages(): Message[] {
  const M: Message[] = [];
  let n = 1;
  const add = (day: number, h: number, m: number, s: string, t: string, r?: string | null, th?: string | null) => {
    M.push(msg(n++, day, h, m, s, t, r ?? null, th ?? null));
  };

  // Day 0 (Oct 6) - Project kickoff
  add(0, 9, 5, "Sarah", "Morning everyone! Let's start the Atlas project sync. We have 2 weeks to ship the dashboard.");
  add(0, 9, 7, "Mike", "Good morning! I've reviewed the brief. Looks solid.");
  add(0, 9, 8, "Priya", "Hi team! Ready to go. @Alex can you share the API docs from the previous sprint?");
  add(0, 9, 12, "Alex", "Sure @Priya, I'll send the API docs by end of day today.");
  add(0, 9, 15, "Tom", "Hey all, just joined. What's the scope here?");
  add(0, 9, 17, "Sarah", "Welcome @Tom! We're building a customer analytics dashboard. The deadline is October 20.");
  add(0, 9, 20, "Mike", "Let's go with React for the frontend. We decided on this last quarter.");
  add(0, 9, 22, "Priya", "Agreed. React it is. @Mike can you set up the repo by tomorrow?");
  add(0, 9, 25, "Mike", "Will do, repo will be ready tomorrow morning.");
  add(0, 9, 30, "Alex", "I'll also need the design assets. @Sarah can you share the Figma link?");
  add(0, 9, 32, "Sarah", "Figma link coming up. Let me finalize the color system first.");
  add(0, 9, 35, "Tom", "Should I look into the data pipeline?");
  add(0, 9, 37, "Sarah", "Yes @Tom, please review the existing pipeline and document gaps. Due by Friday.");
  add(0, 9, 40, "Priya", "I can help with the API integration. @Alex what endpoints will be ready first?");
  add(0, 9, 42, "Alex", "The /metrics endpoint should be ready by Thursday. I'll prioritize that.");
  add(0, 9, 45, "Mike", "Quick reminder: standup at 10am every day this sprint.");
  add(0, 9, 50, "Sarah", "Perfect. Let's use this channel for all updates. Decisions will be logged in the doc.");
  add(0, 10, 0, "Tom", "Sounds good. I'll start with the pipeline review now.");
  add(0, 10, 5, "Priya", "👍");
  add(0, 10, 10, "Alex", "By the way, the old API had a rate limit issue. We should fix that.");
  add(0, 10, 15, "Mike", "Good catch @Alex. Can you add that to the known issues doc?");
  add(0, 10, 20, "Alex", "Done. Added to the doc.");
  add(0, 10, 30, "Sarah", "Great start everyone. Let's reconvene at standup tomorrow at 10am.");

  // Day 1 (Oct 7)
  add(1, 10, 0, "Sarah", "Morning standup! @Mike is the repo ready?");
  add(1, 10, 2, "Mike", "Yes, repo is live. Link: github.com/team/atlas-dashboard. All of you have access.");
  add(1, 10, 5, "Priya", "Thanks @Mike! I'll clone it and start on the API service layer.");
  add(1, 10, 8, "Tom", "I finished reviewing the pipeline. There are 3 gaps: missing real-time sync, no error handling, and the transform step is slow.");
  add(1, 10, 12, "Sarah", "Good analysis @Tom. Can you fix the error handling first? That's critical. By Wednesday please.");
  add(1, 10, 15, "Tom", "On it. I'll have error handling fixed by Wednesday EOD.");
  add(1, 10, 20, "Alex", "Update on the API: /metrics is about 60% done. Should be ready by Thursday as promised.");
  add(1, 10, 25, "Sarah", "Nice. @Alex don't forget to also fix the rate limit issue we discussed yesterday.");
  add(1, 10, 28, "Alex", "Right, I'll tackle the rate limit after /metrics. Probably Friday.");
  add(1, 10, 30, "Mike", "I've set up the CI/CD pipeline. Every PR will auto-deploy to staging.");
  add(1, 10, 35, "Priya", "Awesome. @Sarah did you share the Figma link yet?");
  add(1, 10, 38, "Sarah", "Sorry, forgot! Here it is: figma.com/atlas-design. The color system is finalized.");
  add(1, 10, 40, "Sarah", "Let's go with a blue and gray palette. Clean and professional.");
  add(1, 10, 42, "Mike", "Looks great. I'll start building the layout components.");
  add(1, 10, 45, "Tom", "Quick question: should we use PostgreSQL or keep the existing MongoDB?");
  add(1, 10, 48, "Sarah", "Good question. Let's decide. @Priya what do you think?");
  add(1, 10, 52, "Priya", "I'd go with PostgreSQL. Better for analytics queries. We agreed on this in the architecture review.");
  add(1, 10, 55, "Sarah", "Finalized: PostgreSQL. @Tom please update the pipeline to write to Postgres.");
  add(1, 10, 58, "Tom", "Got it. I'll start the Postgres migration. Deadline: end of next week.");
  add(1, 11, 0, "Alex", "I need the Postgres connection string. @Tom can you share it once it's set up?");
  add(1, 11, 3, "Tom", "Will do @Alex.");
  add(1, 11, 10, "Mike", "Reminder: code review for the layout PR is needed. @Priya can you review?");
  add(1, 11, 15, "Priya", "Yes, I'll review the layout PR this afternoon.");
  add(1, 11, 30, "Sarah", "Don't forget: stakeholder demo is on October 18. We need a working prototype by then.");
  add(1, 11, 35, "Mike", "That's tight. Let's make sure the core charts are working by October 16.");
  add(1, 11, 40, "Priya", "I'll prioritize the chart components. @Mike can you build the data table component?");
  add(1, 11, 43, "Mike", "Sure, data table by Monday.");
  add(1, 11, 50, "Alex", "Hey @Priya, the API will return JSON. Let me know if you need a different format.");
  add(1, 11, 52, "Priya", "JSON is fine. Just make sure the response includes pagination metadata.");
  add(1, 11, 55, "Alex", "Will add pagination. Done.");
  add(1, 14, 0, "Tom", "Quick update: error handling fix is halfway done. On track for Wednesday.");
  add(1, 14, 10, "Sarah", "Great work @Tom. Keep it up.");
  add(1, 14, 20, "Mike", "Layout components are coming along. I'll push the first batch by EOD.");
  add(1, 14, 30, "Priya", "Reviewing the layout PR now. Looks clean so far.");
  add(1, 14, 45, "Priya", "Layout PR approved. Merged.");
  add(1, 14, 50, "Mike", "Thanks @Priya!");
  add(1, 15, 0, "Alex", "Question for the group: should we implement caching on the API?");
  add(1, 15, 5, "Sarah", "Yes, let's add Redis caching. @Alex can you look into that?");
  add(1, 15, 8, "Alex", "Will do. I'll research Redis integration. Probably next week though.");
  add(1, 15, 30, "Tom", "Postgres is set up on the dev server. Connection string in the shared vault.");
  add(1, 15, 35, "Alex", "Got it, thanks @Tom.");
  add(1, 16, 0, "Sarah", "End of day update: we're on track. Good progress everyone.");
  add(1, 16, 10, "Mike", "🚀");
  add(1, 16, 15, "Priya", "See you all tomorrow at 10!");

  // Day 2 (Oct 8)
  add(2, 10, 0, "Sarah", "Standup time. @Tom how's the error handling going?");
  add(2, 10, 3, "Tom", "Almost done. Should be finished by tomorrow EOD as committed.");
  add(2, 10, 8, "Priya", "I'm starting on the chart components today. Need the /metrics API for testing.");
  add(2, 10, 10, "Alex", "I can give you a mock response now. Real API by Thursday.");
  add(2, 10, 12, "Priya", "Mock works for now. Thanks @Alex.");
  add(2, 10, 15, "Mike", "Data table component is in progress. Will push by Monday as promised.");
  add(2, 10, 20, "Sarah", "@Alex, the stakeholder demo on October 18 is coming up fast. Make sure /metrics is ready by Thursday.");
  add(2, 10, 25, "Alex", "Understood. I'm on track. Thursday EOD.");
  add(2, 10, 30, "Tom", "I noticed the Postgres migration is going to be tricky. The transform step needs rewriting.");
  add(2, 10, 35, "Sarah", "Can you handle that @Tom? What's the timeline?");
  add(2, 10, 38, "Tom", "I can do it but it'll take until end of next week. The transform rewrite is complex.");
  add(2, 10, 40, "Sarah", "That's fine, just make sure it doesn't block the demo. The demo needs charts working.");
  add(2, 10, 45, "Mike", "I just realized we need auth. Should we add login?");
  add(2, 10, 48, "Sarah", "Let's keep it simple for now. No auth for the demo. We'll add it post-MVP.");
  add(2, 10, 52, "Priya", "Agreed. No auth for demo. Let's focus on the dashboard.");
  add(2, 11, 0, "Alex", "Rate limit fix update: I found a token bucket library. Will integrate after /metrics.");
  add(2, 11, 10, "Tom", "Has anyone seen the old test suite? I can't find it in the repo.");
  add(2, 11, 15, "Mike", "It's in the legacy branch. @Tom check the 'legacy' branch.");
  add(2, 11, 20, "Tom", "Found it. Thanks @Mike.");
  add(2, 11, 30, "Sarah", "Quick decision: we need to finalize the chart library. @Priya your recommendation?");
  add(2, 11, 35, "Priya", "I recommend Recharts. Lightweight and works well with React.");
  add(2, 11, 38, "Sarah", "Finalized: Recharts. @Priya please go ahead with that.");
  add(2, 11, 40, "Priya", "Already started. Recharts it is.");
  add(2, 11, 50, "Mike", "FYI: staging is live at atlas-staging.herokuapp.com. Check it out.");
  add(2, 12, 0, "Tom", "Nice, looks good so far.");
  add(2, 12, 10, "Alex", "The staging DB is seeded with test data. Should be enough for dev.");
  add(2, 12, 20, "Priya", "I can see the test data. Working on charts now.");
  add(2, 14, 0, "Sarah", "Afternoon check-in. Any blockers?");
  add(2, 14, 5, "Tom", "No blockers. Error handling is 80% done.");
  add(2, 14, 10, "Priya", "No blockers. Charts should be ready by tomorrow for initial review.");
  add(2, 14, 15, "Alex", "No blockers. /metrics is 75% done.");
  add(2, 14, 20, "Mike", "No blockers. Data table is 50% done.");
  add(2, 14, 25, "Sarah", "Great. No blockers is good. Keep pushing.");
  add(2, 14, 30, "Tom", "Oh wait, one thing: @Alex the connection string in the vault seems expired. Can you check?");
  add(2, 14, 35, "Alex", "I'll check and regenerate it. Should be fixed by EOD.");
  add(2, 14, 40, "Tom", "Thanks. I'm blocked on the migration until it's fixed.");
  add(2, 14, 45, "Alex", "Priority: fixing the connection string now. Will update in 30 min.");
  add(2, 15, 20, "Alex", "Connection string updated. @Tom it's in the vault now.");
  add(2, 15, 25, "Tom", "Got it. Unblocked. Continuing migration.");
  add(2, 16, 0, "Sarah", "Good. Remember: demo on October 18. Core charts must work by October 16.");
  add(2, 16, 10, "Priya", "Understood. I'll have charts ready by the 16th.");
  add(2, 16, 20, "Mike", "Reminder: please update the task board before EOD. @everyone");
  add(2, 16, 30, "Tom", "Board updated.");
  add(2, 16, 35, "Priya", "Board updated.");
  add(2, 16, 40, "Alex", "Board updated.");

  // Day 3 (Oct 9)
  add(3, 10, 0, "Sarah", "Standup! @Tom error handling status?");
  add(3, 10, 3, "Tom", "Error handling is done! Completed and pushed. PR is up for review.");
  add(3, 10, 5, "Sarah", "Excellent @Tom! @Priya can you review Tom's PR?");
  add(3, 10, 8, "Priya", "Will review this morning.");
  add(3, 10, 10, "Mike", "Data table component is done. Merged to staging.");
  add(3, 10, 15, "Sarah", "Great progress @Mike.");
  add(3, 10, 20, "Alex", "/metrics API is 90% done. Just need to add the aggregation logic. Will be done by Thursday.");
  add(3, 10, 25, "Priya", "Charts are coming together. I have line charts and bar charts working with mock data.");
  add(3, 10, 30, "Sarah", "Amazing! Can I see a screenshot @Priya?");
  add(3, 10, 35, "Priya", "Will share a screenshot in a bit. Just polishing the styling.");
  add(3, 10, 40, "Tom", "Now that error handling is sorted, I'm starting the transform rewrite.");
  add(3, 10, 45, "Sarah", "Good. @Tom the transform rewrite deadline is end of next week, right?");
  add(3, 10, 48, "Tom", "Correct. End of next week, October 16.");
  add(3, 10, 50, "Alex", "FYI: I'm going to be out on Friday. Doctor's appointment. @Priya can you handle API questions?");
  add(3, 10, 55, "Priya", "Sure @Alex. I'll field API questions on Friday.");
  add(3, 11, 0, "Mike", "I'm starting on the filter sidebar. Need design specs @Sarah.");
  add(3, 11, 5, "Sarah", "Filter specs are in the Figma. Check the 'Filters' page.");
  add(3, 11, 10, "Mike", "Got it. Building the sidebar now.");
  add(3, 11, 20, "Priya", "Tom's error handling PR looks good. Approved and merged.");
  add(3, 11, 25, "Tom", "Thanks @Priya!");
  add(3, 11, 30, "Sarah", "Decision: we need to pick a date for the code freeze. Suggest October 17.");
  add(3, 11, 35, "Mike", "October 17 works. Gives us one day before the demo.");
  add(3, 11, 38, "Sarah", "Agreed. Code freeze on October 17. No new features after that, only bug fixes.");
  add(3, 11, 45, "Alex", "Makes sense. I'll make sure /metrics is fully done by the 17th.");
  add(3, 12, 0, "Tom", "Quick question for @Sarah: should I prioritize the transform rewrite over the Postgres migration?");
  add(3, 12, 5, "Sarah", "Yes @Tom. Transform rewrite first since the demo depends on it. Migration can happen after.");
  add(3, 12, 10, "Tom", "Got it. Transform first.");
  add(3, 14, 0, "Priya", "Chart screenshots: the line chart shows revenue trends, bar chart shows daily active users.");
  add(3, 14, 5, "Sarah", "These look fantastic @Priya! Exactly what I envisioned.");
  add(3, 14, 10, "Mike", "Really clean. Nice work.");
  add(3, 14, 15, "Priya", "Thanks! Still need to add the donut chart for user segments. Will do by tomorrow.");
  add(3, 14, 20, "Sarah", "Perfect. @Priya donut chart by tomorrow please.");
  add(3, 14, 25, "Alex", "Rate limit fix is going to be pushed to Friday since I'm off. Is that OK?");
  add(3, 14, 30, "Sarah", "That's fine @Alex. Just make sure it's done by Monday.");
  add(3, 14, 35, "Alex", "Will do. Rate limit fix by Monday.");
  add(3, 15, 0, "Mike", "Filter sidebar is coming along. Should be done by tomorrow.");
  add(3, 15, 10, "Sarah", "Great. @Mike can you also add a date range picker to the sidebar?");
  add(3, 15, 15, "Mike", "Sure, I'll add it. Tomorrow EOD for the full sidebar with date picker.");
  add(3, 15, 30, "Tom", "Transform rewrite update: 20% done. It's a big refactor.");
  add(3, 15, 35, "Sarah", "Keep at it @Tom. You have until the 16th.");
  add(3, 16, 0, "Sarah", "EOD check: we're in good shape. @Alex don't forget /metrics by Thursday EOD.");
  add(3, 16, 5, "Alex", "Won't forget. Thursday EOD. ✅");
  add(3, 16, 10, "Sarah", "See everyone tomorrow. Good work today!");

  return M;
}

function buildGroundTruth(): GroundTruthItem[] {
  return [
    { owner: "Alex", task: "Share API docs", category: "needsAction", keywords: ["api", "docs", "priya"] },
    { owner: "Mike", task: "Set up the repo", category: "needsAction", keywords: ["repo", "set up"] },
    { owner: "Tom", task: "Review existing pipeline and document gaps", category: "needsAction", keywords: ["pipeline", "review", "gaps"] },
    { owner: "Alex", task: "Fix rate limit issue", category: "needsAction", keywords: ["rate", "limit", "fix"] },
    { owner: "Tom", task: "Fix error handling", category: "needsAction", keywords: ["error", "handling", "fix"] },
    { owner: "Tom", task: "Update pipeline to write to Postgres", category: "needsAction", keywords: ["postgres", "pipeline", "migration"] },
    { owner: "Tom", task: "Transform rewrite", category: "needsAction", keywords: ["transform", "rewrite"] },
    { owner: "Alex", task: "Complete /metrics API", category: "needsAction", keywords: ["metrics", "api"] },
    { owner: "Priya", task: "Build chart components", category: "needsAction", keywords: ["chart", "recharts"] },
    { owner: "Priya", task: "Add donut chart for user segments", category: "needsAction", keywords: ["donut", "chart", "segments"] },
    { owner: "Mike", task: "Build data table component", category: "needsAction", keywords: ["data", "table"] },
    { owner: "Mike", task: "Build filter sidebar with date range picker", category: "needsAction", keywords: ["filter", "sidebar", "date"] },
    { owner: "Alex", task: "Research Redis caching", category: "needsAction", keywords: ["redis", "caching"] },
    { owner: "Sarah", task: "Finalize color system", category: "decisions", keywords: ["color", "figma"] },
    { owner: "", task: "Decision: React for frontend", category: "decisions", keywords: ["react", "frontend"] },
    { owner: "", task: "Decision: PostgreSQL for database", category: "decisions", keywords: ["postgres", "database"] },
    { owner: "", task: "Decision: Recharts for charts", category: "decisions", keywords: ["recharts"] },
    { owner: "", task: "Decision: Blue and gray palette", category: "decisions", keywords: ["blue", "gray", "palette"] },
    { owner: "", task: "Decision: No auth for demo", category: "decisions", keywords: ["no", "auth", "demo"] },
    { owner: "", task: "Decision: Code freeze on October 17", category: "decisions", keywords: ["code", "freeze", "october 17"] },
    { owner: "Tom", task: "Fix error handling by Wednesday", category: "deadlines", keywords: ["error", "handling", "wednesday"] },
    { owner: "Alex", task: "/metrics API by Thursday", category: "deadlines", keywords: ["metrics", "thursday"] },
    { owner: "Priya", task: "Core charts by October 16", category: "deadlines", keywords: ["charts", "october 16"] },
    { owner: "", task: "Stakeholder demo on October 18", category: "deadlines", keywords: ["demo", "october 18"] },
    { owner: "", task: "Project deadline October 20", category: "deadlines", keywords: ["deadline", "october 20"] },
    { owner: "Tom", task: "Transform rewrite by October 16", category: "deadlines", keywords: ["transform", "october 16"] },
    { owner: "Alex", task: "Rate limit fix by Monday", category: "deadlines", keywords: ["rate", "limit", "monday"] },
  ];
}

export function getSampleChat(): { messages: Message[]; groundTruth: GroundTruthItem[] } {
  return { messages: buildSampleMessages(), groundTruth: buildGroundTruth() };
}

export function getEvalSampleChats(): SampleChat[] {
  const { messages, groundTruth } = getSampleChat();

  const main: SampleChat = {
    id: "eval-sample-1",
    label: "Atlas Project Team",
    description: "A 150-message team chat with deadlines, decisions, mentions, and task assignments.",
    messages,
    groundTruth,
  };

  const mini1: SampleChat = {
    id: "eval-sample-2",
    label: "Bug Triage Chat",
    description: "Small chat with bug reports and fixes.",
    messages: [
      msg(1, 0, 9, 0, "Dev1", "We have a critical bug in the login flow. @Dev2 can you look into it?"),
      msg(2, 0, 9, 5, "Dev2", "On it. I'll fix the login bug by tomorrow."),
      msg(3, 0, 9, 10, "QA1", "I can reproduce it. Steps are in the ticket."),
      msg(4, 0, 14, 0, "Dev2", "Login bug is fixed. Completed. PR is up."),
      msg(5, 0, 14, 10, "Dev1", "Great. Let's go with the fix. Merged."),
    ],
    groundTruth: [
      { owner: "Dev2", task: "Fix login bug", category: "needsAction", keywords: ["login", "bug", "fix"] },
      { owner: "", task: "Decision: merge the fix", category: "decisions", keywords: ["merged", "fix"] },
      { owner: "Dev2", task: "Fix login bug by tomorrow", category: "deadlines", keywords: ["login", "bug", "tomorrow"] },
    ],
  };

  const mini2: SampleChat = {
    id: "eval-sample-3",
    label: "Event Planning",
    description: "Planning chat with decisions and deadlines.",
    messages: [
      msg(1, 0, 10, 0, "Organizer", "Team, we need to plan the company offsite. @Alice please book the venue by Friday."),
      msg(2, 0, 10, 5, "Alice", "I'll book the venue by Friday. Working on it."),
      msg(3, 0, 10, 10, "Bob", "Should we do catering?"),
      msg(4, 0, 10, 15, "Organizer", "Agreed. Yes, let's get catering. @Bob can you handle that? Due next Monday."),
      msg(5, 0, 10, 20, "Bob", "Sure, I'll arrange catering by Monday."),
      msg(6, 0, 12, 0, "Alice", "Venue booked! Done."),
      msg(7, 1, 10, 0, "Organizer", "Great. Finalized: the offsite is on October 25."),
    ],
    groundTruth: [
      { owner: "Alice", task: "Book the venue by Friday", category: "needsAction", keywords: ["venue", "book", "friday"] },
      { owner: "Bob", task: "Arrange catering by Monday", category: "needsAction", keywords: ["catering", "monday"] },
      { owner: "", task: "Decision: get catering", category: "decisions", keywords: ["catering", "agreed"] },
      { owner: "", task: "Decision: offsite on October 25", category: "decisions", keywords: ["offsite", "october 25"] },
      { owner: "Bob", task: "Catering by next Monday", category: "deadlines", keywords: ["catering", "monday"] },
    ],
  };

  const mini3: SampleChat = {
    id: "eval-sample-4",
    label: "Sprint Retro",
    description: "Retro discussion with action items.",
    messages: [
      msg(1, 0, 16, 0, "Lead", "Let's do our sprint retro. What went well?"),
      msg(2, 0, 16, 5, "P1", "Code reviews were faster this sprint."),
      msg(3, 0, 16, 10, "P2", "We had too many bugs in production. @P1 can you add more unit tests? By next week."),
      msg(4, 0, 16, 15, "P1", "I'll add unit tests by next week."),
      msg(5, 0, 16, 20, "Lead", "Agreed. We need better testing. Let's go with mandatory PR tests."),
      msg(6, 0, 16, 25, "P2", "Also, deployment was slow. We should optimize the CI pipeline."),
      msg(7, 0, 16, 30, "Lead", "@P2 please optimize the CI pipeline. Deadline: by Friday."),
      msg(8, 0, 16, 35, "P2", "On it. CI optimization by Friday."),
    ],
    groundTruth: [
      { owner: "P1", task: "Add more unit tests by next week", category: "needsAction", keywords: ["unit", "tests", "next week"] },
      { owner: "P2", task: "Optimize CI pipeline by Friday", category: "needsAction", keywords: ["ci", "pipeline", "friday"] },
      { owner: "", task: "Decision: mandatory PR tests", category: "decisions", keywords: ["mandatory", "pr", "tests"] },
      { owner: "P2", task: "CI optimization by Friday", category: "deadlines", keywords: ["ci", "friday"] },
    ],
  };

  const mini4: SampleChat = {
    id: "eval-sample-5",
    label: "Marketing Launch",
    description: "Product launch coordination.",
    messages: [
      msg(1, 0, 9, 0, "CMO", "The product launch is set for October 30. @Writer please finalize the blog post by Wednesday."),
      msg(2, 0, 9, 5, "Writer", "I'll finalize the blog post by Wednesday."),
      msg(3, 0, 9, 10, "Designer", "I have the launch graphics ready for review."),
      msg(4, 0, 9, 15, "CMO", "@Designer great. Can you also create social media assets? By Thursday please."),
      msg(5, 0, 9, 20, "Designer", "Sure, social media assets by Thursday."),
      msg(6, 0, 14, 0, "Writer", "Blog post is done. Completed and sent for review."),
      msg(7, 0, 14, 10, "CMO", "Excellent. Decided: we'll do a phased launch. Phase 1 on Oct 30, Phase 2 on Nov 5."),
      msg(8, 1, 10, 0, "Designer", "Social media assets are done. Finished."),
    ],
    groundTruth: [
      { owner: "Writer", task: "Finalize blog post by Wednesday", category: "needsAction", keywords: ["blog", "post", "wednesday"] },
      { owner: "Designer", task: "Create social media assets by Thursday", category: "needsAction", keywords: ["social", "media", "assets", "thursday"] },
      { owner: "", task: "Decision: phased launch", category: "decisions", keywords: ["phased", "launch", "phase"] },
      { owner: "", task: "Product launch on October 30", category: "deadlines", keywords: ["launch", "october 30"] },
      { owner: "Designer", task: "Social media assets by Thursday", category: "deadlines", keywords: ["social", "media", "thursday"] },
    ],
  };

  return [main, mini1, mini2, mini3, mini4];
}
