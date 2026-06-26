# 📑 OFFLINE MODE - QUICK NAVIGATION INDEX

**Quick access to all offline mode documentation**

---

## 🚀 START HERE

### New to Offline Mode?
1. Read [README.md](./README.md) - Overview & folder structure
2. Read [Implementation Plan](./docs/planning/01-IMPLEMENTATION_PLAN.md) - Full guide
3. Read [Payment System](./docs/technical/PAYMENT_SYSTEM.md) - Understand payments

### Developer?
→ Go to [Developer Guide](./docs/guides/DEVELOPER_GUIDE.md) (TBD)

### Admin/Manager?
→ Go to [Admin Guide](./docs/guides/ADMIN_GUIDE.md) (TBD)

### QA Tester?
→ Go to [Testing Section](#testing-documents)

---

## 📂 DOCUMENTATION BY CATEGORY

### 📘 Planning & Architecture

| # | Document | Description | Priority |
|---|----------|-------------|----------|
| 1 | [Implementation Plan](./docs/planning/01-IMPLEMENTATION_PLAN.md) | **Main guide** - 7 phases, 8 weeks | 🔥 Must Read |
| 2 | [Correction Summary](./docs/planning/CORRECTION_SUMMARY.md) | What was fixed (payment system) | ⚠️ Important |
| 3 | [Roadmap](./docs/planning/ROADMAP.md) | Week-by-week timeline | 📅 TBD |

### 🔧 Technical Deep Dives

| # | Document | Description | Priority |
|---|----------|-------------|----------|
| 1 | [Payment System](./docs/technical/PAYMENT_SYSTEM.md) | Custom payments (no Midtrans) | 🔥 Must Read |
| 2 | [Sync Engine](./docs/technical/SYNC_ENGINE.md) | How sync works | 📝 TBD |
| 3 | [Conflict Resolution](./docs/technical/CONFLICT_RESOLUTION.md) | Handling conflicts | 📝 TBD |
| 4 | [Database Schema](./docs/technical/DATABASE_SCHEMA.md) | PGLite tables | 📝 TBD |

### 📖 User & Admin Guides

| # | Document | Description | Audience |
|---|----------|-------------|----------|
| 1 | [Developer Guide](./docs/guides/DEVELOPER_GUIDE.md) | Implementation guide | Developers |
| 2 | [User Guide](./docs/guides/USER_GUIDE.md) | Using offline mode | Kasir |
| 3 | [Admin Guide](./docs/guides/ADMIN_GUIDE.md) | Managing settings | Admin |
| 4 | [Troubleshooting](./docs/guides/TROUBLESHOOTING.md) | Common issues | Everyone |

---

## 🔍 FIND BY TOPIC

### Authentication
- [Implementation Plan § Offline Authentication](./docs/planning/01-IMPLEMENTATION_PLAN.md#3-offline-authentication-system)
- Developer Guide § Auth Setup (TBD)

### Payment Methods
- [Payment System Document](./docs/technical/PAYMENT_SYSTEM.md) ← **Start here**
- [Implementation Plan § Payment Methods](./docs/planning/01-IMPLEMENTATION_PLAN.md#-payment-methods-management-offline-capable)

### POS/Kasir
- [Implementation Plan § POS Offline](./docs/planning/01-IMPLEMENTATION_PLAN.md#3a-poskasir-offline-priority-1)
- Examples: [offline-pos.tsx](./examples/offline-pos.tsx) (TBD)

### Sync & Conflicts
- [Implementation Plan § Sync Strategy](./docs/planning/01-IMPLEMENTATION_PLAN.md#-data-synchronization-strategy)
- [Sync Engine](./docs/technical/SYNC_ENGINE.md) (TBD)
- [Conflict Resolution](./docs/technical/CONFLICT_RESOLUTION.md) (TBD)

### Database
- [Implementation Plan § PGLite Setup](./docs/planning/01-IMPLEMENTATION_PLAN.md#2-setup-pglite-local-database)
- [Database Schema](./docs/technical/DATABASE_SCHEMA.md) (TBD)
- [Prisma Schema](../prisma/schema.prisma) - Source of truth

### Testing
- [Implementation Plan § Testing Strategy](./docs/planning/01-IMPLEMENTATION_PLAN.md#-testing-strategy)
- [Troubleshooting Guide](./docs/guides/TROUBLESHOOTING.md) (TBD)

---

## 📊 BY IMPLEMENTATION PHASE

### Phase 1: Foundation (Weeks 1-2)
**Documents:**
- [Implementation Plan § Phase 1](./docs/planning/01-IMPLEMENTATION_PLAN.md#phase-1-foundation-week-1-2-)
- [Developer Guide § PWA Setup](./docs/guides/DEVELOPER_GUIDE.md) (TBD)

**Code:**
- `lib/pglite-client.ts` (TBD)
- Service Worker setup (TBD)

### Phase 2: Authentication (Week 2)
**Documents:**
- [Implementation Plan § Phase 2](./docs/planning/01-IMPLEMENTATION_PLAN.md#phase-2-offline-authentication-week-2-)

**Code:**
- `lib/offline-auth.ts` (TBD)
- Login component modifications (TBD)

### Phase 3: Core Features (Weeks 3-4)
**Documents:**
- [Implementation Plan § Phase 3](./docs/planning/01-IMPLEMENTATION_PLAN.md#phase-3-core-offline-features-week-3-4-)
- [Payment System](./docs/technical/PAYMENT_SYSTEM.md)

**Code:**
- `components/OfflinePaymentSelector.tsx` (TBD)
- `lib/offline-dal.ts` - Data access layer (TBD)

### Phase 4: Sync Engine (Weeks 4-5)
**Documents:**
- [Implementation Plan § Phase 4](./docs/planning/01-IMPLEMENTATION_PLAN.md#phase-4-sync-engine-week-4-5-)
- [Sync Engine Technical Doc](./docs/technical/SYNC_ENGINE.md) (TBD)

**Code:**
- `lib/sync-engine.ts` (TBD)
- `lib/conflict-resolver.ts` (TBD)

### Phase 5: Reports (Week 5)
**Documents:**
- [Implementation Plan § Phase 5](./docs/planning/01-IMPLEMENTATION_PLAN.md#phase-5-reports--analytics-week-5-)

**Code:**
- `examples/offline-reports.tsx` (TBD)

### Phase 6: Testing (Week 6)
**Documents:**
- [Implementation Plan § Testing](./docs/planning/01-IMPLEMENTATION_PLAN.md#-testing-strategy)
- [Troubleshooting Guide](./docs/guides/TROUBLESHOOTING.md) (TBD)

### Phase 7: Rollout (Weeks 7-8)
**Documents:**
- [Implementation Plan § Rollout](./docs/planning/01-IMPLEMENTATION_PLAN.md#-rollout-plan)
- [User Guide](./docs/guides/USER_GUIDE.md) (TBD)
- [Admin Guide](./docs/guides/ADMIN_GUIDE.md) (TBD)

---

## 🎯 BY ROLE

### I'm a Developer
**Start here:**
1. [Implementation Plan](./docs/planning/01-IMPLEMENTATION_PLAN.md)
2. [Payment System](./docs/technical/PAYMENT_SYSTEM.md)
3. [Developer Guide](./docs/guides/DEVELOPER_GUIDE.md) (TBD)

**Frequently needed:**
- Code examples in `examples/`
- Library code in `lib/`
- Component code in `components/`

### I'm a Project Manager
**Start here:**
1. [README.md](./README.md) - Overview
2. [Implementation Plan § Timeline](./docs/planning/01-IMPLEMENTATION_PLAN.md#-implementation-phases)
3. [Roadmap](./docs/planning/ROADMAP.md) (TBD)

**Frequently needed:**
- Status tracking in README
- Risk management section
- Success metrics

### I'm a Designer/UX
**Start here:**
1. [User Guide](./docs/guides/USER_GUIDE.md) (TBD)
2. UI components in `components/`
3. Examples in `examples/`

**Frequently needed:**
- Offline indicator designs
- Sync status UI
- Error states

### I'm QA/Tester
**Start here:**
1. [Implementation Plan § Testing](./docs/planning/01-IMPLEMENTATION_PLAN.md#-testing-strategy)
2. [Troubleshooting Guide](./docs/guides/TROUBLESHOOTING.md) (TBD)

**Frequently needed:**
- Test scenarios
- Known issues
- Testing checklist

### I'm Admin/Owner
**Start here:**
1. [README.md](./README.md)
2. [Admin Guide](./docs/guides/ADMIN_GUIDE.md) (TBD)
3. [Payment System § Admin Menu](./docs/technical/PAYMENT_SYSTEM.md#-admin-menu-kelola-metode-pembayaran)

**Frequently needed:**
- User training materials
- Rollout plan
- Support contacts

### I'm a Kasir/User
**Start here:**
1. [User Guide](./docs/guides/USER_GUIDE.md) (TBD)
2. [Troubleshooting Guide](./docs/guides/TROUBLESHOOTING.md) (TBD)

**Frequently needed:**
- How to use offline mode
- What to do when offline
- Common errors & fixes

---

## 🔗 QUICK LINKS

### Most Important Documents
- 🔥 [Implementation Plan](./docs/planning/01-IMPLEMENTATION_PLAN.md)
- 🔥 [Payment System](./docs/technical/PAYMENT_SYSTEM.md)
- ⚠️ [Correction Summary](./docs/planning/CORRECTION_SUMMARY.md)

### Code Resources
- [Library Code](./lib/)
- [Components](./components/)
- [Examples](./examples/)

### External Resources
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Serwist Docs](https://serwist.pages.dev/)
- [PGLite Docs](https://electric-sql.com/docs/pglite)

---

## 📝 NOTES

### Status Legend
- ✅ Complete
- 🚧 In Progress
- ⏳ Not Started
- 📝 TBD (To Be Documented)
- 🔥 High Priority
- ⚠️ Important

### Document Naming Convention
- `01-`, `02-`, etc. = Sequential order
- `UPPERCASE` = Important documentation
- `lowercase` = Code files
- `.md` = Markdown documentation
- `.ts/.tsx` = TypeScript code

---

**Last Updated:** June 26, 2026  
**Maintained By:** Development Team
