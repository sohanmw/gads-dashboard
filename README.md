# Google Ads Dashboard

A Next.js dashboard for monitoring Google Ads performance metrics, campaign health, and portfolio analytics.

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Making Changes

1. **Edit files** in your code editor
2. **Test locally** - changes auto-reload at `localhost:3000`
3. **When ready to deploy**, ask to push to GitHub and deploy

## 📦 Deployment

The app is deployed on **Netlify** and auto-deploys when changes are pushed to the `main` branch.

- **Live URL:** Your Netlify site URL
- **Deployment:** Automatic on git push to `main`

### Manual Deployment Steps

```bash
# Stage your changes
git add .

# Commit with a message
git commit -m "Your commit message"

# Push to GitHub (triggers Netlify deployment)
git push origin main
```

## 🛠️ Tech Stack

- **Framework:** Next.js 15.1.6
- **React:** 19.2.3
- **Styling:** Tailwind CSS 4
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Deployment:** Netlify

## 📁 Project Structure

```
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── api/          # API routes
│   │   ├── page.tsx      # Main page
│   │   └── globals.css   # Global styles
│   ├── components/       # React components
│   │   ├── Dashboard.tsx # Main dashboard component
│   │   └── MultiSelect.tsx
│   └── lib/              # Utilities and types
├── public/               # Static assets
├── netlify.toml          # Netlify configuration
└── package.json          # Dependencies
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📝 Notes

- The dashboard pulls data from Google Sheets via the `/api/visual-bridge` endpoint
- Authentication is handled via NextAuth (if configured)
- All changes should be tested locally before pushing to production
