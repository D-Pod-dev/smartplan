# Setup Instructions to Fix Duplicate Tasks

## CRITICAL: You Must Run This SQL Script in Supabase

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New Query**
5. Copy and paste **ONLY the TASKS table section** below:

```sql
-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users,
  title TEXT NOT NULL,
  due_date TEXT,
  due_time TEXT,
  priority TEXT DEFAULT 'None',
  tags TEXT[] DEFAULT '{}',
  completed BOOLEAN DEFAULT FALSE,
  completed_date TEXT,
  time_allocated INTEGER,
  objective TEXT,
  goal_id TEXT,
  recurrence JSONB DEFAULT '{"type":"None","interval":null,"unit":"day","daysOfWeek":[]}'::jsonb,
  in_today BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);

-- RLS policies for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_deny_anon" ON tasks;
DROP POLICY IF EXISTS "tasks_select_authenticated" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_authenticated" ON tasks;
DROP POLICY IF EXISTS "tasks_update_authenticated" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_authenticated" ON tasks;
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Anonymous users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Anonymous users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Anonymous users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
DROP POLICY IF EXISTS "Anonymous users can delete their own tasks" ON tasks;

CREATE POLICY "tasks_user_policy"
  ON tasks
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Trigger for auto-updating updated_at on tasks
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

6. Click **Run** button
7. Wait for success message

## After Running SQL

1. **Clear Browser Data:**
   - Open DevTools (F12)
   - Go to Application tab
   - Click Storage → LocalStorage
   - Delete `smartplan.tasks` entry
   - Refresh page

2. **Test:**
   - Ask AI to create a task
   - Edit the task (change title, priority, etc.)
   - Verify only ONE task appears (not duplicated)
   - Refresh page
   - Verify task persists

## Why This Fixes It

- **Old approach:** Used unreliable upsert that created duplicates
- **New approach:** Clears all old tasks, then inserts fresh - prevents duplicates completely
- **Database:** Tasks table now exists with proper schema to support this

If you're still seeing duplicates after this, the SQL script didn't run successfully.
