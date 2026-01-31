# Memento - Todo/Calendar App PRD

## Overview
Build a minimalist personal todo/calendar app inspired by inprogress.works with a 3-column layout using React + basic CSS with Supabase backend.

---

## Design

### Layout Structure
```
┌─────────────────┬─────────────────────────────────┬─────────────────────┐
│   LEFT SIDEBAR  │         MIDDLE CALENDAR         │   RIGHT SIDEBAR     │
│   (~250px)      │         (flexible)              │   (~300px)          │
├─────────────────┼─────────────────────────────────┼─────────────────────┤
│ - Profile card  │ - Month/Year header             │ - "Today" section   │
│ - Avatar        │ - "Weeks of Jan 1 - Dec 31"     │ - Selected date     │
│ - Name/bio      │ - Week-based yearly calendar    │ - Time-based events │
│ - Location      │ - GitHub-style heatmap colors   │ - Todo items        │
│ - Activity grid │ - Click to select date          │ - Categories/tags   │
│ - Entry input   │                                 │ - Checkboxes        │
└─────────────────┴─────────────────────────────────┴─────────────────────┘
```

### Key Features
1. **Calendar**: Yearly view showing all 52 weeks, green intensity = activity level
2. **Entry input**: Add todos/events for selected date
3. **Right sidebar**: Shows entries for selected date with checkboxes, times, categories
4. **Activity heatmap**: GitHub-style contribution graph on left sidebar

---

## Tech Stack
- **Frontend**: React 18 + Vite
- **Styling**: Plain CSS
- **Backend**: Supabase (PostgreSQL + real-time)
- **Date handling**: date-fns
- **Calendar**: Weeks start on Monday (ISO standard)

---

## Implementation Phases

### Phase 1: Project Setup
- [x] Initialize Vite + React project
- [x] Install dependencies: `@supabase/supabase-js`, `date-fns`
- [ ] Create Supabase project and tables (USER ACTION REQUIRED)
- [x] Set up environment variables (.env.example created)
- [x] Create Supabase client

### Phase 2: Core Layout
- [x] Build 3-column CSS grid layout in App.jsx/App.css
- [x] Create placeholder components for each section
- [x] Implement responsive design (stack on mobile)

### Phase 3: Calendar Component
- [x] Build yearly calendar showing all months
- [x] Calculate correct dates for each week/day
- [x] Implement date selection (click handler)
- [x] Add green intensity based on entry count
- [x] Highlight current date and selected date

### Phase 4: Data Layer
- [x] Implement `useEntries` hook with Supabase queries
- [x] Fetch entries for selected date
- [x] Fetch activity counts for heatmap
- [x] Create entry (add)
- [x] Update entry (toggle complete)
- [x] Delete entry

### Phase 5: Left Sidebar
- [x] Profile card (name, bio, location)
- [x] Activity grid (GitHub-style heatmap)
- [x] Entry input form

### Phase 6: Right Sidebar
- [x] "Today" section header
- [x] Display entries grouped by type (events with times, todos)
- [x] Checkbox toggle for todos
- [x] Category badges
- [x] Delete functionality

### Phase 7: Polish
- [x] Loading states
- [x] Empty states
- [ ] Animations (subtle)
- [ ] Final styling adjustments

---

## Project Structure

```
memento/
├── index.html
├── package.json
├── vite.config.js
├── .env                          # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── src/
│   ├── main.jsx                  # Entry point
│   ├── App.jsx                   # Main app with 3-column layout
│   ├── App.css                   # Global styles & layout
│   ├── lib/
│   │   └── supabase.js           # Supabase client init
│   ├── components/
│   │   ├── LeftSidebar/
│   │   │   ├── LeftSidebar.jsx
│   │   │   └── LeftSidebar.css
│   │   ├── Calendar/
│   │   │   ├── Calendar.jsx
│   │   │   └── Calendar.css
│   │   ├── RightSidebar/
│   │   │   ├── RightSidebar.jsx
│   │   │   └── RightSidebar.css
│   │   ├── EntryInput/
│   │   │   ├── EntryInput.jsx
│   │   │   └── EntryInput.css
│   │   ├── EntryItem/
│   │   │   ├── EntryItem.jsx
│   │   │   └── EntryItem.css
│   │   └── ActivityGrid/
│   │       ├── ActivityGrid.jsx
│   │       └── ActivityGrid.css
│   └── hooks/
│       └── useEntries.js
```

---

## Database Schema

### Table: `entries`
```sql
CREATE TABLE entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entry_type TEXT DEFAULT 'todo' CHECK (entry_type IN ('todo', 'event')),
  time TIME,
  category TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entries_date ON entries(date);
```

### Table: `profile`
```sql
CREATE TABLE profile (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name TEXT DEFAULT 'Your Name',
  bio TEXT DEFAULT 'Your bio here',
  location TEXT DEFAULT 'Your location',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO profile (name, bio, location)
VALUES ('Your Name', 'Your bio here', 'Your location');
```

### RLS Policies (enable anonymous access)
```sql
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on entries" ON entries FOR ALL USING (true);
CREATE POLICY "Allow all operations on profile" ON profile FOR ALL USING (true);
```

---

## CSS Color Palette

Activity intensity levels (green):
- Level 0: `#ebedf0` (no activity)
- Level 1: `#9be9a8`
- Level 2: `#40c463`
- Level 3: `#30a14e`
- Level 4: `#216e39` (high activity)

---

## Supabase Setup

1. Go to https://supabase.com and create project named `memento`
2. Go to Settings → API
3. Copy "Project URL" → `VITE_SUPABASE_URL`
4. Copy "anon public" key → `VITE_SUPABASE_ANON_KEY`
5. Go to SQL Editor and run the schema SQL above
