import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '../App.css'
import { getCurrentDate } from '../utils/dateUtils'
import { calculateFirstOccurrence } from '../utils/recurrenceUtils'
import { useSupabase } from '../contexts/SupabaseProvider'
import { useSupabaseSettings } from '../hooks/useSupabaseSettings'

const deriveFocusSettings = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.settings.focus')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          workDuration: parsed.workDuration ?? 25,
          breakDuration: parsed.breakDuration ?? 5,
          enableBreaks: parsed.enableBreaks ?? true,
        }
      } catch {}
    }
  }
  return { workDuration: 25, breakDuration: 5, enableBreaks: true }
}

export default function Settings({ devPanelEnabled, onToggleDevPanel, devPanelInNav, onToggleDevPanelInNav, devPanelInSidebar, onToggleDevPanelInSidebar }) {
  const [localDevEnabled, setLocalDevEnabled] = useState(devPanelEnabled)
  const [localDevInNav, setLocalDevInNav] = useState(devPanelInNav)
  const [localDevInSidebar, setLocalDevInSidebar] = useState(devPanelInSidebar)
  const [markdownPreviewOpen, setMarkdownPreviewOpen] = useState(false)
  const { user, authReady, authError, signInWithOtp, signInAnonymously, signOut, supabase } = useSupabase()
  const [authEmail, setAuthEmail] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [originalDisplayName, setOriginalDisplayName] = useState('')
  const [editingDisplayName, setEditingDisplayName] = useState(false)
  const provider = user?.app_metadata?.provider
  const isAnonymous = (user?.is_anonymous ?? provider === 'anonymous') === true
  
  const [focusSettings, setFocusSettings] = useState(() => deriveFocusSettings())
  
  // Sync settings with Supabase
  const settingsData = {
    focus: focusSettings,
    devPanel: {
      enabled: localDevEnabled,
      inNav: localDevInNav,
      inSidebar: localDevInSidebar,
    },
  }
  const { syncStatus: settingsSyncStatus } = useSupabaseSettings(settingsData)
  
  const getStoredTaskCount = () => {
    if (typeof localStorage === 'undefined') return 0
    const saved = localStorage.getItem('smartplan.tasks')
    if (!saved) return 0
    try {
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed.length : 0
    } catch {
      return 0
    }
  }
  const [taskCount, setTaskCount] = useState(() => getStoredTaskCount())
  const [dataFlash, setDataFlash] = useState(null)
  const dataFlashTimer = useRef(null)

  const buildSeedTasks = () => {
    const todayIso = getCurrentDate().toISOString().split('T')[0]

    const withFirstOccurrence = (recurrence) => {
      if (!recurrence || recurrence.type === 'None') return todayIso
      return calculateFirstOccurrence(recurrence, todayIso)
    }

    return [
      {
        id: 1,
        title: 'Outline launch checklist',
        recurrence: { type: 'None', interval: null, unit: 'day', daysOfWeek: [] },
        due: { date: withFirstOccurrence({ type: 'None', interval: null, unit: 'day', daysOfWeek: [] }), time: '11:00' },
        tags: ['Launch', 'Planning'],
        priority: 'High',
        completed: false,
        timeAllocated: 90,
        objective: '5 items',
        goalId: null,
        inToday: true,
      },
      {
        id: 2,
        title: 'Reply to customer threads',
        recurrence: { type: 'Daily', interval: null, unit: 'day', daysOfWeek: [] },
        due: { date: withFirstOccurrence({ type: 'Daily', interval: null, unit: 'day', daysOfWeek: [] }), time: '13:00' },
        tags: ['CX', 'Communication'],
        priority: 'Medium',
        completed: false,
        timeAllocated: 45,
        objective: '8 emails',
        goalId: null,
        inToday: true,
      },
      {
        id: 3,
        title: 'Team standup',
        recurrence: { type: 'Weekly', interval: null, unit: 'week', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
        due: { date: withFirstOccurrence({ type: 'Weekly', interval: null, unit: 'week', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }), time: '09:00' },
        tags: ['Meetings'],
        priority: 'High',
        completed: false,
        timeAllocated: 15,
        objective: null,
        goalId: null,
        inToday: true,
      },
      {
        id: 4,
        title: 'Review pull requests',
        recurrence: { type: 'Custom', interval: 2, unit: 'day', daysOfWeek: [] },
        due: { date: withFirstOccurrence({ type: 'Custom', interval: 2, unit: 'day', daysOfWeek: [] }), time: '15:30' },
        tags: ['Development', 'Code Review'],
        priority: 'Medium',
        completed: false,
        timeAllocated: 60,
        objective: '3 PRs',
        goalId: null,
        inToday: true,
      },
      {
        id: 5,
        title: 'Weekly planning session',
        recurrence: { type: 'Weekly', interval: null, unit: 'week', daysOfWeek: ['Mon'] },
        due: { date: withFirstOccurrence({ type: 'Weekly', interval: null, unit: 'week', daysOfWeek: ['Mon'] }), time: '10:00' },
        tags: ['Planning', 'Personal'],
        priority: 'Low',
        completed: false,
        timeAllocated: 30,
        objective: null,
        goalId: null,
        inToday: false,
      },
    ]
  }

  useEffect(() => {
    setLocalDevEnabled(devPanelEnabled)
  }, [devPanelEnabled])

  useEffect(() => {
    setLocalDevInNav(devPanelInNav)
  }, [devPanelInNav])

  useEffect(() => {
    setLocalDevInSidebar(devPanelInSidebar)
  }, [devPanelInSidebar])

  useEffect(() => {
    if (user?.email) {
      setAuthEmail(user.email)
    }
    const metaName = user?.user_metadata?.display_name || user?.user_metadata?.name || ''
    setDisplayName(metaName)
  }, [user])
  
  useEffect(() => {
    localStorage.setItem('smartplan.settings.focus', JSON.stringify(focusSettings))
  }, [focusSettings])

  const handleToggle = () => {
    const newValue = !localDevEnabled
    setLocalDevEnabled(newValue)
    onToggleDevPanel(newValue)
    if (!newValue) {
      // If disabling dev panel, also disable nav and sidebar display
      setLocalDevInNav(false)
      onToggleDevPanelInNav(false)
      setLocalDevInSidebar(false)
      onToggleDevPanelInSidebar(false)
    }
  }

  const handleToggleInNav = () => {
    const newValue = !localDevInNav
    setLocalDevInNav(newValue)
    onToggleDevPanelInNav(newValue)
    // If enabling nav, disable sidebar
    if (newValue) {
      setLocalDevInSidebar(false)
      onToggleDevPanelInSidebar(false)
    }
  }

  const handleToggleInSidebar = () => {
    const newValue = !localDevInSidebar
    setLocalDevInSidebar(newValue)
    onToggleDevPanelInSidebar(newValue)
    // If enabling sidebar, disable nav
    if (newValue) {
      setLocalDevInNav(false)
      onToggleDevPanelInNav(false)
    }
  }

  const handleFocusSettingChange = (key, value) => {
    setFocusSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSendMagicLink = async () => {
    setAuthMessage('')
    setAuthBusy(true)
    try {
      await signInWithOtp(authEmail)
      setAuthMessage('Magic link sent. Check your email to finish signing in.')
    } catch (err) {
      setAuthMessage(err?.message || 'Unable to send magic link')
    } finally {
      setAuthBusy(false)
    }
  }

    const handleSignInAnonymously = async () => {
      setAuthMessage('')
      setAuthBusy(true)
      try {
        await signInAnonymously()
        setAuthMessage('')
      } catch (err) {
        const message = err?.message || 'Unable to sign in anonymously'
        // Add a hint when the Supabase project has anonymous auth turned off
        const hint = message.toLowerCase().includes('disabled')
          ? 'Enable anonymous sign-ins in Supabase Dashboard → Authentication → Providers → Anonymous.'
          : ''
        setAuthMessage([message, hint].filter(Boolean).join(' '))
      } finally {
        setAuthBusy(false)
      }
    }

  const handleSignOut = async () => {
    setAuthMessage('')
    setAuthBusy(true)
    try {
      if (isAnonymous) {
        const confirmed = window.confirm('Reset anonymous session? This signs you out and may remove access to synced data for this anonymous account.')
        if (!confirmed) {
          setAuthBusy(false)
          return
        }
      }
      await signOut()
      setAuthMessage(isAnonymous ? 'Anonymous session reset' : 'Signed out')
    } catch (err) {
      setAuthMessage(err?.message || 'Unable to sign out')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleSaveDisplayName = async () => {
    const trimmed = displayName.trim()
    if (!user || !supabase) return
    setAuthMessage('')
    setAuthBusy(true)
    try {
      await supabase.auth.updateUser({ data: { display_name: trimmed || null } })
      setAuthMessage(trimmed ? 'Display name updated' : 'Display name cleared')
    } catch (err) {
      setAuthMessage(err?.message || 'Unable to update display name')
    } finally {
      setAuthBusy(false)
    }
  }

  const loadSeedTasks = () => {
    const seeds = buildSeedTasks()
    let existing = []
    try {
      const saved = localStorage.getItem('smartplan.tasks')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) existing = parsed
      }
    } catch {}

    const seedsById = new Map(seeds.map((s) => [s.id, s]))
    const existingIds = new Set(existing.map((t) => t.id))

    const merged = existing.map((task) => (seedsById.has(task.id) ? seedsById.get(task.id) : task))
    seeds.forEach((seed) => {
      if (!existingIds.has(seed.id)) {
        merged.push(seed)
      }
    })

    localStorage.setItem('smartplan.tasks', JSON.stringify(merged))
    const mergedTags = Array.from(new Set(merged.flatMap((t) => t.tags || []).filter(Boolean)))
    localStorage.setItem('smartplan.tags', JSON.stringify(mergedTags))
    setTaskCount(merged.length)
    triggerDataFlash('load')
  }

  const clearAllTasks = async () => {
    const confirmed = window.confirm('Delete all tasks? This cannot be undone.')
    if (!confirmed) return
    localStorage.setItem('smartplan.tasks', JSON.stringify([]))
    setTaskCount(0)
    triggerDataFlash('clear')
    
    // Also clear from Supabase if logged in
    if (user && supabase) {
      try {
        await supabase.from('tasks').delete().eq('user_id', user.id)
        console.log('[Settings] Cleared tasks from Supabase')
      } catch (err) {
        console.error('[Settings] Failed to clear Supabase tasks:', err)
      }
    }
  }

  const clearAllData = async () => {
    const confirmed = window.confirm('Delete ALL data including tasks, tags, settings, and conversations? This cannot be undone.')
    if (!confirmed) return
    
    // Clear all localStorage data
    localStorage.setItem('smartplan.tasks', JSON.stringify([]))
    localStorage.setItem('smartplan.tags', JSON.stringify([]))
    localStorage.setItem('smartplan.settings.focus', JSON.stringify({ workDuration: 25, breakDuration: 5, enableBreaks: true }))
    
    setTaskCount(0)
    setFocusSettings({ workDuration: 25, breakDuration: 5, enableBreaks: true })
    triggerDataFlash('clear')
    
    // Also clear from Supabase if logged in
    if (user && supabase) {
      try {
        await supabase.from('tasks').delete().eq('user_id', user.id)
        await supabase.from('conversations').delete().eq('user_id', user.id)
        await supabase.from('goals').delete().eq('user_id', user.id)
        await supabase.from('insights').delete().eq('user_id', user.id)
        console.log('[Settings] Cleared all data from Supabase')
      } catch (err) {
        console.error('[Settings] Failed to clear Supabase data:', err)
      }
    }
  }

  const triggerDataFlash = (type) => {
    if (dataFlashTimer.current) {
      clearTimeout(dataFlashTimer.current)
    }
    setDataFlash(type)
    dataFlashTimer.current = setTimeout(() => {
      setDataFlash(null)
    }, 3000)
  }

  useEffect(() => {
    setTaskCount(getStoredTaskCount())
  }, [])

  useEffect(() => () => {
    if (dataFlashTimer.current) {
      clearTimeout(dataFlashTimer.current)
    }
  }, [])

  return (
    <>
      <header className="page__header">
        <p className="eyebrow">Preferences</p>
        <h1>Settings</h1>
        <p className="lede">Customize SmartPlan to match your workflow.</p>
      </header>

      <section className="panels">
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
            <div className="panel__title">Account</div>
            {user ? (
              <span className="eyebrow" style={{ fontSize: '0.85rem' }}>
                {user.email ? `Signed in as ${user.email}` : 'Signed in anonymously'}
              </span>
            ) : (authMessage || authError) && (
              <span className="eyebrow" style={{ color: authError ? '#c0392b' : 'var(--muted)', fontSize: '0.85rem' }}>
                {authError ? authError.message : authMessage}
              </span>
            )}
          </div>
          {!user && <p className="panel__copy">Choose a sign-in method to sync tasks across devices.</p>}

          {!user ? (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--heading)' }}>Sign in with email</h3>
                <div className="todo-field" style={{ marginBottom: '0.5rem' }}>
                  <label>Email</label>
                  <input
                    type="email"
                    className="todo-edit-input"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={authBusy}
                  />
                </div>
                <button
                  type="button"
                  className="action"
                  onClick={handleSendMagicLink}
                  disabled={!authReady || authBusy || !authEmail}
                >
                  {authBusy ? 'Sending…' : 'Send magic link'}
                </button>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--heading)' }}>Anonymous account</h3>
                <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem', opacity: 0.8 }}>Create an account without email to try out SmartPlan.</p>
                <button
                  type="button"
                  className="action ghost"
                  onClick={handleSignInAnonymously}
                  disabled={!authReady || authBusy}
                >
                  {authBusy ? 'Creating…' : 'Create anonymous account'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--heading)' }}>Display name</h3>
                {!editingDisplayName ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.95rem' }}>
                      {displayName || '(not set)'}
                    </span>
                    <button
                      type="button"
                      className="action ghost"
                      onClick={() => {
                        setOriginalDisplayName(displayName)
                        setEditingDisplayName(true)
                      }}
                      disabled={authBusy}
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="todo-edit-input"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      disabled={authBusy}
                      style={{ flex: '1 1 200px', minWidth: '160px' }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="action ghost"
                      onClick={async () => {
                        await handleSaveDisplayName()
                        setEditingDisplayName(false)
                      }}
                      disabled={authBusy}
                    >
                      {authBusy ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="action ghost"
                      onClick={() => {
                        setDisplayName(originalDisplayName)
                        setEditingDisplayName(false)
                      }}
                      disabled={authBusy}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="action ghost"
                onClick={handleSignOut}
                disabled={authBusy}
              >
                {isAnonymous ? 'Reset anonymous session' : 'Sign out'}
              </button>
            </>
          )}
        </div>

        <div className="panel">
          <div className="panel__title">General</div>
          <p className="panel__copy">Theme, notifications, and default durations.</p>
          
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '1rem', color: 'var(--heading)' }}>Focus Settings</h3>
            
            <div className="todo-field" style={{ marginBottom: '1rem' }}>
              <label>
                Work Duration (minutes)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={focusSettings.workDuration}
                onChange={(e) => handleFocusSettingChange('workDuration', parseInt(e.target.value) || 25)}
                className="todo-edit-input"
                style={{ width: '120px' }}
              />
            </div>

            <div className="todo-field" style={{ marginBottom: '1rem' }}>
              <label>
                Break Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={focusSettings.breakDuration}
                onChange={(e) => handleFocusSettingChange('breakDuration', parseInt(e.target.value) || 5)}
                className="todo-edit-input"
                style={{ width: '120px' }}
              />
            </div>

            <div className="setting-toggle-row">
              <span className="setting-toggle-label">Enable breaks after work sessions</span>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={focusSettings.enableBreaks}
                  onChange={(e) => handleFocusSettingChange('enableBreaks', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel__title">Integrations</div>
          <p className="panel__copy">Connect calendar, tasks, and communication tools.</p>
        </div>
        <div className="panel">
          <div className="panel__title">Data</div>
          <p className="panel__copy">Manage stored tasks for quick testing or resets.</p>
          <p className="panel__copy" style={{ marginTop: '0.4rem', fontSize: '0.95rem', opacity: 0.85 }}>
            Current tasks stored: {taskCount}
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1rem', alignItems: 'center' }}>
            <button className="action ghost" type="button" onClick={loadSeedTasks}>
              Load seed tasks
            </button>
            <button className="action" type="button" onClick={clearAllTasks} style={{ borderColor: 'rgba(255, 255, 255, 0.18)' }}>
              Clear all tasks
            </button>
            <span
              className={[
                'data-flash',
                dataFlash ? 'is-visible' : '',
                dataFlash === 'load' ? 'data-flash--success' : '',
                dataFlash === 'clear' ? 'data-flash--neutral' : '',
              ].filter(Boolean).join(' ')}
              aria-live="polite"
              aria-label={dataFlash === 'load' ? 'Seed tasks loaded' : dataFlash === 'clear' ? 'All tasks cleared' : ''}
            >
              {dataFlash === 'load' && '✓'}
              {dataFlash === 'clear' && '⨂'}
            </span>
          </div>
          <p className="panel__copy" style={{ marginTop: '0.8rem', fontSize: '0.9rem', opacity: 0.75 }}>
            Loading seeds overwrites your current tasks. Clearing tasks requires confirmation.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <button className="action" type="button" onClick={clearAllData} style={{ borderColor: 'rgba(200, 50, 50, 0.5)' }}>
              Clear all data
            </button>
            <p className="panel__copy" style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.75 }}>
              This will permanently delete all tasks and settings. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="panel">
          <div className="panel__title">Developer</div>
          <p className="panel__copy">Advanced debugging and testing tools.</p>
          <div className="setting-toggle-row">
            <span className="setting-toggle-label">Enable Dev Panel</span>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={localDevEnabled}
                onChange={handleToggle}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          {localDevEnabled && (
            <>
              <p className="panel__copy" style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
                Dev Panel is now available in the sidebar navigation.
              </p>
              <div className="setting-toggle-row" style={{ marginTop: '1rem' }}>
                <span className="setting-toggle-label">Show in sidebar</span>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={localDevInSidebar}
                    onChange={handleToggleInSidebar}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              {localDevInSidebar && (
                <p className="panel__copy" style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
                  Dev panel controls are now pinned in the sidebar.
                </p>
              )}
            </>
          )}
        </div>
        <div className="panel">
          <div className="panel__title">Chat Markdown Coloring</div>
          <p className="panel__copy">Preview how Markdown is styled in chat messages.</p>
          
          <button 
            className="action"
            onClick={() => setMarkdownPreviewOpen(true)}
            type="button"
          >
            View Markdown Guide
          </button>
        </div>
      </section>

      {markdownPreviewOpen && (
        <div className="modal-overlay" onClick={() => setMarkdownPreviewOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Complete Markdown Guide</h2>
              <button 
                className="modal-close"
                onClick={() => setMarkdownPreviewOpen(false)}
                type="button"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="markdown-preview">
                <div className="markdown-preview__box">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{`# Complete Markdown Guide

## Text Formatting
**Bold text** appears in gold, *italic text* in purple, and you can combine ***bold and italic***.

## Links & Code
[Links appear in blue](https://example.com) and \`inline code\` is green on dark background.

## Code Blocks
\`\`\`
const greeting = "Code blocks have a dark background"
const withBorder = "and blue left border for accent"
\`\`\`

## Lists
- Unordered lists work great
- You can have multiple items
  - And even nested items

1. Ordered lists too
2. With numbers
3. Automatically counted

## Blockquotes & Horizontal Rules
> Blockquotes appear indented with an accent border on the left

---

## Tables
| Feature | Color | Example |
|---------|-------|---------|
| Bold | Gold | **text** |
| Italic | Purple | *text* |
| Links | Blue | [link](url) |
| Code | Green | \`code\` |

*Last updated - see how everything works together!*`}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
