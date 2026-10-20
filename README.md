# ChannelScope — YouTube Channel Intelligence

A responsive, dark-mode analytics website for exploring **public YouTube channel data**. Built with React + Vite, a Cloudflare Worker, and public YouTube Data API access. No paid service or database is required for the starter.

## Version 0.1 features

- Look up a public channel by `@handle`, `youtube.com/@handle`, or `/channel/UC...` ID.
- See current public subscriber count, cumulative channel views, and public video count.
- Chart current view totals for the **12 most recent accessible videos** (not view history).
- Explore the last **up to 30 accessible uploads**, their views, public likes/comments, and upload weekdays.
- Compare a second channel's public data with the same sampling method.
- Get transparent, rule-based insights and export a CSV of recent videos.
- Explore fictional **demo data** without an API key.
- Keep your API key on the server; never put it in frontend code.

## Requirements

- Node.js 20+
- A free Cloudflare account to deploy frontend + Pages Functions.
- A Google Cloud project with YouTube Data API v3 enabled and a Google API key for live data.

## Get the project running locally (demo mode)

```bash
npm install
npm run dev
```

Visit the URL printed by Vite (normally http://localhost:5173). The default landing page is demo data. Live lookup requires a Pages Functions runtime; `npm run dev` alone only runs Vite.

## Test the actual API locally

1. Copy `.dev.vars.example` to `.dev.vars`.
2. In `.dev.vars`, set `YOUTUBE_API_KEY=your_key_here` (do not commit it).
3. Run:

```bash
npm run dev:full
```

This builds the React site then starts the local Cloudflare Pages runtime (normally at http://localhost:8788). Refresh/rebuild after changing frontend code. For live frontend hot reloading, run `npm run dev` separately for demo/visual development.

## Create your free YouTube API key

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or choose a project.
3. Go to **APIs & Services → Library** and enable **YouTube Data API v3**.
4. Go to **APIs & Services → Credentials**, create an **API key**.
5. Restrict the key to **YouTube Data API v3**. This app calls Google from a Cloudflare Function, so browser HTTP-referrer restrictions on the key won't work. Consider other restrictions supported for your deployment.
6. Keep the key private and add it to Cloudflare as an **encrypted secret**; never add it to GitHub.

Google Cloud project billing and quotas are your responsibility. The starter makes three inexpensive endpoint calls per uncached channel lookup (channels, playlistItems, videos). It avoids `search.list` entirely by accepting handles and channel IDs. Current quotas and terms: [YouTube API docs](https://developers.google.com/youtube/v3/getting-started).

## Deploy on Cloudflare Pages from GitHub

1. Create a new GitHub repository, suggested name: `youtube-channel-intelligence`.
2. Upload all project files into the root of that repo (not the parent folder). Leave `.dev.vars` and `node_modules` OUT of GitHub.
3. Sign in to [Cloudflare](https://dash.cloudflare.com/), go to **Workers & Pages** and create a **Pages** project connected to your GitHub repository.
4. Set these build settings:
   - **Framework preset:** Vite (or None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/`
5. In the Pages project go to **Settings → Variables and Secrets**. Add `YOUTUBE_API_KEY` as an **encrypted secret**, applied to Production (and Preview if needed).
6. Redeploy after setting the secret. Pages detects `/functions/api/channel.js` as a server-side endpoint.
7. Visit your free `*.pages.dev` URL. Every subsequent GitHub push will build and deploy automatically.

**Important:** Use Git-connected Pages deployment rather than a drag-and-drop static upload, because this project requires a server-side Function for secure API requests.

## Public data limitations

- **Demo mode is fabricated** and clearly labeled. Do not confuse its numbers with live data.
- Public subscriber counts can be rounded or hidden.
- A sample of recent accessible videos is *not* an all-time top-video ranking.
- Public view totals for individual videos are cumulative and not a historical time series.
- Like and comment counts may be unavailable. The "engagement proxy" in this app is `(likes + comments) / views` on videos where all three public counts exist. It is not the same as retention, impressions CTR, or YouTube Studio analytics.
- YouTube Data API quotas and policies are subject to change. The app caches successful results at the edge for ~15 minutes when supported, but popular public sites may need abuse controls and rate limiting.
- Some types of historical data, private analytics, and channel search by name are intentionally out of scope for the free starter.

## Project structure

```text
src/main.jsx              Dashboard interface and analytics
src/styles.css            Responsive dark design
src/demoData.js           Clearly fictional example channel
functions/api/channel.js Secure YouTube API proxy, input validation & caching
index.html                Vite entry point
vite.config.js            Vite setup
```

Built as an independent hobby/portfolio project. Not affiliated with or endorsed by YouTube or Google.


## AI Creator Advisor

Open **AI Creator Advisor** from the navigation after analyzing a YouTube channel, then choose **Generate my plan**. The report provides observations grounded in a recent public-video sample, three prioritized measurable content experiments and three video ideas with hooks. Use **Copy plan** to copy the report.

### Free mode (no additional secrets)

**This feature works immediately using the existing YouTube API integration.** Without a generative AI key, the endpoint computes a transparent, deterministic report and labels it **FREE DATA-DRIVEN MODE**. It does not claim to be AI-generated.

### Optional generative AI (Groq free plan)

1. Create a free plan/API key at https://console.groq.com/keys. Do not opt into a paid plan.
2. In Cloudflare, open Workers & Pages → channelscope → Settings → Variables and Secrets.
3. Add an encrypted **Secret** named **GROQ_API_KEY** with your Groq key. Keep your **YOUTUBE_API_KEY** unchanged. Apply/deploy the secret change.
4. Deploy the latest GitHub main branch if necessary. In the Advisor, select Generate my plan. A successful generative report displays **AI-GENERATED**.
5. Optionally set the Cloudflare variable **GROQ_MODEL** to a supported model ID; the default is **openai/gpt-oss-20b**.

Groq's free-tier rate limits can change. If its API is unavailable or rate-limited, the built-in data-driven report takes over and says so. A paid AI provider is never required to use ChannelScope.

**Privacy and limitations:** The browser sends only currently analyzed public channel information (up to 30 public videos) to the Worker. When optional AI is enabled, public channel metadata and a subset of those videos are passed to Groq. No private YouTube Studio data is accessed. Public video views are snapshots, affected by video age; neither mode can see retention, impressions, click-through rate, revenue, or historical subscriber growth. The plan consists of experiments, not guarantees.

### Local checks

Run **npm test**, then **npm run build**. For local backend testing, configure a git-ignored .dev.vars file based on .dev.vars.example and run **npm run dev:full**. The new POST /api/advisor route operates alongside the unchanged GET /api/channel route.


## AI Video Optimizer — titles, description, hooks and relevant hashtags

Select **AI Video Optimizer** in ChannelScope's sidebar. This independent tool helps you plan the next **Video / Short / Live stream** using your title/topic, an optional description, target audience and writing tone. You can also load a public recent upload as a starting point.

Select **Optimize my video** to get:

- **Three title drafts**, each individually copyable, with honest accurate wording.
- **One ready-to-copy description** that explains the video before people click “Show more”.
- **Two opening hooks** for the first seconds of the upload or livestream.
- **Three recommended hashtags** tied to the specific topic, platform or niche, plus up to **two optional alternatives**, each explained. Copy individual tags, the top three tags, all suggestions, or description + top three tags in one click.
- **Copy full publishing pack** for editing in YouTube Studio.

### How hashtag recommendations work

The main purpose is **topic relevance**. A suggested hashtag is not measured for reach, verified popularity, competition, live trend status or expected views. Only keep tags that describe the actual uploaded content. Prefer a small set of truly relevant hashtags, avoid unrelated tags and generic promises like \`#viral\`, and don't copy unrelated alternatives. YouTube currently shows up to three of the description's hashtags near the title and ignores **all** hashtags on a video when it has **more than 60**; this is a platform limit, **not** our recommendation. YouTube states that titles, thumbnails and descriptions matter more for discovery than ordinary video tags, which are separate from hashtags.

Official guidance:
- https://support.google.com/youtube/answer/6390658 (hashtag rules)
- https://support.google.com/youtube/answer/12948449 (video descriptions)
- https://support.google.com/youtube/answer/146402 (ordinary video tags vs. important discovery metadata)

### Cost and deployment

No additional API key is required: the optimizer uses the existing encrypted \`GROQ_API_KEY\` on the Cloudflare Worker to draft tailored suggestions, within its free-tier limits. On a missing key or API failure, it offers a clearly labeled **FREE DRAFT MODE** with conservative, topic-based fallback tags and titles, without claiming generative AI. The backend route is **POST /api/video-optimizer**; it does not modify existing \`/api/channel\` or \`/api/advisor\` behavior.

Use \`npm test\` and \`npm run build\` to validate changes; GitHub Actions runs both automatically. There are no paid image-generation endpoints in this project.


### YouTube URL analysis (Video Optimizer)

You can now paste a **public YouTube watch, live, Shorts, embed or youtu.be link** directly into **AI Video Optimizer → Analyze an existing YouTube upload**. Choose **Load video** to fill the editable title, description, format, and original-video preview. Then select **Optimize my video**. You can also paste a URL directly into the **Video title or topic** field and click Optimize; ChannelScope loads the public video metadata before using the AI.

Supported URLs include:
- https://www.youtube.com/watch?v=inPa2Ve-vgI
- https://youtu.be/inPa2Ve-vgI
- https://www.youtube.com/live/inPa2Ve-vgI?si=example
- https://www.youtube.com/shorts/inPa2Ve-vgI
- Bare 11-character IDs in the dedicated URL input

**Data sources and limitations:** Only the YouTube Data API v3 \`videos.list\` endpoint is called with the ID extracted from the link; ChannelScope does not fetch arbitrary URLs or scrape/transcribe the video. Public metadata includes the video title, description, channel name, publication date and livestream information where available. It does **not** include the footage, transcript, watch-time, retention, impressions or private analytics. The description is capped to 650 characters for the optimizer, and you can edit the prefilled details before generating suggestions. Livestream format is inferred from \`liveStreamingDetails\` / \`liveBroadcastContent\`; Shorts are inferred from explicit \`/shorts/\` links only (the regular API does not reliably identify Shorts). Creators can always change the format manually.

This uses the existing \`YOUTUBE_API_KEY\`, one inexpensive \`videos.list\` lookup for uncached videos, and Cloudflare edge caching for 15 minutes where supported. No extra paid provider or API key is required. The backend is \`GET /api/video?input=<YouTube URL>\`. If a video is private/deleted/unavailable, the API key or YouTube quota is unavailable, or the URL is not recognized, the editor shows an error and remains usable for manual video descriptions.

AI suggestion text is deliberately constrained to the supplied public metadata and creator edits. It should not claim to have watched videos or invent unlisted gameplay outcomes, tutorials, tactics or channel names. Treat generated text as **draft publishing copy that the creator must verify**, not a substitute for watching the content.


### Handling incomplete Groq replies and sparse video descriptions

AI Video Optimizer keeps useful Groq suggestions if the model returns valid but partially incomplete JSON: missing titles, hooks, descriptions, or topic-relevant hashtags are filled from the **free, deterministic publishing pack**, and the results are labeled **AI + TEMPLATES**. Fully valid responses show **AI-GENERATED**; unusable or malformed replies show **FREE DRAFT MODE** with a clear failure message. This reduces unnecessary loss of useful AI content, but the free Groq service can still sometimes be rate-limited or return malformed content.

When a loaded YouTube video's description is composed mainly of hashtags or links, ChannelScope visibly warns that there isn't enough factual detail for specific gameplay advice. The fallback description acknowledges missing details rather than copying a wall of hashtags or inventing events. AI prompts explicitly prohibit claims based on footage, transcripts, or private analytics not supplied by the creator.

Only hashtags supported by the video's supplied topic, description, or format should be carried over from a model response. Unrelated tags such as claimed tactics for an otherwise undescribed livestream are excluded. Creators should always verify drafts before uploading.


### Video Optimizer: title accuracy and specific-hashtag prioritization

The publishing pack now **prioritizes game/series/platform hashtags** before one matching niche/format hashtag, where available. For a Call of Duty Modern Warfare livestream, it prefers \`#CallOfDuty\`, \`#ModernWarfare\`, and \`#GamingLive\` over generic \`#Gaming\` or \`#LiveStream\`; more broadly relevant suggestions remain optional. These are *relevance heuristics*, never verified trend, traffic, or ranking information.

Gaming titles avoid "explained", "strategy", "breakdown", "guide", and similar promises unless the video brief actually describes a tutorial or explanation. Legitimate tutorials still receive educational titles. A server-side draft guard also rejects selected unsupported descriptions and spoken hooks (e.g., invented weapon loadouts or gameplay mechanics), falling back to wording grounded in the supplied title and creator-entered description. When a draft has been corrected this way, it is labeled **AI + TEMPLATES**, not fully AI-generated.

This guard is a **conservative heuristic, not fact verification**: it cannot watch the footage or prove the video title/description truthful. Review all generated copy before publishing, especially for sensitive topics or unknown video content.


## Content Opportunity Finder — free creator growth research

The **Content Opportunities** sidebar page analyzes the same public channel sample already loaded by ChannelScope (up to 30 recent accessible uploads). Select **Find opportunities** to produce:

- **Recurring title themes:** Named games, subjects and recurring keywords grouped from public video titles. A theme needs at least two matching uploads. Each sample video is assigned to at most one group; unmatched uploads are kept separately. This is a heuristic, not YouTube's own topic classification.
- **Topic performance context:** Count of uploads and median *cumulative* public views in each theme, compared to the channel's sampled median. Shows representative videos and sample sizes, not causal explanations or predicted growth. Older videos have had longer to accumulate views and no age-matched snapshots are available.
- **Upload-length comparison:** Counts and sampled median views for durations of up to three minutes, longer than three minutes and unknown. **Duration does not prove YouTube Shorts status**, so the page labels videos "short-length", not "Shorts".
- **Three next-video experiments:** Proposed topics, opening hooks, reasons for testing, and a sensible metric such as views after the same number of days since publishing. **Use in Video Optimizer** carries a suggestion into the existing title/description/hashtag workflow, where creators supply actual details before publishing.

This route is \`POST /api/opportunities\`. The deterministic topic analysis and evidence-driven idea templates work without any model key. If \`GROQ_API_KEY\` exists, optional Groq-generated ideas must use a theme name found in the actual public sample; on quota limits, invalid output or unavailable credentials, the tool returns a clearly labeled **FREE DATA-BASED IDEAS** result. **No new keys or paid API services** are required.

### Final Video Optimizer accuracy updates

Livestream and gameplay titles continue to avoid unwarranted educational claims. Server-side heuristics now also reject unsupported promises about "cinematic moments", "intense action" or similar unseen footage just because the creator selected a cinematic *writing style*. For a game stream involving an in-game attack, a bare tag like \`#SeoulBombing\` could be mistaken for real news; it is omitted in favor of accurate game/series and gaming-format hashtags when relevant.

These safeguards are approximations and cannot fact-check actual footage. They do **not** measure actual trending hashtags, search volume, impressions, retention or click-through rate. Users must review all generated titles and descriptions before publishing.


## Content Opportunities 2.0 — explainable recommendations

Topic names prioritize recognized games/series instead of overlapping hashtags or single generic words. For example \`Cricket 26\` videos with \`#cricketlover\` remain in the same \`Cricket 26\` theme, and \`007 First Light\` is recognized as a game rather than a topic called \`Light\`. Each video belongs to **one** group; an "Other sampled topics" group preserves the remaining sample.

Every recommendation includes **Why this idea?**, a link to an actual upload in the sampled channel data, and its public lifetime-view count. Groq's creative suggestion is accepted only when it identifies an existing topic *and* a real supporting video ID from that topic. Unsupported/unrelated/hype ideas fall back to deterministic, source-linked suggestions. The reason and metrics are written by the deterministic backend from the actual sample, not by Groq.

**Fair comparisons:** ChannelScope never compares the day-seven views of a new upload with *lifetime* medians from older videos. The UI reports descriptive lifetime medians separately and recommends recording seven-day views in YouTube Studio to compare with **other seven-day** results (if available). It does not claim that it can read such historical snapshots from the public YouTube API. A small, single-timepoint sample cannot establish demand, video retention, expected view growth or cause.


## Instagram Studio — Bios and Hashtags (free-tier drafting)

**Instagram Studio** is now a separate sidebar page. It works immediately, **without searching for or connecting a YouTube channel**. The YouTube channel-search row and demo-data notice are hidden while this tab is open.

### Bio Generator
1. Select **Instagram Bio**.
2. Describe yourself, your work, or your content in your own words (minimum 8 characters). Optionally specify your profile type (creator, personal, business), profile name, audience, and preferred writing tone.
3. Select **Generate Instagram bios** to receive three distinct bios, each checked to stay within **150 Unicode code points** including spaces and line breaks. Copy any bio directly to edit/paste in Instagram.

Generated bios are drafts, not verified identity or credentials. The validator rejects common invented claims such as unmentioned certifications, awards, or follower milestones.

### Instagram Hashtag Generator
1. Select **Hashtag Generator** and choose Post or Reel.
2. Describe the content and optional audience, then select **Find relevant hashtags**.
3. Review up to five **recommended** tags and three **alternative** niche or topic tags, each with a short explanation. Copy one tag, the recommended set or all tags.
4. Remove anything inaccurate. Tags are based on the provided description, **not** live Instagram trends, measured search volumes, hashtag competition, follower demographics, ranking scores, or promises of more reach.

### Free by default

No Instagram login, Instagram API token, image generation, social account permissions, or new paid service is necessary. The new endpoint is **POST /api/instagram** and uses the **existing optional \`GROQ_API_KEY\`** on the Cloudflare Worker, subject to any Groq free-tier limits. Without a key, or when the model is unavailable, Instagram Studio still produces clearly labeled **FREE DRAFT MODE** suggestions from the creator's provided description. Partial AI output may show **AI + TEMPLATES**.

The page only drafts text; it **does not post**, connect to Instagram or collect private Instagram statistics. Any submitted text may be sent to Groq when AI is enabled. Verify the result before publishing. ChannelScope is an independent project and is not affiliated with Instagram or Meta.

Validate with \`npm test\` and \`npm run build\`. Cloudflare deploys the current \`main\` branch through the existing Worker integration; no new secret is required.


## Instagram Studio 2.0 — Caption Generator and safer hashtag relevance

Instagram Studio now offers **three tools on the same page**:

- **Bio Generator:** three copy-ready bios (150-character validation), unchanged.
- **Caption Generator:** describe the real photo, post, or Reel, pick Friendly, Professional, Bold, or Minimal, and create **three distinct captions**. Each comes with a short set of topic-matched hashtags. Copy either the caption alone or caption + hashtags in one click. No image upload, visual analysis, or Instagram login is needed.
- **Hashtag Generator:** adds semantic de-duplication and better subject/location checks. For “Halloween decoration in Plano,” it rejects \`#HalloweenDIY\` unless the description confirms a DIY craft; \`#PlanoEvents\` unless it really describes an event; and \`#PlanoTexas\` unless Texas is in the brief. It also avoids redundant duplicates such as \`#HalloweenPlano\` and \`#PlanoHalloween\`.

**Endpoint:** the existing \`POST /api/instagram\` now accepts \`kind: "caption"\`; it continues to support \`kind: "bio"\` and \`kind: "hashtags"\`. Captions and tag suggestions use the existing optional Groq free-tier key and explicitly labeled free templates if the provider is missing or rate-limited. Partial valid output is labeled AI + TEMPLATES. No new services, credentials, or subscription costs.

**Truthful content:** captions are draft text; they must not imply unseen activities, organized events, sponsorships, homemade decorations, or achievements not mentioned by the creator. The server applies conservative validation in addition to the model prompt, but all AI output needs review before posting. Hashtag relevance is heuristic, not measured trend popularity, Instagram hashtag reach, or guaranteed follower growth.


## Social Publishing Assistant — one description, two platforms

Open **Social Publishing** from the sidebar. It is separate from YouTube channel research and requires **no YouTube or Instagram sign-in**. Enter one factual description of your video or planned Short, with optional working title, intended audience, and tone. Select **Generate both drafts**.

The results include:

- **Instagram Reel:** a social, conversational caption and up to five relevant hashtags, with buttons to copy the caption or the complete Instagram pack.
- **YouTube Short:** an independently written, natural title (up to 100 Unicode characters), an honest Short description, a first-seconds hook, and relevant hashtags including \`#Shorts\`. Copy the title or complete YouTube pack.
- **Copy both platform drafts:** combine Instagram and YouTube text in a labeled clipboard document.

Uses **POST /api/social-pack**, using the already-configured optional Groq free-tier key. Without Groq, the system returns free platform-specific templates. Incomplete/unverified Groq data is partially salvaged and clearly labeled as **AI + TEMPLATES**; errors or rate limits fall back without leaking secrets. No platform publishing, scraping, user-account access, extra subscription, or trend/success data is involved.

**Caption consistency and integrity:** Instagram Caption Generator and Hashtag Generator now share the same deterministic top-five hashtags for an identical brief. Groq can provide additional alternatives in Hashtag Generator but cannot displace the canonical five. Backend text validation rejects first-person claims such as "I just filmed this" or "We visited" unless the description clearly says the creator filmed or visited. It is still a heuristic; review every generated draft before using it.


### Social Publishing 1.1 — natural, intent-aware YouTube Shorts drafts

The Social Publishing assistant now **infers the described content type** from the creator's written brief: **showcase/display**, **tutorial**, **review**, **gameplay**, or **general video**. It labels the inferred type on the YouTube Short result. The classification is heuristic and does not inspect actual footage.

The YouTube title, description and opening hook each honor that detected intent. A Halloween decoration showcase now receives neutral showcase wording rather than "Halloween Decor Ideas" or "turn your home into...", which imply a how-to tutorial. Explicitly described tutorials, reviews, and gameplay still receive appropriate wording.

The free fallback produces natural titles, correctly capitalizes recognized places (for example Plano, Texas), and avoids robotic lead-ins such as "Short video about...". The same safeguards also check Groq suggestions. They reject unsupported claims of instructional content, invented outcomes, filming/ownership, and specific unseen props such as ghosts, pumpkins or special lighting. Rejected AI fields are replaced independently with truthful free templates and labeled **AI + TEMPLATES**.

This is not factual verification and cannot see the clip itself: creators should review and edit every draft before posting. These changes do not require a new API key, paid service, social login or change to existing endpoints.


## Content Calendar — free 7-day or 30-day creator planning

Open **Content Calendar** from the sidebar, without connecting a YouTube channel or Instagram account.

1. Describe a content niche (minimum 8 characters), optionally the audience, and choose a priority: consistency, engagement, growth experiments, or education.
2. Choose **Instagram Reels**, **YouTube Shorts**, or **Mix both platforms** (alternates the platforms).
3. Choose a **7- or 30-day window**, a creator-controlled pace of **2, 3, or 5 posts/week**, and a start date.
4. Generate a schedule of specific *ideas to create*, suggested opening hooks, calls to action, and notes aligned with the chosen goal. **Fresh angles** rotates the proposed prompts.
5. Check off completed tasks locally and **Copy plan**, **Download CSV**, or **Download .ics** to import all-day planning tasks into your calendar app. The calendar export does **not** assign a posting time or publish anything.

The plan is a *draft* rather than a guaranteed reach strategy or a real-time Instagram/YouTube trend analysis. Suggestions can include experiments you must still film and verify. There are no private-platform analytics, social-media logins, storage, background tasks, posts, or mandatory paid API calls. The calendar uses POST /api/content-calendar and the **existing optional Groq free-tier key** for up to twelve more specific niche ideas; if missing, rate-limited or invalid, the full calendar still works with free templates. No additional Cloudflare secrets are needed. **The web page does not persist completions across refreshes; export the plan to keep it.**

### Social Publishing writing variety

The existing Social Publishing API now uses complementary writing functions: **title states the subject, description adds factual context, hook invites attention**, rather than repeating the same sentence in all three fields. A Halloween decor showcase retains cautious wording: a display at a home in Plano is not converted into a tutorial. AI outputs that repeat near-identical descriptions, titles, and hooks trigger safe field-level template substitutions, labeled **AI + TEMPLATES** as before. This preserves the existing free Groq integration and every existing API route.

Automated checks cover month boundaries, leap days, cadence, all-day calendar/CSV export, invalid input, and near-duplicate AI text. Tests run via npm test, followed by npm run build.

### Content Calendar 1.1 — specific ideas and honest AI status

**Better even when Groq is unavailable:** The free calendar now uses niche-aware, concrete concepts: gaming (two-game comparisons, repeatable challenges, real gameplay mechanics, viewer polls), travel, food, fitness, technology and lifestyle. A general-purpose bank covers other niches. Prompts are projects to create; they never assert that footage or results already exist. The old robotic `Topic: PS5 Gaming` hooks are gone.

**Groq quality filter:** The prompt asks for actionable concepts, varied openings and truthful prospective content, while the backend rejects generic filler such as `Spotlight one real detail`, `Here is one detail`, unrelated niche titles, and promised viral results. Remaining calendar slots use the free topic-specific prompts.

**Clear attribution:** Every calendar response reports its `generation` status: number of AI ideas, number of free ideas, and a safe plain-English reason when Groq is absent, rate-limited, or incomplete. Each card identifies its source. The UI shows this breakdown even for partially AI-assisted 30-day plans (Groq requests up to 12 ideas, with free prompts for the remainder). It does **not** expose API keys or provider response bodies. The service is optional; the same scheduling and CSV/iCal exports remain available for free.


### Content Calendar 1.2 — Groq resilience and Video Optimizer handoff

**Reliable optional AI:** Calendar generation now accepts commonly returned JSON structures (\`ideas\`, \`posts\`, \`contentIdeas\`) and labels (\`videoTitle\`, \`whatToCreate\`, \`openingHook\`, \`cta\`), including fenced JSON. For PS5/gaming or other niches, helpful concrete concepts can be accepted even if a naturally written title mentions only a challenge/comparison while the description supplies the niche. The calendar requests a smaller number of concise ideas to reduce free-tier AI response truncation. Generic/unrelated/unsupported ideas still fail validation; individual valid ideas are retained and the remaining slots use free niche-specific concepts. Failures expose only safe categories such as rate limit, invalid JSON, response structure or filtered ideas, never upstream response content or API secrets.

**Plan to publish:** Every Content Calendar card now has a **Use in Video Optimizer** action. It opens **AI Video Optimizer** with a prospective **Short** topic, planning description, suggested opening hook, and audience prefilled. The user reviews and clicks **Optimize my video** to generate the final titles, description, and hashtags (no automatic AI request on navigation). Planned ideas are explicitly labeled **not recorded footage**. No fictional demo upload titles are passed as video analytics. Instagram Reel calendar ideas can be adapted into a YouTube Short draft using this action; the optimizer remains a YouTube publishing tool.

No Instagram or YouTube authentication, additional API keys, payments, private video analysis or automatic publishing is added.


## Separated workspaces: YouTube, Instagram, and Creator Tools

ChannelScope now has a **platform switcher** at the top of its sidebar rather than a long mixed list of tools:

- **YouTube** — Overview, Video Library, Compare Channels, Creator Insights, AI Creator Advisor, AI Video Optimizer and Content Opportunities. Public YouTube search, analytics and demo-data banners only appear in this workspace (except that a planned calendar handoff opens the optimizer with its own brief).
- **Instagram** — Instagram Studio with Bio Generator, Caption Generator and Hashtag Generator. These do **not** require a YouTube channel or Instagram login.
- **Creator Tools** — Social Publishing (draft separate Instagram and YouTube Shorts copy from one brief) and Content Calendar (plan either or both platforms). These are intentionally shared instead of being duplicated or incorrectly presented as Instagram-only/YouTube-only features.

The workspace pages use stable, shareable hash URLs that work on the existing Cloudflare Worker Static Assets deployment, for example:
- `#/youtube/overview`
- `#/youtube/video-optimizer`
- `#/instagram/studio`
- `#/creator/social-publishing`
- `#/creator/content-calendar`

Browser back/forward and direct links select the matching workspace and page. Older simple hashes are still recognized. The design includes a scrollable sidebar and mobile menu, and it preserves **Content Calendar → Video Optimizer** with the planned-video context and all existing backend endpoints. No authentication, new dependencies, API keys, pricing changes or migrations are required.



### Platform-specific backgrounds (YouTube, Instagram, Creator Tools)

ChannelScope now applies an ambient background theme automatically from the selected workspace, without changing tool functionality, pricing, API calls or account connections:

- **YouTube:** deep midnight-navy with restrained coral/red and blue highlights. Each analysis/strategy page has its own very subtle secondary glow.
- **Instagram:** dark violet and soft magenta accents for Instagram Studio.
- **Creator Tools:** deep ink blue with teal-violet lighting for cross-platform Social Publishing and Content Calendar.

The atmospheric effect is made entirely with lightweight **CSS radial gradients**, a faint non-interactive grid texture near the top of each page, and scoped accent colors in the active sidebar/breadcrumb. It does not require external images, expensive motion, additional network requests or new packages. The textured overlay cannot intercept clicks; mobile uses scaled-down gradients, and reduced-transparency preferences hide the texture and retain an opaque toolbar.

Page deep links, Calendar → Optimizer handoff, and YouTube/Instagram/Creator Tools navigation continue to work.
