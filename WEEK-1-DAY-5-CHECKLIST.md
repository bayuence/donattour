# Week 1 Day 5: Deployment & Verification Checklist

## Summary of Week 1 Deliverables

✅ **Done (in code)**:
1. Pino logger with structured JSON logging
2. Middleware with correlation ID generation
3. Structured logging in `/api/orders/create`
4. Sentry configuration (server + client)
5. Health check endpoint at `/api/health`
6. Vercel cron job configuration

⬜ **You need to do (Day 5)**:
1. Setup Sentry account
2. Add environment variables to Vercel
3. Deploy to production
4. Verify all systems working

## Step-by-Step Day 5 Actions

### 🔴 Step 1: Setup Sentry Account (15 mins)

**Follow**: `docs/SENTRY-SETUP.md`

1. Go to https://sentry.io/signup
2. Create account
3. Create "donattour-pos" project
4. Get your SENTRY_DSN
5. Copy the DSN value (format: `https://xxx@xxx.ingest.sentry.io/xxx`)

**Note**: You'll need this for Vercel environment variables

### 🟡 Step 2: Add Environment Variables to Vercel (10 mins)

1. Go to Vercel dashboard
2. Select your project
3. Settings → Environment Variables
4. Add these variables (only for Production):

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Your Sentry DSN | Production |
| `SENTRY_DSN` | Your Sentry DSN (same) | Production |
| `HEALTH_CHECK_SECRET` | Generate random string | Production |

**Generate random secret**:
```bash
# macOS/Linux
openssl rand -hex 32

# Windows: use any secure random string
# Example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Add to Vercel**:
- Key: `HEALTH_CHECK_SECRET`
- Value: Your random string
- Environments: Production ✅

### 🟢 Step 3: Deploy to Production (5 mins)

**Option A: GitHub Integration (recommended)**
```bash
# Push to main branch
git push origin main

# GitHub Actions automatically deploys to Vercel
# Wait 2-3 minutes for deployment
```

**Option B: Manual Vercel Deploy**
```bash
# Or deploy directly from command line
vercel deploy --prod

# Add environment variables before deploying
```

### 🔵 Step 4: Verify Deployment (10 mins)

#### 4a. Check Vercel Deployment

1. Vercel dashboard → Deployments
2. Latest deployment should show ✅ "Ready"
3. Click to view live preview

#### 4b. Test Health Endpoint

```bash
# Get your deployment URL from Vercel
# Usually: https://your-project.vercel.app

# Test health endpoint
curl -H "x-health-secret: your-secret-string" \
  https://your-project.vercel.app/api/health

# Should return 200 with status: "healthy"
{
  "status": "healthy",
  "services": {
    "supabase": "up",
    "googleSheets": "up",
    "midtrans": "up"
  }
}
```

#### 4c. Verify Logs in Vercel

1. Vercel dashboard → Functions
2. Look for `/api/health` logs
3. Should show execution every 5 minutes

#### 4d. Test Sentry Integration

1. Trigger a test error:
```bash
# In browser or curl
curl https://your-project.vercel.app/api/test-error

# Or: Try creating an order with invalid data
```

2. Go to Sentry dashboard → Your project
3. Should see error appear within 30 seconds
4. Check error details, breadcrumbs, context

### 🟣 Step 5: Verify Cron Jobs (5 mins)

**In Vercel Dashboard**:
1. Settings → Cron Jobs
2. Should see 2 crons:
   - `/api/alerts/check` - every hour (0 * * * *)
   - `/api/health` - every 5 minutes (*/5 * * * *)

3. Click on `/api/health` cron
4. View execution history
5. Click on recent execution → View logs

**Expected logs**:
```
[14:35:00] Started /api/health
[14:35:01] Checking Supabase...
[14:35:02] Checking Google Sheets...
[14:35:03] Checking Midtrans...
[14:35:03] All services up - Status: healthy
[14:35:03] Completed in 3.2s
```

### 🟤 Step 6: Confirm Alerts Working (5 mins)

#### Sentry Email Alert
1. Go to Sentry → Settings → Alerts
2. Should have alert rule created automatically
3. Set trigger: "Error frequency > 1 in 1 min"
4. Notify: Your email

#### Test Alert
1. Temporarily break something
2. Trigger error
3. Check Sentry
4. Verify email received

## Success Checklist

When you complete Day 5, verify ALL of these:

- [ ] Sentry account created
- [ ] SENTRY_DSN added to Vercel Production env
- [ ] HEALTH_CHECK_SECRET added to Vercel Production env
- [ ] Deployed to Vercel (git push or vercel deploy --prod)
- [ ] Vercel shows "Ready" status
- [ ] Health endpoint returns 200 with "healthy" status
- [ ] Pino logs visible in Vercel Functions dashboard
- [ ] Sentry dashboard shows errors
- [ ] Sentry email alert works (test error received)
- [ ] Cron jobs appear in Vercel Settings
- [ ] Health check runs every 5 minutes

## If Something Fails

### Health check returns 401 (Unauthorized)
- Check HEALTH_CHECK_SECRET is set in Vercel
- Verify header is: `x-health-secret: your-secret-string`

### Sentry not capturing errors
- Check SENTRY_DSN in Vercel env
- Redeploy: `vercel deploy --prod`
- Wait 30 seconds
- Test again

### Logs not appearing
- Check LOG_LEVEL in .env (should be: `info` or `debug`)
- Vercel might cache, try Force Redeployment
- Dashboard → Deployments → Recent → "Redeploy" button

### Cron not executing
- Check vercel.json is in root directory
- Verify JSON syntax is valid
- Redeploy
- Wait 5+ minutes for first execution

## Week 1 Complete! 🎉

**What you've accomplished**:
- ✅ Production-grade logging system (Pino)
- ✅ Error tracking dashboard (Sentry)
- ✅ System health monitoring (Health endpoint)
- ✅ Automated monitoring (Vercel crons)
- ✅ Correlation IDs for debugging

**Production visibility achieved**:
- 👁️ See all API requests with request/response times
- 🔴 Get email alerts when production breaks
- 📊 Dashboard shows all errors with context
- 🏥 Automatic health monitoring every 5 minutes
- 🔗 Trace any issue end-to-end with correlation IDs

**Next Week**: Start **Week 2** (Prisma + Jest)
- Type-safe database layer
- Critical path testing
- ~40 hours of work

## Questions?

If anything fails:
1. Check error message carefully
2. Review relevant documentation file
3. Check Vercel logs for clues
4. Feel free to ask for help

**You've got this!** 🚀
