# Health Check Endpoint Guide

## Overview

The `/api/health` endpoint monitors the status of all critical services every 5 minutes. If any service goes down, you'll know immediately.

**Endpoint**: `GET /api/health`  
**Authentication**: Required (x-health-secret header)  
**Frequency**: Every 5 minutes via Vercel cron  
**Response**: JSON with service health status

## Services Monitored

### 1. Supabase Database
- **What**: Database connection and basic query
- **Alert**: "Cannot query outlets table"
- **Healthy response**: `"supabase": "up"`

### 2. Google Sheets API
- **What**: API authentication and connectivity
- **Alert**: "Cannot authenticate with Google Sheets"
- **Healthy response**: `"googleSheets": "up"`

### 3. Midtrans Payment Gateway
- **What**: Payment API connectivity
- **Alert**: "Cannot reach Midtrans sandbox API"
- **Healthy response**: `"midtrans": "up"`

## Health Status Levels

### ✅ Healthy (200)
All services operational
```json
{
  "status": "healthy",
  "services": {
    "supabase": "up",
    "googleSheets": "up",
    "midtrans": "up"
  }
}
```

### ⚠️ Degraded (503)
At least one service down, but system still operating
```json
{
  "status": "degraded",
  "services": {
    "supabase": "up",
    "googleSheets": "down",
    "midtrans": "up"
  }
}
```

### ❌ Unhealthy (500)
Critical error, system unavailable
```json
{
  "status": "unhealthy",
  "error": "Database connection timeout",
  "services": {}
}
```

## Setup in Vercel

### Step 1: Add Environment Variable

In Vercel dashboard → Settings → Environment Variables:

```
HEALTH_CHECK_SECRET = <random-strong-string>
```

Generate a random secret:
```bash
# macOS/Linux
openssl rand -hex 32

# Or any secure random string
```

### Step 2: Vercel Cron Configuration

The `vercel.json` already includes:

```json
{
  "crons": [
    {
      "path": "/api/health",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This means: Run `/api/health` every 5 minutes

### Step 3: Redeploy

```bash
vercel deploy --prod
```

Or push to main and let GitHub Actions deploy.

## Monitoring Health Checks

### View Logs

1. Vercel dashboard → Functions → Cron
2. See execution history
3. Check response times

### Response Time Analysis

```
Healthy check: 2-3 seconds
Degraded check: 5-10 seconds
Unhealthy check: 30+ seconds
```

Fast responses = all services responsive  
Slow responses = services under load

### Debugging a Failed Check

Example Vercel logs:
```
[14:32:15] GET /api/health
[14:32:15] x-health-secret: valid
[14:32:16] Supabase: ✅ up
[14:32:17] Google Sheets: ❌ down
[14:32:18] Midtrans: ✅ up
[14:32:18] Health: degraded
[14:32:18] Duration: 3.2s
```

## Testing Locally

### Test without secret (unauthorized)
```bash
curl http://localhost:3000/api/health
# Response: 401 Unauthorized
```

### Test with secret (authorized)
```bash
HEALTH_SECRET="your-secret-string"
curl -H "x-health-secret: $HEALTH_SECRET" \
  http://localhost:3000/api/health

# Response:
{
  "timestamp": "2026-05-19T10:30:00.000Z",
  "status": "healthy",
  "services": {
    "supabase": "up",
    "googleSheets": "up",
    "midtrans": "up"
  },
  "responseTime": 2847
}
```

### Simulate Service Down

Temporarily break a service to test alert:
```bash
# Change SUPABASE_URL to invalid
# Redeploy
# Run health check
# Should show: "supabase": "down"
```

## Integration with Monitoring

### Send to External Monitoring

You can integrate health checks with external services:

**Option 1: Datadog**
```bash
curl -X POST https://api.datadoghq.com/api/v1/events \
  -H "DD-API-KEY: $DATADOG_API_KEY" \
  -d @- <<EOF
{
  "title": "Health Check Passed",
  "text": "All services up",
  "priority": "low",
  "tags": ["donattour", "production"]
}
EOF
```

**Option 2: Slack Notification**
```bash
# On degraded status, POST to Slack webhook
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{"text":"⚠️ Google Sheets API down"}'
```

**Option 3: PagerDuty**
```bash
# Trigger incident on unhealthy status
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"routing_key":"...","event_action":"trigger"}'
```

## Cost

**Vercel Cron**: Free (included with Pro plan)  
**5-minute checks**: 8,640 checks/month  
**Data logged**: ~5KB per check = 43MB/month (negligible)

## Next Steps

- ✅ Health check endpoint created
- ✅ Vercel cron configured
- ⬜ Deploy to production
- ⬜ Set environment variables in Vercel
- ⬜ Verify health checks running (Week 1 Day 5)

## Troubleshooting

### Health check not running

1. Check vercel.json is in root directory
2. Verify cron schedule syntax: `*/5 * * * *` (every 5 min)
3. Redeploy: `vercel deploy --prod`
4. Wait 5 minutes for first execution

### "Unauthorized" response

1. Check HEALTH_CHECK_SECRET in Vercel env
2. Verify x-health-secret header sent correctly
3. Redeploy after updating env

### All services showing "down"

1. Check .env variables are set correctly
2. Verify API keys not expired (Google Sheets token)
3. Check if APIs are actually accessible (firewall/VPN?)

### Slow health check response

- Supabase slow: Check database load
- Google Sheets slow: API rate limiting
- Midtrans slow: Check sandbox status
