# Counting down to Dr. Hylke

A live countdown to the PhD defence of **Hylke Hessel Kortenbosch** — Wednesday 1 July 2026, 13:00, Omnia Auditorium, Wageningen.

Two things in one tiny repo:

1. **A countdown website** (`index.html`) — a continuously ticking timer that flips to a celebration on defence day. Themed to match the invitation emails (cream + forest green + terracotta, Georgia serif, a petri-dish "signature" nodding to the *Aspergillus fumigatus* thesis).
2. **A live in-email countdown image** (`api/countdown.gif.js`) — a serverless function that renders a fresh animated GIF on every request, so you can drop a *live* countdown straight into an HTML email.

## Why Vercel and not GitHub Pages?

A genuinely live countdown **inside an email** can't use JavaScript (email clients strip it). The only way to animate a timer in an email is a GIF that is generated **server-side on each open**. GitHub Pages is static-only and can't do that. Vercel runs the little serverless function that renders the GIF — for free, with a one-click Git deploy. (Netlify, Cloudflare Pages + Workers, Render, and Railway can all do the same; Vercel is just the simplest.)

If you only want the website and don't care about the in-email animation, any static host (including GitHub Pages) will serve `index.html` fine — you'd just drop the `api/` folder.

## Deploy (about two minutes)

1. Push this folder to a new GitHub repository.
2. Go to [vercel.com](https://vercel.com), **Add New → Project**, and import the repo.
3. Accept the defaults and click **Deploy**. No configuration or environment variables are needed.
4. You'll get a URL like `https://hylke-countdown.vercel.app`.
   - Website: open that URL.
   - GIF: `https://hylke-countdown.vercel.app/api/countdown.gif`

Prefer the CLI? `npm i -g vercel` then run `vercel` in this folder.

## Put the live countdown in an email

Open `email_snippet.html`, replace both `https://YOUR-APP.vercel.app` placeholders with your deployment URL, and paste the block into the email. It shows the animated countdown and links to the full website.

```html
<img src="https://YOUR-APP.vercel.app/api/countdown.gif" width="600" alt="Countdown">
```

**Note on Outlook:** Outlook displays only the first frame of any GIF, so those readers see a correct but static snapshot. Every other major client animates it.

## Customising the GIF

The endpoint accepts optional query parameters:

| Param | Meaning | Default |
|---|---|---|
| `to` | Target instant as a UTC ISO string | `2026-07-01T11:00:00Z` (= 13:00 Amsterdam) |
| `frames` | Number of one-second frames (1–60) | `30` |

Example: `/api/countdown.gif?to=2026-07-01T11:00:00Z&frames=20`

Colours and layout live at the top of `api/countdown.gif.js` (the `C` palette) and in the `<style>` block of `index.html`.

## Local preview

- Website: just open `index.html` in a browser.
- GIF: `npm install`, then
  ```bash
  node -e "require('./api/countdown.gif.js')({url:'/api/countdown.gif?frames=4'},{setHeader(){},end(b){require('fs').writeFileSync('out.gif',b)}})"
  ```
  and open `out.gif`.

## Files

```
index.html              The live countdown website
api/countdown.gif.js    Serverless function — renders the live GIF
email_snippet.html      Copy-paste block for emails
vercel.json             Routes /api/countdown.gif to the function
package.json            Two dependencies: @napi-rs/canvas, gifenc
```

## License

MIT — see `LICENSE`.
