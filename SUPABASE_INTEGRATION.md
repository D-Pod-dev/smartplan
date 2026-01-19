# Supabase Integration Guide for SmartPlan

This guide explains how Supabase storage has been integrated into SmartPlan for syncing conversations, settings, goals, tags, insights, and focus queue across devices.

## 🚀 Quick Setup

### 1. Create Supabase Tables

Run the SQL script in your Supabase SQL Editor:

```bash
# The complete SQL schema is in SUPABASE_SCHEMA.sql
```

Open your Supabase project dashboard → SQL Editor → paste the contents of `SUPABASE_SCHEMA.sql` and run it.

### 2. Environment Variables

Make sure your `.env` file contains:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. That's It!

The integration is already complete. All data will automatically sync when users are authenticated.

## 📊 What Gets Synced

### ✅ Currently Integrated

1. **Tasks** - Already had Supabase sync via `useSupabaseTaskSync`
2. **Conversations** - AI chat conversations with messages
3. **Settings** - User preferences (focus timer, dev panel, etc.)
4. **Goals** - User goals with progress tracking
5. **Tags** - Custom tags for organizing tasks
6. **Insights** - Analytics and metrics data
7. **Focus Queue** - Focus mode task queue and current index

### 📁 Files Created

#### Utility Files (Data Access Layer)
- `src/utils/supabaseConversations.js` - Conversation CRUD operations
- `src/utils/supabaseSettings.js` - Settings read/write operations
- `src/utils/supabaseGoals.js` - Goals management
- `src/utils/supabaseTags.js` - Tags management
- `src/utils/supabaseInsights.js` - Insights tracking
- `src/utils/supabaseFocusQueue.js` - Focus queue management

#### Custom Hooks (Integration Layer)
- `src/hooks/useSupabaseSync.js` - Generic sync hook (used by all below)
- `src/hooks/useSupabaseConversations.js` - Conversations sync
- `src/hooks/useSupabaseSettings.js` - Settings sync
- `src/hooks/useSupabaseGoals.js` - Goals sync
- `src/hooks/useSupabaseTags.js` - Tags sync
- `src/hooks/useSupabaseInsights.js` - Insights sync
- `src/hooks/useSupabaseFocusQueue.js` - Focus queue sync

## 🔄 How Syncing Works

### Automatic Sync Flow

1. **Initial Load**: When user logs in, data is loaded from Supabase
2. **Fallback**: If no Supabase data exists, localStorage data is uploaded
3. **Real-time Updates**: Changes are debounced and synced to Supabase
4. **Dual Storage**: Data is saved to both localStorage (immediate) and Supabase (synced)

### Sync States

Each hook returns a `syncStatus`:
- `idle` - No sync in progress
- `loading` - Initial load from Supabase
- `syncing` - Saving changes to Supabase
- `error` - Sync failed (falls back to localStorage)

### Example Usage

```javascript
import { useSupabaseTags } from './hooks/useSupabaseTags'

function MyComponent() {
  const [tags, setTags] = useState([])
  const { syncStatus, syncError } = useSupabaseTags(tags)
  
  // syncStatus will be 'idle', 'loading', 'syncing', or 'error'
  // syncError contains error message if status is 'error'
  
  return <div>Tags: {tags.length}</div>
}
```

## 🗄️ Database Schema

### Tables Created

1. **conversations** - Stores AI chat conversations
   - `id` (TEXT, PK)
   - `user_id` (UUID, FK to auth.users)
   - `title` (TEXT)
   - `messages` (JSONB)
   - `created_at`, `updated_at` (TIMESTAMPTZ)

2. **user_settings** - User preferences
   - `user_id` (UUID, PK, FK to auth.users)
   - `settings` (JSONB)
   - `updated_at` (TIMESTAMPTZ)

3. **goals** - User goals
   - `id` (TEXT, PK)
   - `user_id` (UUID, FK to auth.users)
   - `title`, `due_date`, `target`, `target_unit`, etc.
   - `tags` (TEXT[])
   - `created_at`, `updated_at` (TIMESTAMPTZ)

4. **focus_queue** - Focus mode queue
   - `user_id` (UUID, PK, FK to auth.users)
   - `queue` (JSONB array of tasks)
   - `current_index` (INTEGER)
   - `updated_at` (TIMESTAMPTZ)

5. **user_insights** - Analytics metrics
   - `user_id` (UUID, PK, FK to auth.users)
   - `flow_score`, `tasks_completed_today`, etc.
   - `updated_at` (TIMESTAMPTZ)

6. **user_tags** - Custom tags
   - `user_id`, `tag` (composite PK)
   - `created_at` (TIMESTAMPTZ)

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Policies for SELECT, INSERT, UPDATE, DELETE operations
- Uses `auth.uid()` to match `user_id`

## 🎯 Integration Points

### App.jsx
- Syncs `tags` and `goals` at the app level

### SmartPlan.jsx (Chat page)
- Syncs `conversations` with all messages
- Syncs `tasks` (already had this)

### Insights.jsx
- Syncs `insights` metrics

### Focus.jsx
- Syncs `focusQueue` and `currentQueueIndex`

### Settings.jsx
- Syncs `focusSettings` and `devPanel` settings

## 🔧 Customization

### Adjust Debounce Time

Each hook accepts a `debounceMs` parameter (default varies by data type):

```javascript
useSupabaseSync({
  // ... other params
  debounceMs: 2000, // Wait 2 seconds before syncing
})
```

### Disable Syncing

Pass `enabled: false` to temporarily disable sync:

```javascript
const { syncStatus } = useSupabaseTags(tags, { enabled: false })
```

## 🐛 Troubleshooting

### Data not syncing?

1. Check browser console for errors
2. Verify Supabase credentials in `.env`
3. Ensure user is authenticated (`user` object exists)
4. Check `syncStatus` for error state

### Data conflicts?

- Supabase data takes precedence on initial load
- localStorage is used as fallback if Supabase fails
- Last write wins for updates

### Reset user data?

```sql
-- Run in Supabase SQL Editor (replace with user's UUID)
DELETE FROM conversations WHERE user_id = 'user-uuid';
DELETE FROM user_settings WHERE user_id = 'user-uuid';
DELETE FROM goals WHERE user_id = 'user-uuid';
DELETE FROM focus_queue WHERE user_id = 'user-uuid';
DELETE FROM user_insights WHERE user_id = 'user-uuid';
DELETE FROM user_tags WHERE user_id = 'user-uuid';
```

## 📝 Notes

- All sync operations are non-blocking
- Errors are logged to console but don't break the app
- localStorage always works as fallback
- Sync happens automatically - no manual save buttons needed
- Data transformations handle schema differences between app and DB

## 🔐 Security

- All tables protected with Row Level Security (RLS)
- Users can only access their own data
- Anonymous users get a temporary user_id
- JSONB fields validated by application code

## 🚦 Migration Path

For existing users with localStorage data:
1. User signs in
2. Hook detects no Supabase data
3. Automatically uploads localStorage data to Supabase
4. Future changes sync bidirectionally

No data loss during migration!
