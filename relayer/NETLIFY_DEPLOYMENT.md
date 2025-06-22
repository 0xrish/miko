# Netlify Deployment Guide

## 🚀 Quick Deploy to Netlify

### 1. Connect Repository
- Login to Netlify Dashboard
- Click "Add new site" → "Import an existing project"
- Select your repository
- Choose `relayer` as base directory

### 2. Build Settings
- **Build Command:** `npm install`
- **Publish Directory:** `public`
- **Functions Directory:** `netlify/functions`

### 3. Environment Variables
Add these in Netlify Dashboard → Environment Variables:

```
NODE_ENV=production
SOLANA_RPC=https://api.mainnet-beta.solana.com
JUPITER_API_URL=https://quote-api.jup.ag/v6
```

### 4. Deploy
Push to main branch or click "Deploy site"

## 🔧 Testing

- Health Check: `https://your-site.netlify.app/.netlify/functions/health`
- API Docs: `https://your-site.netlify.app/api-docs`

## ⚠️ Important Limitations

**Netlify Functions have 10-second timeouts** - not ideal for complex swaps.

**Better alternatives for production:**
- Vercel (longer timeouts)
- Railway (persistent containers)
- Traditional VPS hosting

## 📝 File Structure

```
relayer/
├── netlify.toml          # Netlify configuration
├── public/index.html     # Landing page
├── netlify/functions/    # Serverless functions
│   ├── health.js
│   ├── swap.js
│   ├── confirm.js
│   └── utils/
└── .env.netlify         # Environment template
```

The relayer is now Netlify-ready with serverless functions! 🎉 