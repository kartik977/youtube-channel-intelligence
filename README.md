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
