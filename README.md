# Vice Dispatch

An independent GTA VI fan site for official updates, creator streams, and media. The homepage includes original generated Vice City–inspired artwork and links to Rockstar’s source material. The stream guide is hand-curated. Its discovery links lead to current broadcasts on Twitch and YouTube.

## Run locally

Use Node.js 24 and run `npm ci` followed by `npm run dev`. Open [localhost:3000](http://localhost:3000).

To use the local editor, copy `.env.example` to `.env` and set `EDITOR_PASSWORD` to a generated secret. This command generates a suitable password for local or hosted use.

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Restart the dev server after setting the password and open [the editor](http://localhost:3000/editor). Local edits persist in `.local/dispatch.json` when no Blob token is set.

## Deploy on Vercel

1. [Import this GitHub repository into Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftanav29%2Fvice-dispatch). The repository already defines the static output and server functions in `vercel.json`.
2. From the Vercel project’s **Storage** tab, create and connect a **private** Blob store. Vercel adds `BLOB_READ_WRITE_TOKEN` to the connected environments.
3. Add a strong generated `EDITOR_PASSWORD` under **Settings → Environment Variables**. Enable it for Production and use a separate password for Preview if you want preview editing.
4. Deploy after the variables are connected. If Vercel already ran the first deployment before they were added, redeploy once to apply them.
5. Open `/editor` on the deployed site. Choose **Updates**, **Streams**, **Media**, or **Release info**. Add or edit an entry and select **Publish**. Published content goes into Blob and appears on the next page load without a code change or redeploy.

The hosted editor requires both credentials. Keep them in Vercel, outside Git. Production and Preview content use separate Blob paths. A deployment can serve the bundled starter content before the editor is configured.

## Checks

Run `npm run build` to check JavaScript syntax, the artwork and fonts, and the starter feed schema.

Barlow and Barlow Condensed are distributed under the [SIL Open Font License](public/assets/OFL-Barlow.txt). Grand Theft Auto VI is a Rockstar Games title. Vice Dispatch is an independent fan project.
