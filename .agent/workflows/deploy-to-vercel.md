---
description: Deploy CreatorHub to Vercel
---

# Deploy CreatorHub to Vercel

This workflow guides you through deploying the CreatorHub platform to Vercel.

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- Git repository pushed to GitHub/GitLab/Bitbucket
- Environment variables ready

## Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Navigate to Project Directory
```bash
cd e:\creatorhub
```

### 4. Deploy to Vercel
```bash
vercel
```
Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N** (first time)
- What's your project's name? **creatorhub** (or your preferred name)
- In which directory is your code located? **./**
- Want to override the settings? **N** (Vercel auto-detects Vite)

### 5. Add Environment Variables
After first deployment, add environment variables:

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

Or add them via the Vercel Dashboard:
1. Go to your project on vercel.com
2. Settings → Environment Variables
3. Add all variables from your `.env` file

### 6. Deploy to Production
```bash
vercel --prod
```

## Important Configuration

### Build Settings (Auto-detected by Vercel)
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Environment Variables Needed
Based on your project, you'll need:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- Any Cloudinary configuration variables
- Email service credentials (if applicable)

### Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

## Continuous Deployment
Once connected to Git:
- Every push to `main` branch auto-deploys to production
- Pull requests get preview deployments
- Rollback to previous deployments anytime

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set correctly

### Environment Variables Not Working
- Ensure they're prefixed with `VITE_` for client-side access
- Redeploy after adding new variables

### 404 Errors on Routes
Vercel should auto-configure SPA routing for Vite, but if needed, create `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
