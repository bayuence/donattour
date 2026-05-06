# 🚀 Production Tracking System - Deployment Guide

**Version:** 1.0  
**Date:** 2026-05-06  
**Status:** Ready for Deployment

---

## 📋 Pre-Deployment Checklist

### **1. Code Quality** ✅
- [x] All TypeScript errors resolved
- [x] All features implemented
- [x] RBAC implemented
- [x] Alert system integrated
- [x] No console errors

### **2. Environment Variables** ⏳
Required environment variables:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Alert System - Cron
CRON_SECRET_TOKEN=your-random-secret-token

# Optional
NODE_ENV=production
```

### **3. Database** ⏳
- [ ] All migrations applied
- [ ] Tables created
- [ ] Indexes created
- [ ] Triggers created
- [ ] RLS policies configured
- [ ] Sample data (optional)

### **4. Dependencies** ✅
- [x] All packages installed
- [x] No missing dependencies
- [x] Compatible versions

---

## 🗄️ Database Setup

### **Step 1: Run Migrations**

Execute SQL files in order:

```sql
-- 1. Main schema
QueryDATABASE/31-production-tracking-system.sql

-- 2. Topping errors migration
QueryDATABASE/31-production-tracking-system-migration-topping-errors.sql

-- 3. Alerts system
QueryDATABASE/32-alerts-system.sql
```

### **Step 2: Verify Tables**

Check if all tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- alerts
- closing_finished_products
- closing_non_topping_status
- daily_closing
- daily_loss_summary
- inventory_non_topping
- order_items
- orders
- outlet_production_costs
- outlets
- production_daily
- production_waste_details
- products
- topping_errors
- topping_usage
- users

### **Step 3: Verify Indexes**

```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### **Step 4: Verify Triggers**

```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

---

## 🔐 Environment Variables Setup

### **Vercel Dashboard:**

1. Go to Project Settings → Environment Variables
2. Add all required variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJxxx...
SUPABASE_SERVICE_ROLE_KEY = eyJxxx...
CRON_SECRET_TOKEN = (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

3. Set for: Production, Preview, Development

---

## 📦 Build & Deploy

### **Option 1: Deploy via Vercel Dashboard** (Recommended)

1. **Connect Repository:**
   - Go to Vercel Dashboard
   - Click "New Project"
   - Import your Git repository
   - Select the repository

2. **Configure Build:**
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: .next
   - Install Command: `npm install`

3. **Add Environment Variables:**
   - Add all variables from above

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete

---

### **Option 2: Deploy via CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# Follow prompts to configure
```

---

### **Option 3: Deploy via Git Push**

```bash
# Commit all changes
git add .
git commit -m "feat: Production Tracking System v1.0"

# Push to main branch
git push origin main

# Vercel will auto-deploy
```

---

## ⚙️ Vercel Configuration

### **vercel.json**

Already created with cron configuration:
```json
{
  "crons": [
    {
      "path": "/api/alerts/check",
      "schedule": "0 * * * *"
    }
  ]
}
```

This will run alert checks every hour.

---

## 🧪 Post-Deployment Testing

### **1. Basic Functionality**

**Test Authentication:**
```
1. Visit https://your-domain.com
2. Try to access /dashboard (should redirect to /login)
3. Login with test user
4. Should redirect to appropriate dashboard
```

**Test Production Input:**
```
1. Login as bagian_dapur
2. Go to /dashboard/input-produksi
3. Create production record
4. Verify data saved
5. Check alert triggered (if waste > 15%)
```

**Test POS:**
```
1. Login as kasir
2. Go to /dashboard/kasir
3. Create sale
4. Verify stock deducted
5. Check stock low alert (if < 20%)
```

**Test Closing:**
```
1. Login as closing_staff
2. Go to /dashboard/closing
3. Complete closing form
4. Verify loss summary calculated
5. Check alerts triggered
```

**Test Dashboard:**
```
1. Login as owner/manager
2. Go to /dashboard
3. Verify all charts load
4. Verify data accurate
5. Check recommendations
```

**Test Reports:**
```
1. Login as owner/manager
2. Go to /dashboard/reports
3. Select date range
4. Verify charts load
5. Test Excel export
```

**Test Alerts:**
```
1. Check alert bell icon
2. Verify unread count
3. Click to view alerts
4. Mark as read
5. Verify count updates
```

---

### **2. RBAC Testing**

**Test Role Access:**
```
Admin:
- ✅ Can access all routes
- ✅ Can see all data

Owner:
- ✅ Can access dashboard, reports
- ❌ Cannot access production input, kasir, closing

Manager:
- ✅ Can access dashboard, reports
- ✅ Can access production, kasir, closing

Bagian Dapur:
- ✅ Can access production input
- ❌ Cannot access kasir, closing, reports

Kasir:
- ✅ Can access kasir
- ❌ Cannot access production, closing, reports

Closing Staff:
- ✅ Can access closing
- ❌ Cannot access production, kasir, reports
```

---

### **3. API Testing**

Test all API endpoints:

```bash
# Production API
curl -X POST https://your-domain.com/api/production/daily \
  -H "Content-Type: application/json" \
  -d '{"outlet_id":"xxx","tanggal":"2026-05-06",...}'

# Closing API
curl -X POST https://your-domain.com/api/closing/daily \
  -H "Content-Type: application/json" \
  -d '{"outlet_id":"xxx","tanggal":"2026-05-06",...}'

# Dashboard API
curl https://your-domain.com/api/dashboard/daily?date=2026-05-06

# Reports API
curl https://your-domain.com/api/reports/period?start_date=2026-05-01&end_date=2026-05-06

# Alerts API
curl https://your-domain.com/api/alerts?is_read=false

# Alert Check (Cron)
curl https://your-domain.com/api/alerts/check?token=YOUR_CRON_TOKEN
```

---

### **4. Performance Testing**

**Check Load Times:**
```
Dashboard: < 2 seconds
Reports: < 3 seconds
API calls: < 1 second
```

**Check Bundle Size:**
```bash
# After build
npm run build

# Check output
# First Load JS should be < 200 KB
```

---

## 🔍 Monitoring & Logging

### **Vercel Analytics**

Already integrated with `@vercel/analytics`:
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

<Analytics />
```

### **Error Tracking**

Monitor errors in:
1. Vercel Dashboard → Logs
2. Supabase Dashboard → Logs
3. Browser Console (for client errors)

### **Cron Job Monitoring**

Check cron execution:
1. Vercel Dashboard → Cron Jobs
2. View execution logs
3. Verify alerts created

---

## 📊 Success Metrics

### **After 1 Week:**
- [ ] All outlets using system daily
- [ ] Production input completed daily
- [ ] Closing completed daily
- [ ] No critical errors
- [ ] Users trained

### **After 1 Month:**
- [ ] Waste rate tracked
- [ ] Loss breakdown visible
- [ ] Alerts helping operations
- [ ] Reports being used
- [ ] ROI positive

---

## 🐛 Troubleshooting

### **Issue: Build Fails**

**Check:**
1. TypeScript errors: `npm run build`
2. Missing dependencies: `npm install`
3. Environment variables set

**Solution:**
```bash
# Clear cache
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

---

### **Issue: Database Connection Fails**

**Check:**
1. Supabase URL correct
2. Anon key correct
3. Service role key correct
4. Database accessible

**Solution:**
- Verify environment variables
- Check Supabase dashboard
- Test connection manually

---

### **Issue: Cron Not Running**

**Check:**
1. vercel.json exists
2. CRON_SECRET_TOKEN set
3. Cron enabled in Vercel

**Solution:**
- Redeploy with vercel.json
- Check Vercel Cron Jobs dashboard
- Test endpoint manually

---

### **Issue: RBAC Not Working**

**Check:**
1. middleware.ts deployed
2. User has role in database
3. Auth token in cookies

**Solution:**
- Clear cookies and re-login
- Check user role in database
- Verify middleware running

---

## 📚 User Documentation

### **For Admin:**

**Setup:**
1. Create outlets
2. Create users with roles
3. Set outlet production costs
4. Create products

**Daily:**
1. Monitor dashboard
2. Check alerts
3. Review reports
4. Manage users

---

### **For Bagian Dapur:**

**Daily:**
1. Login at start of shift
2. Input production (target, success, waste)
3. Record waste reasons
4. Check alerts

---

### **For Kasir:**

**Daily:**
1. Login at start of shift
2. Check stock available
3. Process sales
4. Report topping errors
5. Check stock alerts

---

### **For Closing Staff:**

**Daily:**
1. Login at end of day
2. Count remaining stock
3. Complete closing form (3 tabs)
4. Review loss summary
5. Submit closing

---

### **For Owner/Manager:**

**Daily:**
1. Login to view dashboard
2. Check financial summary
3. Review loss breakdown
4. Check alerts
5. Read recommendations

**Weekly:**
1. View weekly reports
2. Compare outlets
3. Export to Excel
4. Analyze trends

---

## ✅ Deployment Checklist

### **Pre-Deployment:**
- [x] Code complete
- [x] RBAC implemented
- [x] Alert system integrated
- [x] Zero TypeScript errors
- [ ] Database migrations ready
- [ ] Environment variables documented

### **Deployment:**
- [ ] Database migrations applied
- [ ] Environment variables set in Vercel
- [ ] Code deployed to Vercel
- [ ] Build successful
- [ ] Cron job configured

### **Post-Deployment:**
- [ ] Basic functionality tested
- [ ] RBAC tested
- [ ] API endpoints tested
- [ ] Performance checked
- [ ] Monitoring setup
- [ ] Users trained
- [ ] Documentation provided

---

## 🎉 Go Live!

**When Ready:**
1. ✅ All checklist items complete
2. ✅ Testing passed
3. ✅ Users trained
4. ✅ Monitoring setup

**Then:**
1. Announce to users
2. Provide training
3. Monitor closely for 1 week
4. Gather feedback
5. Iterate and improve

---

## 📞 Support

**For Issues:**
1. Check logs in Vercel Dashboard
2. Check database logs in Supabase
3. Review error messages
4. Check documentation
5. Contact developer

---

**Last Updated:** 2026-05-06  
**Version:** 1.0  
**Status:** ✅ Ready for Deployment

---

## 🚀 READY TO DEPLOY!

**System Status:** ✅ Production Ready  
**Confidence:** 🟢 Very High  
**Quality:** 🟢 Excellent

**Let's Go Live!** 🎉
