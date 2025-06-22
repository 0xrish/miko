# Netlify Deployment Ready 🚀

## Files Created for Netlify:

✅ `netlify.toml` - Netlify configuration
✅ `netlify/functions/health.js` - Health check endpoint  
✅ `netlify/functions/swap.js` - Swap quotation endpoint
✅ `netlify/functions/confirm.js` - Swap confirmation endpoint
✅ `netlify/functions/swagger.js` - API documentation
✅ `netlify/functions/utils/serverless-utils.js` - Shared utilities
✅ `public/index.html` - Landing page
✅ `.env.netlify` - Environment template

## Quick Deploy:

1. **Connect to Netlify**: Import your repository
2. **Set Base Directory**: `relayer`
3. **Build Command**: `npm install`
4. **Publish Directory**: `public`
5. **Functions Directory**: `netlify/functions`
6. **Add Environment Variables**: Copy from `.env.netlify`

## Important Notes:

⚠️ **Netlify functions timeout after 10 seconds**
⚠️ **Not ideal for complex multi-step swaps**
⚠️ **Consider Vercel, Railway, or VPS for production**

## Test Endpoints:

- Health: `/.netlify/functions/health`
- Swap: `/.netlify/functions/swap`
- Docs: `/api-docs`

The relayer is now Netlify-ready! 🎉 