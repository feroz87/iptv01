# Deployment Guide

This guide will help you deploy your IPTV application to a free hosting platform with password protection.

## 🚀 Recommended Hosting: Vercel (Best for Next.js)

Vercel is the best free option for Next.js applications. It offers:
- ✅ Free tier with generous limits
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Easy deployment from GitHub
- ✅ Environment variable support

## 📋 Prerequisites

1. A GitHub account
2. Your code pushed to a GitHub repository

## 🔐 Step 1: Set Up Password Protection

The application already includes password protection. You just need to set the password as an environment variable.

**Default password:** `changeme123` (change this!)

## 📦 Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Sign up/login with your GitHub account

2. **Import Your Project**
   - Click "Add New Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Project**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

4. **Set Environment Variables**
   - Click "Environment Variables"
   - Add a new variable:
     - **Name:** `IPTV_PASSWORD`
     - **Value:** Your desired password (e.g., `MySecurePassword123!`)
   - Click "Save"

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete (2-5 minutes)
   - Your app will be live at `https://your-project-name.vercel.app`

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set Environment Variable**
   ```bash
   vercel env add IPTV_PASSWORD
   # Enter your password when prompted
   ```

5. **Redeploy with Environment Variable**
   ```bash
   vercel --prod
   ```

## 🔒 Step 3: Access Your Application

1. Visit your Vercel URL: `https://your-project-name.vercel.app`
2. You'll be redirected to the login page
3. Enter your password (the one you set in `IPTV_PASSWORD`)
4. You'll be logged in for 30 days (cookie-based)

## 🔄 Updating Your Application

### Via GitHub (Automatic)
- Push changes to your GitHub repository
- Vercel will automatically redeploy

### Via CLI
```bash
vercel --prod
```

## 🌐 Alternative Free Hosting Options

### 1. **Netlify**
   - Similar to Vercel
   - Free tier available
   - Steps:
     1. Go to [netlify.com](https://netlify.com)
     2. Connect GitHub repository
     3. Set build command: `npm run build`
     4. Set publish directory: `.next`
     5. Add environment variable: `IPTV_PASSWORD`

### 2. **Railway**
   - Free tier with $5 credit/month
   - Steps:
     1. Go to [railway.app](https://railway.app)
     2. New Project → Deploy from GitHub
     3. Add environment variable: `IPTV_PASSWORD`
     4. Deploy

### 3. **Render**
   - Free tier available
   - Steps:
     1. Go to [render.com](https://render.com)
     2. New Web Service → Connect GitHub
     3. Set build command: `npm run build`
     4. Set start command: `npm start`
     5. Add environment variable: `IPTV_PASSWORD`

## 🔧 Environment Variables

Required environment variable:
- `IPTV_PASSWORD` - Your password for accessing the application

Optional (for production):
- `NODE_ENV=production` - Set automatically by hosting platforms

## 📝 Notes

1. **Password Security**
   - Use a strong password
   - Don't commit passwords to Git
   - Change password regularly

2. **Cookie Security**
   - Cookies are HTTP-only and secure in production
   - Session lasts 30 days
   - Logout clears the session

3. **Free Tier Limits**
   - Vercel: 100GB bandwidth/month, unlimited requests
   - Netlify: 100GB bandwidth/month
   - Railway: $5 credit/month
   - Render: 750 hours/month

4. **Custom Domain** (Optional)
   - Vercel allows free custom domains
   - Add your domain in Vercel dashboard
   - Update DNS records as instructed

## 🐛 Troubleshooting

### Login not working?
- Check that `IPTV_PASSWORD` environment variable is set
- Clear browser cookies and try again
- Check browser console for errors

### Deployment fails?
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (18+)

### Video not playing?
- Check server logs in hosting dashboard
- Verify API endpoints are accessible
- Check network tab in browser DevTools

## 🔐 Security Best Practices

1. **Use a Strong Password**
   - Minimum 12 characters
   - Mix of letters, numbers, symbols
   - Don't reuse passwords

2. **Keep Dependencies Updated**
   ```bash
   npm audit
   npm update
   ```

3. **Monitor Usage**
   - Check Vercel dashboard for usage stats
   - Monitor bandwidth consumption

4. **Backup Your Code**
   - Keep code in GitHub
   - Tag releases for easy rollback

## 📞 Support

If you encounter issues:
1. Check Vercel/Netlify documentation
2. Review application logs
3. Check GitHub Issues

---

**Happy Streaming! 🎬**

