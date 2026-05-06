# ✅ Deployment Checklist - Quick Reference

**Date:** 2026-05-06  
**Status:** Ready to Execute

---

## 🎯 Quick Start

**Total Time:** ~2 hours  
**Phases:** 5  
**Confidence:** 🟢 Very High

---

## Phase 1: Database Setup (30 min)

### ☐ Step 1: Backup Database
- [ ] Open Supabase Dashboard
- [ ] Go to Database → Backups
- [ ] Create manual backup
- [ ] Wait for completion

### ☐ Step 2: Execute Migrations
- [ ] Open Supabase SQL Editor
- [ ] Run: `QueryDATABASE/31-production-tracking-system.sql`
- [ ] Run: `QueryDATABASE/31-production-tracking-system-migration-topping-errors.sql`
- [ ] Run: `QueryDATABASE/32-alerts-system.sql`
- [ ] Verify success messages

### ☐ Step 3: Verify Tables
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```
- [ ] Verify 16+ tables created
- [ ] Check indexes created
- [ ] Check triggers created

---

## Phase 2: Environment Variables (15 min)

### ☐ Step 1: Generate CRON Token
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
- [ ] Copy token
- [ ] Save securely

### ☐ Step 2: Get Supabase Credentials
- [ ] Copy Project URL from Supabase
- [ ] Copy Anon Key from Supabase
- [ ] Copy Service Role Key from Supabase

### ☐ Step 3: Configure Vercel
Go to Vercel → Settings → Environment Variables

- [ ] Add `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` (mark sensitive)
- [ ] Add `CRON_SECRET_TOKEN` (mark sensitive)
- [ ] Add `NODE_ENV=production` (production only)

---

## Phase 3: Deploy Code (20 min)

### ☐ Step 1: Commit Changes
```bash
git status
git add .
git commit -m "feat: Production Tracking System v1.0 - Ready for Deployment"
git push origin main
```

### ☐ Step 2: Monitor Build
- [ ] Open Vercel Dashboard
- [ ] Go to Deployments
- [ ] Watch build progress
- [ ] Wait for "Ready" status

### ☐ Step 3: Verify Deployment
- [ ] Visit production URL
- [ ] Check login page loads
- [ ] Verify no console errors

---

## Phase 4: Testing (45 min)

### ☐ Test 1: Authentication
- [ ] Try accessing `/dashboard` (should redirect to login)
- [ ] Login with test user
- [ ] Verify dashboard loads
- [ ] Check user role displayed

### ☐ Test 2: Production Input
- [ ] Login as `bagian_dapur`
- [ ] Go to `/dashboard/input-produksi`
- [ ] Create production record
- [ ] Verify data saved
- [ ] Check alert triggered (if waste > 15%)

### ☐ Test 3: POS
- [ ] Login as `kasir`
- [ ] Go to `/dashboard/kasir`
- [ ] Check stock summary
- [ ] Create sale
- [ ] Verify stock deducted

### ☐ Test 4: Closing
- [ ] Login as `closing_staff`
- [ ] Go to `/dashboard/closing`
- [ ] Complete 3 tabs
- [ ] Submit closing
- [ ] Verify loss summary

### ☐ Test 5: Dashboard
- [ ] Login as `owner`
- [ ] Go to `/dashboard`
- [ ] Verify all cards load
- [ ] Check charts render
- [ ] Test recommendations

### ☐ Test 6: Reports
- [ ] Go to `/dashboard/laporan`
- [ ] Select date range
- [ ] Verify charts load
- [ ] Test Excel export

### ☐ Test 7: Alerts
- [ ] Check alert bell icon
- [ ] Verify unread count
- [ ] View alerts
- [ ] Mark as read

### ☐ Test 8: RBAC
- [ ] Test admin access (all routes)
- [ ] Test owner access (dashboard only)
- [ ] Test manager access (most routes)
- [ ] Test staff access (limited routes)
- [ ] Verify unauthorized blocked

### ☐ Test 9: Cron Job
```bash
curl -X GET "https://your-project.vercel.app/api/alerts/check?token=YOUR_CRON_TOKEN"
```
- [ ] Verify response success
- [ ] Check alerts created
- [ ] Verify in Vercel Cron Jobs dashboard

### ☐ Test 10: Performance
- [ ] Dashboard loads < 2 seconds
- [ ] Reports load < 3 seconds
- [ ] API responses < 1 second
- [ ] No console errors

---

## Phase 5: Go-Live (varies)

### ☐ Pre-Launch
- [ ] All tests passed
- [ ] All users trained
- [ ] Monitoring setup
- [ ] Backup plan ready

### ☐ Launch Day
- [ ] Announce to users
- [ ] Monitor closely
- [ ] Be available for support
- [ ] Track usage

### ☐ First Week
- [ ] Daily monitoring
- [ ] Quick bug fixes
- [ ] User support
- [ ] Gather feedback

---

## 🚨 Emergency Contacts

**If Issues Occur:**
1. Check Vercel logs
2. Check Supabase logs
3. Check browser console
4. Review troubleshooting guide
5. Contact developer

---

## 📊 Success Metrics

### Technical
- [ ] Zero critical errors
- [ ] All features working
- [ ] Performance targets met
- [ ] Security verified

### Business
- [ ] All outlets using system
- [ ] Daily production tracked
- [ ] Daily closing completed
- [ ] Loss visibility achieved

### User
- [ ] Users trained
- [ ] Positive feedback
- [ ] High adoption rate
- [ ] Reduced manual work

---

## 🎉 Completion

**When All Checked:**
- ✅ System deployed
- ✅ All tests passed
- ✅ Users trained
- ✅ Monitoring active
- ✅ **GO LIVE!**

---

**Last Updated:** 2026-05-06  
**Version:** 1.0  
**Status:** ✅ Ready to Execute
