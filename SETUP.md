# Donut Shop POS & Production Management System - Setup Guide

## Overview

This is a complete, production-ready POS (Point of Sale) and Production Management System for a donut shop. The system includes:

- **Username/Password Authentication** for multi-user access
- **POS Module** for processing sales transactions
- **Production Management** for batch tracking
- **Reports & Analytics** for sales insights
- **Inventory Management** for stock tracking
- **Employee Management** for staff organization
- **System Settings** for configuration

## Quick Start

### 1. Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Copy your project URL and API key (anon key)
3. Add to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Create Database Tables

1. Go to the SQL Editor in your Supabase dashboard
2. Copy the entire content from `scripts/00-init-schema.sql`
3. Paste and run it in the SQL Editor
4. All tables, views, and seed data will be created automatically

### 3. Run the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### 4. Login with Demo Credentials

The seed data includes these test accounts (all use password: `password123`):

| Username | Password | Role | Email |
|----------|----------|------|-------|
| admin | password123 | Admin | admin@donutshop.com |
| cashier | password123 | Cashier | cashier@donutshop.com |
| production | password123 | Production Manager | production@donutshop.com |
| owner | password123 | Owner | owner@donutshop.com |

## Project Structure

```
app/
├── layout.tsx                 # Root layout with AuthProvider
├── page.tsx                   # Home/redirect page
├── login/
│   └── page.tsx              # Username/password login page
└── dashboard/
    ├── page.tsx              # Main dashboard
    ├── pos/                  # Point of Sale module
    ├── production/           # Production management
    ├── reports/              # Analytics & reports
    ├── inventory/            # Stock management
    ├── employees/            # Staff management
    └── settings/             # System settings

components/
├── auth/
│   └── pin-login-form.tsx    # Username/password login form
├── pos/
│   ├── pos-interface.tsx     # Main POS screen
│   ├── product-selector.tsx  # Product grid
│   ├── shopping-cart.tsx     # Cart display
│   └── payment-modal.tsx     # Checkout screen
├── production/
│   ├── production-dashboard.tsx
│   ├── production-batch-card.tsx
│   ├── create-batch-modal.tsx
│   └── update-batch-modal.tsx
├── reports/
│   └── reports-dashboard.tsx # Analytics view
└── dashboard/
    ├── dashboard-nav.tsx
    └── quick-stats.tsx

lib/
├── types.ts                  # TypeScript interfaces
├── db.ts                     # Database service layer
└── context/
    └── auth-context.tsx      # Authentication context

scripts/
└── 00-init-schema.sql        # Database schema
```

## Features by Module

### POS System (Cashier)
- Product browsing by category
- Add items to cart
- Adjust quantities
- Support for cash, card, and mobile payment methods
- Automatic inventory deduction
- Transaction number generation
- Sales receipt generation

### Production Management (Production Manager)
- Create production batches
- Track batch progress
- Update production quantities
- Quality check workflow
- Status tracking (Planned → In Progress → QC → Completed)

### Reports & Analytics (Owner)
- Daily sales summary
- Top-selling products
- Payment method breakdown
- Net profit calculation
- Transaction history

### Inventory (Admin)
- Real-time stock levels
- Reorder level alerts
- Stock status indicators (Low/Normal/High)
- Product categories

### Employee Management (Admin)
- Add/remove employees
- Assign roles and permissions
- PIN management
- Activity tracking
- Last login timestamps

### Settings (Admin/Owner)
- Shop name
- Tax rate configuration
- Currency settings
- Operating hours

## Database Schema

### Core Tables

- **users**: Employee accounts with PIN-based authentication
- **products**: Product catalog with pricing and stock
- **product_categories**: Product organization
- **transactions**: Sales records
- **transaction_items**: Line items for each sale
- **production_batches**: Manufacturing orders
- **production_logs**: Batch activity history
- **stock_adjustments**: Inventory corrections
- **stock_movements**: Stock in/out tracking
- **employee_shifts**: Staff scheduling
- **daily_reports**: Daily sales summaries
- **shop_settings**: System configuration

### Database Views

- **v_daily_sales_summary**: Daily aggregated sales
- **v_product_sales_ranking**: Product performance
- **v_inventory_status**: Stock status overview

## Authentication & Security

### Current Implementation
- PIN-based login (4-digit codes)
- localStorage session storage
- Role-based access control
- Protected routes with AuthProvider

### For Production Deployment
Consider upgrading to:
- Supabase Auth with email/password
- HTTP-only secure cookies
- Row-Level Security (RLS) policies
- Rate limiting on login attempts

## Customization

### Add a New Product
1. Go to Inventory module
2. Or directly insert into `products` table in Supabase

### Change Tax Rate
1. Go to Settings module
2. Update the Tax Rate field
3. New transactions will use the updated rate

### Add New Employee
1. Go to Employee Management
2. Click "Add Employee"
3. Set PIN (4 digits), name, and role
4. They can now login with that PIN

### Modify Product Stock
Update directly in Supabase or create stock adjustments through the admin interface.

## Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxx
```

## Performance Notes

- Uses Next.js App Router with Server Components where possible
- Client-side caching with SWR for data fetching
- Optimized database queries with indexes
- Responsive design (mobile-first approach)
- Target: <2s initial load, <500ms interactions

## Future Enhancements

- [ ] Receipt printing integration
- [ ] Customer loyalty program
- [ ] SMS/Email notifications
- [ ] Multi-branch support
- [ ] Advanced analytics dashboard
- [ ] Backup and restore functionality
- [ ] Audit logs for compliance
- [ ] Mobile app (React Native)
- [ ] Real-time sync across multiple terminals
- [ ] Barcode scanning for products

## Troubleshooting

### Can't connect to Supabase
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Check that your Supabase project is active
- Ensure the database tables have been created from the SQL script

### Login not working
- Verify PIN is exactly 4 digits
- Check that user exists in the `users` table with correct PIN
- Review browser console for errors

### No products showing
- Check that products table has been populated
- Verify categories exist and are linked to products
- Confirm products have `is_active = true`

### Stock not updating
- Ensure transaction was created successfully
- Check that product exists in database
- Verify sufficient stock before transaction

## Support & Feedback

For issues or feature requests, please reach out to the development team.

## License

This system is proprietary software. All rights reserved.

---

**Version**: 1.0.0  
**Last Updated**: March 2026
