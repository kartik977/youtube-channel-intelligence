# ChannelScope: first-time setup (GitHub + Cloudflare)

This starter runs a **fictional demo without any API key**. After deployment, you can add a free YouTube Data API key to search live public channels.

## Step 1 — Create your GitHub repository

1. Sign in to <https://github.com/kartik977> and visit <https://github.com/new>.
2. Repository name: `youtube-channel-intelligence`.
3. Set **Public** (or Private, if preferred). **Do not** choose a README, `.gitignore`, or license; the starter includes its own files.
4. Click **Create repository**.

## Step 2 — Upload this project

### Easy way: GitHub website

1. Unzip `youtube-channel-intelligence.zip` on your computer.
2. Open the empty repository, choose **uploading an existing file**.
3. Drag **the files and folders inside** the unzipped `youtube-channel-intelligence` directory into the uploader, including the `src` and `functions` folders. Do not upload the ZIP as the only file.
4. Ensure `package.json`, `index.html`, `src/main.jsx` and `functions/api/channel.js` appear in the proper locations.
5. Commit to `main`.

### Alternative: Mac Terminal (with Git configured)

```bash
cd /path/to/unzipped/youtube-channel-intelligence
git init -b main
git add .
git commit -m "Initial ChannelScope analytics dashboard"
git remote add origin https://github.com/kartik977/youtube-channel-intelligence.git
git push -u origin main
```

## Step 3 — Deploy at no cost

1. Go to <https://dash.cloudflare.com/> and open **Workers & Pages**.
2. Create a **Pages** project and select **Connect to Git**.
3. Connect your GitHub account if needed, then choose `kartik977/youtube-channel-intelligence`.
4. Choose the **React (Vite)** preset, or manually enter:

   | Setting | Value |
   |---|---|
   | Framework | React (Vite) |
   | Production branch | `main` |
   | Build command | `npm run build` |
   | Build output | `dist` |
   | Root directory | repository root (leave blank) |

5. Click **Save and Deploy**. Open your free `*.pages.dev` website. The demo works immediately.

**Important:** Deploy using *Connect to Git*, not a static drag-and-drop deploy, because the live data endpoint is a Cloudflare Pages Function.

## Step 4 — Enable live YouTube search (optional)

1. Go to <https://console.cloud.google.com/> and create/select a project.
2. Open **APIs & Services → Library**, find **YouTube Data API v3**, and click Enable.
3. In **APIs & Services → Credentials**, create an **API key** and restrict it to **YouTube Data API v3**.
4. On Cloudflare, open the deployed Pages project and locate **Settings → Variables and Secrets** (wording may vary by dashboard version).
5. Add a secret named `YOUTUBE_API_KEY` with the exact value of your key. Set type **Secret/encrypted**, not plain text.
6. Redeploy the Pages project so the Function receives the secret.
7. Search using e.g. `@GoogleDevelopers` or a channel URL.

**Never paste an API key into the website's search box, React source files, a public GitHub repository, or this chat.**

## Local development

Node.js 20+ is required (Node.js 22 recommended).

```bash
npm install
npm run dev          # fast UI preview, with fictional demo data
npm test             # backend unit tests
```

For **live API lookup locally**, copy `.dev.vars.example` to `.dev.vars`, enter your key in `.dev.vars`, then run:

```bash
npm run dev:full     # builds React and serves the site + API, usually on :8788
```

The `npm run dev` command alone does not run Pages Functions, so live channel searches require `npm run dev:full` or the deployed website.

## Common deployment errors

- **Cloudflare deploy says “Cannot find package.json”** — the project folder was uploaded one level too deep. `package.json` must be at the repository root.
- **Site opens but shows a blank page** — check the Cloudflare build log for `npm run build` errors. Confirm output directory `dist`.
- **Search says “API key not configured”** — check Cloudflare's encrypted `YOUTUBE_API_KEY` secret; redeploy afterward.
- **YouTube API says access denied** — confirm YouTube Data API v3 is enabled and the key is restricted to that API, not another API. HTTP referrer restrictions do not work on server-side requests.
- **YouTube API says quota exceeded** — free daily quota is exhausted; continue using demo data or try on the next quota day.
- **Searching a channel name fails** — use the exact @handle or `youtube.com/channel/UC...` ID; free starter does not use expensive name search.

More details: [README.md](README.md).
