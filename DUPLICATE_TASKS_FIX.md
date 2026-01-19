# Fix for Duplicate Tasks on Edit

## Problem

Editing AI-created tasks was causing duplicate tasks to appear. This happened because:

1. **Missing Tasks Table**: The `tasks` table was completely missing from the Supabase schema
2. **Type Mismatch**: Task IDs were stored as numbers in JavaScript but the schema expected TEXT
3. **Broken Upsert**: Without the proper table schema and composite key, the upsert operation failed
4. **Silent Failure**: Upsert errors were logged but not fatal, leaving tasks in localStorage only
5. **Duplicate on Reload**: When tasks were reloaded from Supabase (which had no data), new tasks were created again

## Root Cause Analysis

### 1. Missing Tasks Table
The `SUPABASE_SCHEMA.sql` file had definitions for conversations, goals, focus_queue, etc., but **no tasks table**. 

This meant:
- Tasks were synced to localStorage only
- Supabase sync operations were failing silently
- On app reload, tasks would be reconstructed

### 2. Type Inconsistency  
Tasks used numeric IDs from `Date.now()`:
```javascript
id: Date.now()  // Returns a number like 1705696200123
```

But when stored in the database as TEXT, type conversion could cause mismatches:
- Numeric ID `1705696200123` stored as TEXT `"1705696200123"`
- Comparison and filtering might fail with type coercion issues

### 3. Broken Delete Filter
The delete query used:
```javascript
.not('id', 'in', `(${ids.join(',')})`)  // No proper escaping
```

This could produce invalid SQL if IDs weren't properly escaped.

## Solution

### 1. Added Tasks Table Schema
Created the missing tasks table in `SUPABASE_SCHEMA.sql`:

```sql
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
  PRIMARY KEY (user_id, id)  -- Composite key prevents duplicates
);
```

**Key aspects:**
- `PRIMARY KEY (user_id, id)`: Composite primary key ensures unique tasks per user
- `id TEXT`: Consistent with TEXT storage
- Proper indexes for performance on `user_id`, `due_date`, `goal_id`, `completed`
- RLS policies for security
- Triggers for auto-updating `updated_at`

### 2. Fixed ID Type Handling
Updated `supabaseTasks.js` to consistently convert IDs to strings:

```javascript
// In toDbTask (sending to DB)
id: String(task.id),  // Convert number to string

// In fromDbTask (reading from DB)
id: Number(row.id) || row.id,  // Convert back to number for app consistency
```

### 3. Fixed Delete Query
Improved the delete query to properly escape IDs:

```javascript
const ids = payload.map((t) => String(t.id))
const { error: deleteError } = await supabase
  .from(TABLE)
  .delete()
  .eq('user_id', userId)
  .not('id', 'in', `(${ids.map(id => `'${id.replace(/'/g, "''")}'`).join(',')})`)
```

This ensures:
- IDs are properly quoted as strings
- Special characters are escaped
- The SQL query is valid

### 4. Updated Documentation
Added the tasks table to `SUPABASE_INTEGRATION.md` so developers know it exists and how it's used.

## Files Modified

1. **SUPABASE_SCHEMA.sql**
   - Added complete tasks table definition
   - Added indexes, RLS policies, and triggers

2. **src/utils/supabaseTasks.js**
   - Convert IDs to strings when saving (prevent type mismatch)
   - Convert IDs back to numbers when loading (maintain app consistency)
   - Fixed delete query with proper escaping

3. **SUPABASE_INTEGRATION.md**
   - Added tasks table to documentation
   - Added tasks to reset data section

## How It Prevents Duplicates

1. **Before Edit:**
   - AI creates task with ID `1705696200123`
   - Stored in Supabase with `id = '1705696200123'` and `user_id = user_uuid`

2. **During Edit:**
   - User edits task (same ID: `1705696200123`)
   - `saveEdit()` updates the task in local state
   - Supabase sync triggers `upsert(payload, { onConflict: 'user_id,id' })`

3. **Upsert Result:**
   - Composite key `(user_id, id)` matches existing task
   - Database **updates** the existing row instead of creating a new one
   - No duplicate is created

4. **Cleanup:**
   - After upsert, delete query removes any old tasks not in current list
   - This ensures data stays clean

## Testing

To verify the fix works:

1. **Setup:**
   - Run `SUPABASE_SCHEMA.sql` to create/update tables
   - Sign in with Supabase authentication

2. **Test Duplicate Prevention:**
   - Ask AI to create a task (e.g., "Create a task to review code")
   - Edit the task (change title, priority, etc.)
   - Verify only one task exists (check browser console or database)

3. **Test Data Integrity:**
   - Create multiple AI tasks
   - Edit several of them
   - Refresh the page
   - Verify all tasks load correctly with no duplicates

4. **Check Logs:**
   - Open browser console
   - Look for `[Supabase Sync]` logs
   - Verify "Save successful" messages with no "Save error" messages

## Future Considerations

1. Consider using UUID for task IDs instead of `Date.now()` for better database practices
2. Add migration script to de-duplicate existing tasks if needed
3. Consider adding unique constraint on `(user_id, title, due_date)` to prevent duplicates from other sources
