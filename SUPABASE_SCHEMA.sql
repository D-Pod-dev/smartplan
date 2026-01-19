-- SmartPlan Supabase Database Schema
-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);

-- RLS policies for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_deny_anon" ON conversations;
DROP POLICY IF EXISTS "conversations_select_authenticated" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;
DROP POLICY IF EXISTS "conversations_update_authenticated" ON conversations;
DROP POLICY IF EXISTS "conversations_delete_authenticated" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Anonymous users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON conversations;
DROP POLICY IF EXISTS "Anonymous users can insert their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Anonymous users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;
DROP POLICY IF EXISTS "Anonymous users can delete their own conversations" ON conversations;
DROP POLICY IF EXISTS "Enable authenticated users to manage their own conversations" ON conversations;

CREATE POLICY "conversations_user_policy"
  ON conversations
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- USER SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_deny_anon" ON user_settings;
DROP POLICY IF EXISTS "settings_select_authenticated" ON user_settings;
DROP POLICY IF EXISTS "settings_insert_authenticated" ON user_settings;
DROP POLICY IF EXISTS "settings_update_authenticated" ON user_settings;
DROP POLICY IF EXISTS "settings_delete_authenticated" ON user_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Anonymous users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Anonymous users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Anonymous users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON user_settings;
DROP POLICY IF EXISTS "Anonymous users can delete their own settings" ON user_settings;
DROP POLICY IF EXISTS "Enable authenticated users to manage their own settings" ON user_settings;

CREATE POLICY "settings_user_policy"
  ON user_settings
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  due_date TEXT,
  target TEXT,
  target_unit TEXT,
  custom_unit TEXT,
  progress TEXT DEFAULT '0',
  priority TEXT DEFAULT 'none',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_updated_at ON goals(updated_at);

-- RLS policies for goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_deny_anon" ON goals;
DROP POLICY IF EXISTS "goals_select_authenticated" ON goals;
DROP POLICY IF EXISTS "goals_insert_authenticated" ON goals;
DROP POLICY IF EXISTS "goals_update_authenticated" ON goals;
DROP POLICY IF EXISTS "goals_delete_authenticated" ON goals;
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Anonymous users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
DROP POLICY IF EXISTS "Anonymous users can insert their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Anonymous users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;
DROP POLICY IF EXISTS "Anonymous users can delete their own goals" ON goals;
DROP POLICY IF EXISTS "Enable authenticated users to manage their own goals" ON goals;

CREATE POLICY "goals_user_policy"
  ON goals
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- FOCUS QUEUE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS focus_queue (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  queue JSONB DEFAULT '[]'::jsonb,
  current_index INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for focus queue
ALTER TABLE focus_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "focus_queue_deny_anon" ON focus_queue;
DROP POLICY IF EXISTS "focus_queue_select_authenticated" ON focus_queue;
DROP POLICY IF EXISTS "focus_queue_insert_authenticated" ON focus_queue;
DROP POLICY IF EXISTS "focus_queue_update_authenticated" ON focus_queue;
DROP POLICY IF EXISTS "focus_queue_delete_authenticated" ON focus_queue;
DROP POLICY IF EXISTS "Users can view their own focus queue" ON focus_queue;
DROP POLICY IF EXISTS "Anonymous users can view their own focus queue" ON focus_queue;
DROP POLICY IF EXISTS "Users can insert their own focus queue" ON focus_queue;
DROP POLICY IF EXISTS "Anonymous users can insert their own focus queue" ON focus_queue;
DROP POLICY IF EXISTS "Users can update their own focus queue" ON focus_queue;
DROP POLICY IF EXISTS "Anonymous users can update their own focus queue" ON focus_queue;
DROP POLICY IF EXISTS "Users can delete their own focus queue" ON focus_queue;
DROP POLICY IF EXISTS "Anonymous users can delete their own focus queue" ON focus_queue;
DROP POLICY IF EXISTS "Enable authenticated users to manage their own focus queue" ON focus_queue;

CREATE POLICY "focus_queue_user_policy"
  ON focus_queue
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- INSIGHTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_insights (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  flow_score NUMERIC DEFAULT 0,
  flow_score_trend NUMERIC DEFAULT 0,
  tasks_completed_today INTEGER DEFAULT 0,
  tasks_completed_this_week INTEGER DEFAULT 0,
  time_saved_hours NUMERIC DEFAULT 0,
  time_saved_tasks INTEGER DEFAULT 0,
  focus_ratio NUMERIC DEFAULT 0,
  focus_ratio_date TEXT,
  streak_days INTEGER DEFAULT 0,
  last_update_date TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for insights
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insights_deny_anon" ON user_insights;
DROP POLICY IF EXISTS "insights_select_authenticated" ON user_insights;
DROP POLICY IF EXISTS "insights_insert_authenticated" ON user_insights;
DROP POLICY IF EXISTS "insights_update_authenticated" ON user_insights;
DROP POLICY IF EXISTS "insights_delete_authenticated" ON user_insights;
DROP POLICY IF EXISTS "Users can view their own insights" ON user_insights;
DROP POLICY IF EXISTS "Anonymous users can view their own insights" ON user_insights;
DROP POLICY IF EXISTS "Users can insert their own insights" ON user_insights;
DROP POLICY IF EXISTS "Anonymous users can insert their own insights" ON user_insights;
DROP POLICY IF EXISTS "Users can update their own insights" ON user_insights;
DROP POLICY IF EXISTS "Anonymous users can update their own insights" ON user_insights;
DROP POLICY IF EXISTS "Users can delete their own insights" ON user_insights;
DROP POLICY IF EXISTS "Anonymous users can delete their own insights" ON user_insights;
DROP POLICY IF EXISTS "Enable authenticated users to manage their own insights" ON user_insights;

CREATE POLICY "insights_user_policy"
  ON user_insights
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- TAGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_tags (
  user_id UUID REFERENCES auth.users NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);

-- RLS policies for tags
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags_deny_anon" ON user_tags;
DROP POLICY IF EXISTS "tags_select_authenticated" ON user_tags;
DROP POLICY IF EXISTS "tags_insert_authenticated" ON user_tags;
DROP POLICY IF EXISTS "tags_delete_authenticated" ON user_tags;
DROP POLICY IF EXISTS "Users can view their own tags" ON user_tags;
DROP POLICY IF EXISTS "Anonymous users can view their own tags" ON user_tags;
DROP POLICY IF EXISTS "Users can insert their own tags" ON user_tags;
DROP POLICY IF EXISTS "Anonymous users can insert their own tags" ON user_tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON user_tags;
DROP POLICY IF EXISTS "Anonymous users can delete their own tags" ON user_tags;
DROP POLICY IF EXISTS "Enable authenticated users to manage their own tags" ON user_tags;

CREATE POLICY "tags_user_policy"
  ON user_tags
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public;

-- Triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_focus_queue_updated_at ON focus_queue;
CREATE TRIGGER update_focus_queue_updated_at
  BEFORE UPDATE ON focus_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_insights_updated_at ON user_insights;
CREATE TRIGGER update_user_insights_updated_at
  BEFORE UPDATE ON user_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
