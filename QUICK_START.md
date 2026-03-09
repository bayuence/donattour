# Quick Start Guide - Donut Shop POS

## 3-Step Setup

### Step 1: Set Up Supabase (2 minutes)
```
1. Visit supabase.com → Create Account → New Project
2. Wait for project to be ready
3. Go to Settings → API → Copy:
   - Project URL
   - anon key (public)
```

### Step 2: Add Environment Variables
Create `.env.local` in project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 3: Create Database
```
1. In Supabase, go to SQL Editor
2. Open file: scripts/00-init-schema.sql
3. Copy ALL content
4. Paste into SQL Editor
5. Click RUN
6. Wait for completion (30 seconds)
```

## Start Application
```bash
npm install
npm run dev
```

Open http://localhost:3000

## Demo Login Credentials

| Username | Password | Role | Use Case |
|----------|----------|------|----------|
| cashier | password123 | Cashier | Test POS sales |
| production | password123 | Production Manager | Test batches |
| owner | password123 | Owner | Test reports |
| admin | password123 | Admin | Full access |

## Main Features to Test

### 1. POS (Sales)
- Dashboard → POS System
- Click products to add to cart
- Adjust quantities
- Checkout → Select payment → Complete

### 2. Production
- Dashboard → Production
- Create Batch → Select product → Set quantity
- Update quantity as you produce
- Move through workflow (In Progress → QC → Complete)

### 3. Reports
- Dashboard → Reports
- Select date
- View sales metrics
- See top-selling products

### 4. Inventory
- Dashboard → Inventory
- View stock levels
- See reorder alerts

### 5. Employees
- Dashboard → Employees
- Add new staff with PIN
- Assign roles

### 6. Settings
- Dashboard → Settings
- Update shop name
- Adjust tax rate
- Set operating hours

## File Locations

| What | Where |
|------|-------|
| Database Schema | `/scripts/00-init-schema.sql` |
| Database Service | `/lib/db.ts` |
| Types | `/lib/types.ts` |
| Auth | `/lib/context/auth-context.tsx` |
| POS | `/components/pos/` |
| Production | `/components/production/` |
| Reports | `/components/reports/` |

## Common Tasks

### Change Tax Rate
Settings → Tax Rate (%) → Save

### Add New Product
Database: Insert into `products` table OR
Setup seed data before running SQL

### Add New Employee
Employees → Add Employee → Fill form → Create

### Logout
Click username at top → Logout

## Troubleshooting

**Can't login?**
- Check username and password are correct
- Verify database was created
- Check console for errors
- Try username: `cashier`, password: `password123`

**No products showing?**
- Verify SQL script was run
- Check products table in Supabase

**Can't see sales history?**
- Try logging in as admin (PIN: 0000)
- Check transaction table exists

## Next: Customization

1. Replace demo products with real ones
2. Update shop name in settings
3. Add your employees with username/password
4. Set correct tax rate
5. Configure operating hours

## Help

Check these files:
- SETUP.md (Detailed setup)
- IMPLEMENTATION.md (Technical overview)
- app/dashboard/page.tsx (Dashboard logic)

## Production Deployment

Ready to deploy? 
- Set env vars in Vercel
- Deploy via GitHub or Vercel CLI
- Database will work automatically

---

**Stuck?** Check SETUP.md for detailed troubleshooting.
