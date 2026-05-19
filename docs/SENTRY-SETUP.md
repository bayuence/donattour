# Sentry Setup Guide for Donattour POS

## Overview

Sentry is an error tracking platform that captures and alerts you when bugs happen in production. This guide uses the **free tier** (5k events/month) which is perfect for starting.

## Step 1: Create Sentry Account

1. Go to https://sentry.io/signup
2. Sign up with your email
3. Verify email
4. Create organization (use your company name)

## Step 2: Create Project

1. Click "Create Project"
2. Select platform: **Next.js**
3. Set project name: `donattour-pos`
4. Click "Create Project"

## Step 3: Get Credentials

You'll see a page with setup instructions. Copy these values:

```
SENTRY_DSN = https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

This DSN is what goes in your `.env`:
```env
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

## Step 4: Add to Vercel Environment Variables

1. Go to Vercel dashboard → Your Project
2. Settings → Environment Variables
3. Add these variables:

| Key | Value | Environments |
|-----|-------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Your DSN (public) | Production |
| `SENTRY_DSN` | Your DSN (same) | Production |

## Step 5: Redeploy to Production

```bash
vercel deploy --prod
```

Or push to main and let GitHub Actions deploy automatically.

## Step 6: Test It Works

After deployment, trigger a test error:

```bash
# Test error endpoint
curl https://your-vercel-url/api/test-error

# Or manually cause an error in your app
```

Then check Sentry dashboard - you should see the error within 30 seconds.

## Monitoring & Alerts

### View Errors in Sentry

1. Go to https://sentry.io → Your Organization
2. Click "donattour-pos" project
3. See all errors with:
   - Stack traces
   - User context
   - Request details
   - Breadcrumbs (what happened before error)

### Setup Email Alerts

1. Settings → Alerts
2. Click "Create Alert"
3. Configure:
   - When: Error frequency > 1 in 1 minute
   - Notify: Your email

4. Save

Now you get email when errors spike!

## Understanding Error Context

When an error is logged, Sentry captures:

- **Stack trace** - Exact line of code that crashed
- **Breadcrumbs** - What happened before the crash (logs, HTTP requests, clicks)
- **Context** - User ID, correlation ID, request details
- **Release** - Which version of code had the bug
- **Environment** - production/staging/development

Example error in Sentry:
```
TypeError: Cannot read property 'id' of null
  at createOrder (app/api/orders/create/route.ts:65)
  
Breadcrumbs:
- order_create_start (5s before crash)
- order_created (2s before crash)
- stock_deduction_attempt (crash)

Context:
- correlationId: abc-123-def
- userId: user-456
- outletId: outlet-789
```

This makes debugging 10x faster!

## Pricing

- **Free tier**: 5k events/month (included)
- **Generous free tier**: Should cover ~200-500 orders/day
- **When to upgrade**: If you exceed 5k events/month ($99/month gets you 500k events)

For 2000 orders/day with ~2-3 logs per order = ~4-6k events/day, you might need to upgrade eventually, but start free.

## Best Practices

### ✅ DO

- Log errors with context (user ID, correlation ID, order details)
- Use error severity levels (error vs warning)
- Set up alerts for critical errors only
- Review Sentry dashboard weekly for patterns

### ❌ DON'T

- Log sensitive data (passwords, credit cards, tokens)
- Log every single log (floods your quota)
- Ignore recurring errors (fix root cause, not just alerts)
- Store secrets in Sentry

## Troubleshooting

### Errors not showing in Sentry

1. Check SENTRY_DSN in Vercel env vars
2. Redeploy: `vercel deploy --prod`
3. Wait 30 seconds for error to appear
4. Check Sentry dashboard refresh

### Too many errors in quota

1. Reduce LOG_LEVEL in production (warn/error only)
2. Filter out expected errors in Sentry settings
3. Upgrade plan if consistently exceeding quota

### Want to test integration

```bash
# Local testing (won't actually send unless production)
NODE_ENV=production npm run dev

# Trigger test error
curl http://localhost:3000/api/test-error

# Check Sentry dashboard
```

## Next Steps

- ✅ Setup Sentry account
- ✅ Add credentials to Vercel
- ✅ Deploy to production
- ✅ Test error tracking works
- ⬜ Continue with Week 1 Day 4 (Health Check Endpoint)
