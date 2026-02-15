# Sacrament Meeting Agenda — Parrish Canyon Ward

A simple web app for creating, saving, and printing sacrament meeting agendas.

## Features

- **Dropdown name lists** — separate lists for Presiding/Conducting, Choristers, and Organists
- **Hymn auto-lookup** — type a hymn number and the title fills in automatically (1985 hymnal built in)
- **Custom hymns** — add new hymns from "Hymns—For Home and Church" as they're released
- **Save & recall** — agendas save to your browser's localStorage, accessible from History
- **Print-ready** — clean print preview formatted for the stand
- **Next Week** — duplicate an agenda to the following Sunday, keeping recurring names

## Deploy to Vercel

### Option 1: Push to GitHub, then connect Vercel

1. Create a new GitHub repository
2. Push this project:
   ```bash
   cd sacrament-agenda
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/sacrament-agenda.git
   git push -u origin main
   ```
3. Go to [vercel.com](https://vercel.com) and sign in with GitHub
4. Click **"Add New Project"** → Import your `sacrament-agenda` repo
5. Vercel auto-detects Vite — just click **Deploy**
6. Your site will be live at `sacrament-agenda.vercel.app` (or a custom domain)

### Option 2: Deploy directly with Vercel CLI

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. From the project folder:
   ```bash
   cd sacrament-agenda
   npm install
   vercel
   ```
3. Follow the prompts — Vercel will detect Vite and deploy automatically

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Data Storage

All data (agendas, name lists, custom hymns) is stored in the browser's `localStorage`. This means:

- Data persists between visits on the same browser/device
- Different users on different devices have their own separate data
- Clearing browser data will erase saved agendas

## Customizing

- **Ward/Stake defaults** — edit `WARD_NAME` and `STAKE_NAME` in `src/App.jsx`
- **Adding hymns in bulk** — edit `src/hymns.js` to add entries to `DEFAULT_HYMNS`
