import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '../App.css'
import { getCurrentDate } from '../utils/dateUtils'
import { calculateFirstOccurrence } from '../utils/recurrenceUtils'
import { useSupabase } from '../contexts/SupabaseProvider'

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
  
  const [focusSettings, setFocusSettings] = useState(() => deriveFocusSettings())
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
        setAuthMessage('Signed in anonymously. Your data will be synced but tied to this device.')
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
      await signOut()
      setAuthMessage('Signed out')
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
          <div className="panel__title">Account</div>
          <p className="panel__copy">Log in with a Supabase magic link to sync tasks across devices.</p>

          <div className="todo-field" style={{ marginBottom: '0.75rem' }}>
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

          <div className="setting-row" style={{ gap: '1.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {!user && (
              <button
                type="button"
                className="action"
                onClick={handleSendMagicLink}
                disabled={!authReady || authBusy || !authEmail}
              >
                {authBusy ? 'Sending…' : 'Send magic link'}
              </button>
            )}

              {!user && (
                <button
                  type="button"
                  className="action ghost"
                  onClick={handleSignInAnonymously}
                  disabled={!authReady || authBusy}
                >
                  {authBusy ? 'Signing in…' : 'Sign in anonymously'}
                </button>
              )}

            {user && (
              <button
                type="button"
                className="action ghost"
                onClick={handleSignOut}
                disabled={authBusy}
              >
                Sign out
              </button>
            )}

            <span className="eyebrow" style={{ minWidth: '200px' }}>
                {user ? (user.email ? `Signed in as ${user.email}` : 'Signed in anonymously') : authReady ? 'Not signed in' : 'Connecting…'}
            </span>
          </div>

          {user && (
            <div className="todo-field" style={{ marginTop: '0.75rem', maxWidth: '360px' }}>
              <label>Display name</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="todo-edit-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we show your name?"
                  disabled={authBusy}
                  style={{ flex: '1 1 200px', minWidth: '160px' }}
                />
                <button
                  type="button"
                  className="action ghost"
                  onClick={handleSaveDisplayName}
                  disabled={authBusy}
                >
                  {authBusy ? 'Saving…' : 'Save name'}
                </button>
              </div>
            </div>
          )}

          {(authMessage || authError) && (
            <p className="lede" style={{ marginTop: '0.5rem', color: authError ? '#c0392b' : 'var(--muted)', fontSize: '0.95rem' }}>
              {authError ? authError.message : authMessage}
            </p>
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
                <span className="setting-toggle-label">Show in navigation bar</span>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={localDevInNav}
                    onChange={handleToggleInNav}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              {localDevInNav && (
                <p className="panel__copy" style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
                  Dev panel controls are now visible on all pages.
                </p>
              )}
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
