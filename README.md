# Vishwa Mamidi — Junior Golf Recruit Profile

A professional recruit showcase website with secure email OTP admin login.

## Project structure

```
vishwa-golf-profile/
├── public/
│   ├── index.html          ← The full website (HTML)
│   └── assets/
│       ├── style.css       ← All styles
│       └── app.js          ← Frontend logic (OTP flow, admin mode)
├── server/
│   └── index.js            ← Node.js/Express backend (OTP API)
├── .env.example            ← Environment variable template
├── .gitignore
└── package.json
```

---

## Local development (quick start)

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
```
Open `.env` and fill in your values (see below).

### 3. Start the server
```bash
# Production
npm start

# Development (auto-restarts on changes)
npm run dev
```

### 4. Open in browser
```
http://localhost:3000
```

---

## Environment variables (`.env`)

| Variable           | Description                                          |
|--------------------|------------------------------------------------------|
| `PORT`             | Port to run the server on (default: `3000`)          |
| `ADMIN_EMAIL`      | The only email address that can log in as admin      |
| `SENDGRID_API_KEY` | Your SendGrid API key (see SendGrid setup below)     |
| `FROM_EMAIL`       | Verified sender email in your SendGrid account       |

---

## Activating SendGrid email (when ready)

1. Sign up at [sendgrid.com](https://sendgrid.com) (free tier: 100 emails/day)
2. Go to **Settings → API Keys → Create API Key**
   - Name: `vishwa-golf-profile`
   - Access: Restricted → Mail Send → Full Access
3. Copy the key and paste it into `.env` as `SENDGRID_API_KEY`
4. Go to **Settings → Sender Authentication → Single Sender Verification**
   - Create a sender with the email you want to send from
   - Set `FROM_EMAIL` in `.env` to match

Until `SENDGRID_API_KEY` is set, OTP codes are printed to the server console for development use.

---

## Deployment options

### Option A — Render (recommended, free tier)

1. Push this project to a GitHub repository
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Set:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
5. Add environment variables in the Render dashboard
6. Deploy — Render gives you a free `https://your-app.onrender.com` URL

### Option B — Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo
3. Add environment variables in the Variables tab
4. Railway auto-detects Node.js and deploys

### Option C — Firebase (Hosting + Cloud Functions)

The Express API is wrapped as a Cloud Function so it can run behind Firebase Hosting.

1. Install the CLI and log in:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
2. Create a project at [console.firebase.google.com](https://console.firebase.google.com) (or use an existing one), then put its project ID into `.firebaserc` (replace `REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID`).
3. Set the function's environment variables (SendGrid key, admin email, from email):
   ```bash
   firebase functions:secrets:set SENDGRID_API_KEY
   firebase functions:config:set admin.email="vmachavarapu@gmail.com" sendgrid.from_email="noreply@yourdomain.com"
   ```
   Or simplest: set them as plain env vars for 2nd-gen functions via `firebase functions:secrets:set` for the API key, and pass `ADMIN_EMAIL` / `FROM_EMAIL` through `functions/.env` (not committed) for non-secret values.
4. Deploy:
   ```bash
   firebase deploy
   ```

How it's wired:
- `firebase.json` routes `/api/**` requests to the `api` Cloud Function and serves everything else as static files from `public/`.
- `functions/index.js` requires the Express app and exposes it via `functions.https.onRequest(app)`.
- The `predeploy` hook in `firebase.json` copies `server/` into `functions/server/` and runs `npm install` in `functions/` before each deploy, so `server/index.js` stays the single source of truth — no code duplication to maintain by hand.

### Option D — VPS / DigitalOcean

```bash
# On your server
git clone your-repo
cd vishwa-golf-profile
npm install
cp .env.example .env
nano .env   # fill in values

# Run with PM2 (keeps it alive)
npm install -g pm2
pm2 start server/index.js --name "golf-profile"
pm2 save
pm2 startup
```

Use Nginx as a reverse proxy to serve on port 80/443:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Admin login flow

1. Visit the site — a login overlay appears automatically
2. Enter `vmachavarapu@gmail.com`
3. A 6-digit OTP is sent to that email via SendGrid
4. Enter the code → admin mode unlocks
5. All fields become editable inline (gold dashed underlines)
6. Click **"Save changes"** or **"Log out"** in the top bar

**Security notes:**
- OTPs expire after 10 minutes
- Max 5 incorrect attempts before the code is invalidated
- Rate-limited to 5 OTP requests per 15 minutes per IP
- Only `ADMIN_EMAIL` can receive codes (all other emails silently ignored)

---

## Customising the profile

All content is editable through the admin panel — no code changes needed. For structural changes:

- **Colors / fonts:** `public/assets/style.css` (CSS variables at the top)
- **Profile data:** `public/index.html` (initial values in the HTML)
- **Server logic:** `server/index.js`

---

## Tech stack

| Layer    | Technology                    |
|----------|-------------------------------|
| Frontend | HTML5, CSS3, Vanilla JS       |
| Backend  | Node.js, Express              |
| Email    | SendGrid (via `@sendgrid/mail`)|
| Security | express-rate-limit, crypto    |
