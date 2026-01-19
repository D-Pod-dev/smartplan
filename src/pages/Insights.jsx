import { useEffect, useState } from 'react'
import '../App.css'
import { loadInsights, updateInsightsFromTasks, getInsightFormatted } from '../utils/insightTracker'
import { useSupabaseInsights } from '../hooks/useSupabaseInsights'

export default function Insights() {
  const [insights, setInsights] = useState(null)
  const [tasks, setTasks] = useState([])

  // Sync insights with Supabase
  const { syncStatus: insightsSyncStatus } = useSupabaseInsights(insights || {})

  useEffect(() => {
    // Load insights from localStorage
    const loadedInsights = loadInsights()
    setInsights(loadedInsights)

    // Load tasks from localStorage
    try {
      const savedTasks = localStorage.getItem('smartplan.tasks')
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks)
        setTasks(Array.isArray(parsedTasks) ? parsedTasks : [])
      }
    } catch (err) {
      console.warn('Failed to load tasks:', err)
    }
  }, [])

  // Build insight cards with current data
  const insightCards = [
    {
      title: 'Flow score',
      value: `${Math.round(insights?.flowScore || 0)}`,
      caption: `${insights?.flowScoreTrend > 0 ? '+' : ''}${Math.round(insights?.flowScoreTrend || 0)} vs. last week`,
      tooltip: 'Based on completion rate, priority balance, and time allocation',
    },
    {
      title: 'Time saved',
      value: `${insights?.timeSavedHours || 0}h`,
      caption: `SmartPlan assisted ${insights?.timeSavedTasks || 0} tasks`,
      tooltip: 'Time saved on AI-assisted task creation',
    },
    {
      title: 'Focus ratio',
      value: `${Math.round(insights?.focusRatio || 0)}%`,
      caption: 'Deep work vs. meetings today',
      tooltip: 'Percentage of high-priority tasks without meetings',
    },
    {
      title: 'Completion streak',
      value: `${insights?.streakDays || 0}d`,
      caption: `${insights?.tasksCompletedToday || 0} completed today`,
      tooltip: 'Consecutive days with completed tasks',
    },
    {
      title: 'Weekly progress',
      value: `${insights?.tasksCompletedThisWeek || 0}`,
      caption: 'tasks completed this week',
      tooltip: 'Total tasks marked complete in the last 7 days',
    },
    {
      title: 'Tasks created',
      value: `${insights?.totalTasksCreated || 0}`,
      caption: `${insights?.aiAssistedTasks || 0} with AI assistance`,
      tooltip: 'Total tasks created and AI-assisted count',
    },
  ]

  if (!insights) {
    return (
      <>
        <header className="page__header">
          <p className="eyebrow">Metrics</p>
          <h1>Insights</h1>
          <p className="lede">Measure flow, time saved, and where SmartPlan helps most.</p>
        </header>
        <section className="panels">
          <div className="panel">
            <p>Loading insights...</p>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <header className="page__header">
        <p className="eyebrow">Metrics</p>
        <h1>Insights</h1>
        <p className="lede">Measure flow, time saved, and where SmartPlan helps most.</p>
      </header>

      <section className="panels">
        <div className="panel">
          <div className="panel__title">Today&apos;s insights</div>
          <div className="insights">
            {insightCards.map((item) => (
              <div key={item.title} className="insight" title={item.tooltip}>
                <div className="insight__label">{item.title}</div>
                <div className="insight__value">{item.value}</div>
                <div className="insight__meta">{item.caption}</div>
              </div>
            ))}
          </div>
          <p className="panel__copy">SmartPlan tracks where assists save time and nudges you when it can take over the next task. Data updates as you complete tasks and use SmartPlan&apos;s AI features.</p>
        </div>
      </section>

      <section className="panels">
        <div className="panel">
          <div className="panel__title">How insights are calculated</div>
          <ul className="insights-legend">
            <li>
              <strong>Flow Score:</strong> Measures your productivity through completion rates, priority balance, and time allocation consistency.
            </li>
            <li>
              <strong>Time Saved:</strong> Tracks time spent on tasks where SmartPlan provided AI assistance.
            </li>
            <li>
              <strong>Focus Ratio:</strong> Shows the percentage of high-priority tasks that aren&apos;t meetings.
            </li>
            <li>
              <strong>Completion Streak:</strong> Your consecutive days with completed tasks.
            </li>
            <li>
              <strong>Weekly Progress:</strong> Total tasks completed in the past 7 days.
            </li>
            <li>
              <strong>Tasks Created:</strong> Total tasks created, including those assisted by AI.
            </li>
          </ul>
        </div>
      </section>
    </>
  )
}
