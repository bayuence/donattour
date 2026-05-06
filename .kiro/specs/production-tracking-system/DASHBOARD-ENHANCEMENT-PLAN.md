# 🚀 Dashboard Enhancement Plan - Multi-Outlet & Multi-Channel

## 🎯 Problem Statement

**Current State:**
- ❌ Dashboard hanya bisa lihat 1 outlet per waktu (via query param `outlet_id`)
- ❌ Tidak ada filter outlet yang jelas di UI
- ❌ Tidak ada breakdown per channel (Toko, GoFood, GrabFood, ShopeeFood, dll)
- ❌ Tidak scalable untuk ribuan outlet
- ❌ Owner tidak bisa compare performa antar outlet

**User Scenario:**
> "Saya punya 1000 outlet. Setiap outlet punya 5 channel penjualan (Toko, GoFood, GrabFood, ShopeeFood, TikTok). Saya mau lihat:
> 1. **Dashboard Universal** - Total semua outlet
> 2. **Dashboard Per Outlet** - Detail 1 outlet
> 3. **Dashboard Per Channel** - Performa per channel
> 4. **Comparison** - Compare outlet A vs B vs C"

---

## 📊 Proposed Solution

### **3 Level Dashboard:**

#### 1. **Dashboard Universal (All Outlets)** 🌍
- Aggregate data dari **SEMUA outlet**
- Total omzet, profit, loss seluruh bisnis
- Top 10 outlet terbaik/terburuk
- Trend performa bisnis

#### 2. **Dashboard Per Outlet** 🏪
- Filter 1 outlet spesifik
- Detail lengkap outlet tersebut
- Breakdown per channel (Toko, GoFood, dll)
- Comparison dengan outlet lain

#### 3. **Dashboard Per Channel** 📱
- Filter per channel (misal: hanya GoFood)
- Aggregate semua outlet untuk channel tersebut
- Performa channel across outlets

---

## 🎨 UI/UX Design

### **Filter Bar (Top of Dashboard)**

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard Owner                                    06/05/2026  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📍 Outlet:  [Semua Outlet ▼]  📱 Channel: [Semua Channel ▼]  │
│                                                                  │
│  Quick Filter:                                                   │
│  [ Semua ]  [ Top 10 ]  [ Bottom 10 ]  [ Favorit ]             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### **Dropdown Options:**

**Outlet Dropdown:**
```
┌─────────────────────────────┐
│ 🌍 Semua Outlet (1000)      │ ← Default
├─────────────────────────────┤
│ 🏪 Donattour K3PG           │
│ 🏪 Donattour Sudirman       │
│ 🏪 Donattour Senayan        │
│ ... (search untuk 1000+)    │
└─────────────────────────────┘
```

**Channel Dropdown:**
```
┌─────────────────────────────┐
│ 📱 Semua Channel            │ ← Default
├─────────────────────────────┤
│ 🏪 Toko (Walk-in)           │
│ 🍔 GoFood                   │
│ 🚗 GrabFood                 │
│ 🛒 ShopeeFood               │
│ 🎵 TikTok Shop              │
│ 📦 Custom Channel           │
└─────────────────────────────┘
```

---

## 📋 Implementation Tasks

### **Task 7.8: Multi-Outlet Dashboard Filter** (NEW)

**Subtasks:**

- [ ] 7.8.1 Create outlet selector component
  - Dropdown with search (untuk 1000+ outlet)
  - Show outlet name + location
  - "Semua Outlet" option (default)
  - Save selected outlet to localStorage
  - Auto-load last selected outlet

- [ ] 7.8.2 Create channel selector component
  - Dropdown dengan semua channel
  - "Semua Channel" option (default)
  - Dynamic channel list dari database
  - Save selected channel to localStorage

- [ ] 7.8.3 Update dashboard API to support filters
  - Modify GET `/api/dashboard/daily`
  - Add query params: `outlet_id`, `channel`, `mode`
  - Mode options: `single`, `all`, `comparison`
  - Aggregate logic untuk "Semua Outlet"
  - Filter logic untuk channel

- [ ] 7.8.4 Create dashboard mode switcher
  - Button group: [Single Outlet] [All Outlets] [Compare]
  - Show/hide components based on mode
  - Different layout per mode

- [ ] 7.8.5 Build "All Outlets" aggregate view
  - Total cards (sum semua outlet)
  - Top 10 outlet terbaik (by profit)
  - Bottom 10 outlet terburuk (by loss)
  - Map view (optional - show outlet locations)

- [ ] 7.8.6 Build "Compare Outlets" view
  - Multi-select outlet (max 5)
  - Side-by-side comparison table
  - Comparison charts (bar chart)
  - Export comparison to Excel

---

### **Task 7.9: Channel Breakdown Analytics** (NEW)

**Subtasks:**

- [ ] 7.9.1 Add channel breakdown to financial cards
  - Show omzet per channel
  - Show profit per channel
  - Pie chart: revenue by channel

- [ ] 7.9.2 Create channel performance table
  - Table: Channel | Omzet | Orders | Avg Order | Margin
  - Sort by any column
  - Color coding (green/yellow/red)

- [ ] 7.9.3 Add channel filter to all charts
  - Loss breakdown per channel
  - Sales by product per channel
  - Production vs sales per channel

- [ ] 7.9.4 Create channel trend chart
  - Line chart: Omzet per channel over time
  - Compare channel performance
  - Show growth rate per channel

---

### **Task 7.10: Outlet Comparison Dashboard** (NEW)

**Subtasks:**

- [ ] 7.10.1 Create outlet comparison selector
  - Multi-select dropdown (max 5 outlets)
  - "Add to comparison" button
  - "Clear comparison" button

- [ ] 7.10.2 Build comparison table
  - Columns: Metric | Outlet A | Outlet B | Outlet C
  - Rows: Omzet, Profit, Loss, Margin, Waste Rate
  - Highlight best/worst per metric

- [ ] 7.10.3 Create comparison charts
  - Bar chart: Omzet comparison
  - Bar chart: Profit comparison
  - Bar chart: Loss comparison
  - Radar chart: Overall performance

- [ ] 7.10.4 Add comparison insights
  - Auto-generate insights:
    - "Outlet A has 25% higher profit than Outlet B"
    - "Outlet C has lowest waste rate (5%)"
  - Recommendations per outlet

---

### **Task 7.11: Dashboard Performance Optimization** (NEW)

**Subtasks:**

- [ ] 7.11.1 Implement pagination for outlet list
  - Virtual scrolling untuk 1000+ outlet
  - Lazy load outlet data
  - Search dengan debounce

- [ ] 7.11.2 Add caching for aggregate queries
  - Cache "Semua Outlet" data (5 min)
  - Cache per outlet data (1 min)
  - Invalidate cache on new data

- [ ] 7.11.3 Optimize database queries
  - Add composite indexes:
    - `(outlet_id, tanggal, channel)`
    - `(tanggal, channel)`
  - Use materialized views for aggregates
  - Implement query result caching

- [ ] 7.11.4 Add loading states
  - Skeleton loading untuk cards
  - Progressive loading untuk charts
  - Show "Loading X outlets..." message

---

### **Task 7.12: Outlet & Channel Management** (NEW)

**Subtasks:**

- [ ] 7.12.1 Create outlet favorites feature
  - "Add to favorites" button
  - Quick access to favorite outlets
  - Save to user preferences

- [ ] 7.12.2 Create outlet groups
  - Group outlets by region/area
  - Filter by group
  - Aggregate per group

- [ ] 7.12.3 Create custom channel configuration
  - Admin can add/edit channels
  - Set channel colors/icons
  - Enable/disable channels per outlet

- [ ] 7.12.4 Add outlet metadata
  - Outlet location (lat/long)
  - Outlet manager
  - Outlet opening hours
  - Outlet status (active/inactive)

---

## 🗄️ Database Changes

### **New Tables:**

#### 1. `outlet_groups` (NEW)
```sql
CREATE TABLE outlet_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `outlet_group_members` (NEW)
```sql
CREATE TABLE outlet_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES outlet_groups(id) ON DELETE CASCADE,
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, outlet_id)
);
```

#### 3. `user_outlet_favorites` (NEW)
```sql
CREATE TABLE user_outlet_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, outlet_id)
);
```

#### 4. `channels` (NEW)
```sql
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default channels
INSERT INTO channels (slug, name, icon, color) VALUES
    ('toko', 'Toko (Walk-in)', '🏪', 'blue'),
    ('gofood', 'GoFood', '🍔', 'green'),
    ('grabfood', 'GrabFood', '🚗', 'red'),
    ('shopeefood', 'ShopeeFood', '🛒', 'orange'),
    ('tiktok', 'TikTok Shop', '🎵', 'purple');
```

### **Modified Tables:**

#### Update `orders` table
```sql
-- Add index untuk channel filtering
CREATE INDEX idx_orders_outlet_channel_date 
ON orders(outlet_id, channel, created_at DESC);

-- Add index untuk aggregate queries
CREATE INDEX idx_orders_date_channel 
ON orders(DATE(created_at), channel) 
WHERE status = 'completed';
```

---

## 📊 API Changes

### **Modified Endpoints:**

#### GET `/api/dashboard/daily`

**New Query Params:**
```typescript
{
  date: string;              // YYYY-MM-DD
  outlet_id?: string;        // Single outlet or "all"
  channel?: string;          // Single channel or "all"
  mode?: 'single' | 'all' | 'comparison';
  outlet_ids?: string[];     // For comparison mode (max 5)
}
```

**Response for mode="all":**
```typescript
{
  success: true,
  data: {
    aggregate: {
      total_outlets: 1000,
      active_outlets: 950,
      financial_summary: { ... },
      production_sales: { ... },
      loss_breakdown: { ... }
    },
    top_outlets: [ ... ],      // Top 10 by profit
    bottom_outlets: [ ... ],   // Bottom 10 by loss
    by_channel: {
      toko: { omzet, orders, ... },
      gofood: { omzet, orders, ... },
      ...
    }
  }
}
```

**Response for mode="comparison":**
```typescript
{
  success: true,
  data: {
    outlets: [
      { outlet_id, outlet_name, financial_summary, ... },
      { outlet_id, outlet_name, financial_summary, ... },
      ...
    ],
    comparison_matrix: { ... }
  }
}
```

---

### **New Endpoints:**

#### GET `/api/outlets/search`
```typescript
// Search outlets dengan pagination
{
  query: string;
  page: number;
  limit: number;
  group_id?: string;
}
```

#### GET `/api/outlets/favorites`
```typescript
// Get user's favorite outlets
{
  user_id: string;
}
```

#### POST `/api/outlets/favorites`
```typescript
// Add outlet to favorites
{
  outlet_id: string;
}
```

#### GET `/api/channels`
```typescript
// Get all active channels
// Response: [{ id, slug, name, icon, color }, ...]
```

---

## 🎯 Success Criteria

### **Functional Requirements:**
- ✅ Owner bisa lihat dashboard untuk semua outlet sekaligus
- ✅ Owner bisa filter 1 outlet spesifik
- ✅ Owner bisa filter per channel (GoFood, GrabFood, dll)
- ✅ Owner bisa compare max 5 outlet side-by-side
- ✅ Dashboard load < 3 detik untuk 1000 outlet
- ✅ Search outlet dengan autocomplete
- ✅ Save last selected outlet/channel

### **Performance Requirements:**
- ✅ Aggregate query untuk 1000 outlet < 2 detik
- ✅ Single outlet query < 500ms
- ✅ Comparison query (5 outlets) < 1 detik
- ✅ Outlet search dengan autocomplete < 200ms

### **UX Requirements:**
- ✅ Filter bar always visible (sticky)
- ✅ Clear indication of current filter
- ✅ Easy switch between modes
- ✅ Responsive untuk mobile
- ✅ Export comparison to Excel

---

## 📅 Implementation Priority

### **Phase 1: Critical (Must Have)**
1. Task 7.8.1-7.8.3 - Basic outlet & channel filter
2. Task 7.8.5 - "All Outlets" aggregate view
3. Task 7.11.3 - Database optimization

### **Phase 2: Important (Should Have)**
4. Task 7.9.1-7.9.2 - Channel breakdown
5. Task 7.10.1-7.10.2 - Outlet comparison
6. Task 7.11.1-7.11.2 - Performance optimization

### **Phase 3: Nice to Have (Could Have)**
7. Task 7.12.1-7.12.2 - Favorites & groups
8. Task 7.9.3-7.9.4 - Advanced channel analytics
9. Task 7.10.3-7.10.4 - Advanced comparison

---

## 🔧 Technical Considerations

### **Scalability:**
- Use database indexes untuk fast filtering
- Implement caching untuk aggregate queries
- Use virtual scrolling untuk long lists
- Lazy load charts dan heavy components

### **Data Consistency:**
- Aggregate data bisa slightly stale (5 min cache OK)
- Real-time data untuk single outlet view
- Background job untuk pre-calculate aggregates

### **User Experience:**
- Show loading states dengan skeleton
- Progressive loading (cards first, charts later)
- Error handling dengan retry button
- Empty states dengan helpful messages

---

## 📝 Next Steps

1. **Review plan ini dengan user** ✅
2. **Update tasks.md** dengan task 7.8-7.12
3. **Update design.md** dengan UI mockups
4. **Create database migration** untuk new tables
5. **Implement Phase 1** (critical features)
6. **Test dengan 1000 outlet** (load testing)
7. **Get user feedback** dan iterate

---

**Status**: 📋 DRAFT - Waiting for User Approval  
**Created**: 2026-05-06  
**Priority**: 🔥 HIGH - Critical for Scalability
