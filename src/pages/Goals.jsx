import { useEffect, useState } from 'react'
import '../App.css'
import ComposerRow from '../components/ComposerRow'
import TagManager from '../components/TagManager'
import TodoItem from '../components/TodoItem'
import { getCurrentDate } from '../utils/dateUtils'
import { generateUniqueId } from '../utils/idGenerator'

const PRESET_UNITS = ['pages', 'words', 'minutes']

const deriveInitialGoals = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.goals')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed
        }
      } catch {}
    }
  }
  return []
}

const emptyGoalDraft = () => ({
  title: '',
  dueDate: '',
  target: '',
  targetUnit: 'pages',
  customUnit: '',
  progress: '0',
  priority: 'none',
  tags: [],
})

const normalizeTags = (list) => Array.from(new Set((list || []).map((t) => t.trim()).filter(Boolean)))

export default function Goals({ tags = [], goals: externalGoals, setGoals: setExternalGoals, onAddTag, onRenameTag, onDeleteTag, onDeleteTasksByGoalId }) {
  const goals = externalGoals || []
  const setGoals = setExternalGoals || (() => {})
  const [composerDraft, setComposerDraft] = useState(() => emptyGoalDraft())
  const [editingId, setEditingId] = useState(null)
  const [editingDraft, setEditingDraft] = useState(null)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [tagManagerMode, setTagManagerMode] = useState('compose')
  const [originalTags, setOriginalTags] = useState([])
  const [currentDateKey, setCurrentDateKey] = useState(() => getCurrentDate().toISOString().split('T')[0])

  // Check for date changes every minute to trigger re-render
  useEffect(() => {
    const interval = setInterval(() => {
      const newDateKey = getCurrentDate().toISOString().split('T')[0]
      if (newDateKey !== currentDateKey) {
        setCurrentDateKey(newDateKey)
      }
    }, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [currentDateKey])

  // Scroll to specific goal if navigated from task
  useEffect(() => {
    const goalId = localStorage.getItem('scrollToGoalId')
    if (goalId) {
      localStorage.removeItem('scrollToGoalId')
      // Wait for render, then scroll
      setTimeout(() => {
        const element = document.getElementById(`goal-${goalId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Flash highlight effect
          element.style.transition = 'background-color 0.3s'
          element.style.backgroundColor = '#3a3a3a'
          setTimeout(() => {
            element.style.backgroundColor = ''
          }, 1000)
        }
      }, 100)
    }
  }, [])

  // Remove local localStorage effect since it's managed in App.jsx now

  const updateDraft = (mode, field, value) => {
    const setter = mode === 'edit' ? setEditingDraft : setComposerDraft
    setter((prev) => {
      if (!prev) return prev
      const next = { ...prev, [field]: value }
      if (field === 'targetUnit' && value !== 'custom') {
        next.customUnit = ''
      }
      return next
    })
  }

  const addGoal = () => {
    if (!composerDraft.title.trim() || !composerDraft.dueDate || !composerDraft.target) {
      alert('Please fill in all required fields')
      return
    }

    const unit = composerDraft.targetUnit === 'custom' ? composerDraft.customUnit : composerDraft.targetUnit
    const normalizedTags = normalizeTags(composerDraft.tags)

    const newGoal = {
      id: generateUniqueId(),
      title: composerDraft.title,
      dueDate: composerDraft.dueDate,
      target: parseFloat(composerDraft.target),
      targetUnit: unit,
      progress: parseFloat(composerDraft.progress) || 0,
      priority: composerDraft.priority || 'none',
      completed: false,
      tags: normalizedTags,
    }

    setGoals((prev) => [...prev, newGoal])
    normalizedTags.forEach((tag) => onAddTag(tag))
    resetComposer()
  }

  const resetComposer = () => {
    setComposerDraft(emptyGoalDraft())
  }

  const addComposerTag = (label) => {
    const tag = onAddTag(label)
    if (!tag) return null
    setComposerDraft((prev) => (prev.tags.includes(tag) ? prev : { ...prev, tags: [...prev.tags, tag] }))
    return tag
  }

  const removeComposerTag = (tag) => {
    if (tag === 'Goal') return // Prevent removing protected tags
    setComposerDraft((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }

  const startEdit = (goal) => {
    setEditingId(goal.id)
    setEditingDraft({
      title: goal.title,
      dueDate: goal.dueDate,
      target: String(goal.target),
      targetUnit: PRESET_UNITS.includes(goal.targetUnit) ? goal.targetUnit : 'custom',
      customUnit: PRESET_UNITS.includes(goal.targetUnit) ? '' : goal.targetUnit,
      progress: String(goal.progress ?? 0),
      priority: goal.priority || 'none',
      tags: goal.tags || [],
    })
  }

  const saveEdit = (goalId) => {
    if (!editingDraft?.title.trim() || !editingDraft.dueDate || !editingDraft.target) {
      alert('Please fill in all required fields')
      return
    }

    const unit = editingDraft.targetUnit === 'custom' ? editingDraft.customUnit : editingDraft.targetUnit
    const normalizedTags = normalizeTags(editingDraft.tags)

    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              title: editingDraft.title,
              dueDate: editingDraft.dueDate,
              target: parseFloat(editingDraft.target),
              targetUnit: unit,
              progress: parseFloat(editingDraft.progress) || 0,
              priority: editingDraft.priority || 'none',
              tags: normalizedTags,
            }
          : goal,
      ),
    )

    normalizedTags.forEach((tag) => onAddTag(tag))
    cancelEdit()
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingDraft(null)
  }

  const toggleGoalCompletion = (id) => {
    setGoals((prev) => prev.map((goal) => (goal.id === id ? { ...goal, completed: !goal.completed } : goal)))
  }

  const deleteGoal = (id) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id))
    if (onDeleteTasksByGoalId) {
      onDeleteTasksByGoalId(id)
    }
    if (editingId === id) {
      cancelEdit()
    }
  }

  const renameTag = (oldName, newName) => {
    setGoals((prev) =>
      prev.map((goal) => ({
        ...goal,
        tags: (goal.tags || []).map((t) => (t === oldName ? newName : t)),
      })),
    )
    setComposerDraft((prev) => ({
      ...prev,
      tags: prev.tags.map((t) => (t === oldName ? newName : t)),
    }))
    if (editingDraft) {
      setEditingDraft((prev) => ({
        ...prev,
        tags: prev.tags.map((t) => (t === oldName ? newName : t)),
      }))
    }
    onRenameTag(oldName, newName)
  }

  const deleteTag = (tag) => {
    const confirmed = window.confirm(`Delete tag "${tag}"? Goals with this tag will keep it.`)
    if (!confirmed) return
    setComposerDraft((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
    setGoals((prev) =>
      prev.map((goal) => ({
        ...goal,
        tags: (goal.tags || []).filter((t) => t !== tag),
      })),
    )
    if (editingDraft) {
      setEditingDraft((prev) => ({
        ...prev,
        tags: prev.tags.filter((t) => t !== tag),
      }))
    }
    onDeleteTag(tag)
  }

  const composerFields = [
    {
      key: 'title',
      label: 'New goal',
      node: (
        <input
          className="todo-edit-input"
          type="text"
          placeholder="Goal name"
          value={composerDraft.title}
          onChange={(e) => updateDraft('compose', 'title', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addGoal()
          }}
        />
      ),
      style: { flex: '0 1 420px', maxWidth: '420px' },
    },
    {
      key: 'dueDate',
      label: 'Due date',
      node: (
        <input
          className="todo-edit-input"
          type="date"
          value={composerDraft.dueDate}
          onChange={(e) => updateDraft('compose', 'dueDate', e.target.value)}
        />
      ),
      style: { flex: '0 1 auto', maxWidth: '150px' },
    },
    {
      key: 'target',
      label: 'Target',
      node: (
        <input
          className="todo-edit-input"
          type="number"
          min="0"
          step="any"
          placeholder="0"
          value={composerDraft.target}
          onChange={(e) => updateDraft('compose', 'target', e.target.value)}
        />
      ),
      style: { flex: '0 1 auto', maxWidth: '100px' },
    },
    {
      key: 'unit',
      label: 'Unit',
      node: (
        <select
          className="todo-edit-input"
          value={composerDraft.targetUnit}
          onChange={(e) => updateDraft('compose', 'targetUnit', e.target.value)}
        >
          {PRESET_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
      ),
      style: { flex: '0 1 auto', maxWidth: '120px' },
    },
    ...(composerDraft.targetUnit === 'custom'
      ? [
          {
            key: 'customUnit',
            label: 'Custom unit',
            node: (
              <input
                className="todo-edit-input"
                type="text"
                placeholder="e.g., chapters"
                value={composerDraft.customUnit}
                onChange={(e) => updateDraft('compose', 'customUnit', e.target.value)}
              />
            ),
            style: { flex: '0 1 auto', maxWidth: '140px' },
          },
        ]
      : []),
    {
      key: 'progress',
      label: 'Progress',
      node: (
        <input
          className="todo-edit-input"
          type="number"
          min="0"
          step="any"
          placeholder="0"
          value={composerDraft.progress}
          onChange={(e) => updateDraft('compose', 'progress', e.target.value)}
        />
      ),
      style: { flex: '0 1 auto', maxWidth: '100px' },
    },
    {
      key: 'priority',
      label: 'Priority',
      node: (
        <select
          className="todo-edit-input"
          value={composerDraft.priority}
          onChange={(e) => updateDraft('compose', 'priority', e.target.value)}
        >
          <option value="none">None</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      ),
      style: { flex: '0 1 auto', maxWidth: '120px' },
    },
  ]

  const composerTagsSection = {
    label: 'Tags',
    tags: composerDraft.tags,
    onManage: () => {
      setTagManagerMode('compose')
      setOriginalTags([...composerDraft.tags])
      setTagManagerOpen(true)
    },
    emptyLabel: 'No tags',
    style: { flex: '0 1 auto' },
    renderTag: (tag) => (
      <button
        type="button"
        className="pill pill--tag"
        style={{ cursor: tag === 'Goal' ? 'not-allowed' : 'pointer', opacity: tag === 'Goal' ? 0.7 : 1 }}
        onClick={() => tag !== 'Goal' && removeComposerTag(tag)}
        title={tag === 'Goal' ? 'This tag is automatically managed' : 'Remove tag'}
      >
        {tag} {tag !== 'Goal' && '×'}
      </button>
    ),
  }

  const composerTagManager = (
    <TagManager
      isOpen={tagManagerOpen}
      tags={tags}
      selectedTags={tagManagerMode === 'edit' ? editingDraft?.tags || [] : composerDraft.tags}
      onChangeSelected={(next) => {
        if (tagManagerMode === 'edit') {
          setEditingDraft((prev) => ({ ...prev, tags: next }))
        } else {
          setComposerDraft((prev) => ({ ...prev, tags: next }))
        }
      }}
      onCreateTag={addComposerTag}
      onRenameTag={renameTag}
      onDeleteTag={deleteTag}
      onClearSelected={() => {
        if (tagManagerMode === 'edit') {
          setEditingDraft((prev) => ({ ...prev, tags: [] }))
        } else {
          setComposerDraft((prev) => ({ ...prev, tags: [] }))
        }
      }}
      onCancel={() => {
        if (tagManagerMode === 'edit') {
          setEditingDraft((prev) => ({ ...prev, tags: originalTags }))
        } else {
          setComposerDraft((prev) => ({ ...prev, tags: originalTags }))
        }
        setTagManagerOpen(false)
      }}
      onDone={() => setTagManagerOpen(false)}
      title="Manage Goal Tags"
    />
  )

  return (
    <>
      <header className="page__header">
        <p className="eyebrow">SmartPlan</p>
        <h1>Goals</h1>
        <p className="lede">Track your long-term ambitions and plan out your workload evenly.</p>
      </header>

      <section className="panels panels--grid">
        <div className="panel panel--focus">
          <div className="panel__title">Your goals</div>

          <ComposerRow
            addButtonAria="Add goal"
            onSubmit={addGoal}
            onClear={resetComposer}
            submitDisabled={!composerDraft.title.trim() || !composerDraft.dueDate || !composerDraft.target}
            fields={composerFields}
            tagsSection={composerTagsSection}
            className="goal-row goal-row--compose"
          />

          {composerTagManager}

          <ul className="list list--focus">
            {goals.length === 0 ? (
              <li className="list__item">
                <p style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-subtle)' }}>
                  No goals yet. Create one to get started!
                </p>
              </li>
            ) : (
              goals.map((goal) => {
                const isEditing = editingId === goal.id
                return (
                  <TodoItem
                    key={goal.id}
                    id={`goal-${goal.id}`}
                    item={goal}
                    isEditing={isEditing}
                    onToggleCompletion={toggleGoalCompletion}
                    onEdit={startEdit}
                    onCancelEdit={cancelEdit}
                    onSaveEdit={saveEdit}
                    onDelete={deleteGoal}
                    renderDisplay={() => {
                      const today = getCurrentDate()
                      today.setHours(0, 0, 0, 0)
                      const dueDate = goal.dueDate ? new Date(`${goal.dueDate}T00:00:00`) : null
                      const daysLeft = dueDate ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) : null
                      const progress = goal.progress ?? 0
                      const remaining = goal.target - progress
                      const perDay = daysLeft && daysLeft > 0 ? Math.ceil(remaining / daysLeft) : null

                      return (
                        <div className="todo-display">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <div className={`list__title todo-title ${goal.completed ? 'is-completed' : ''}`}>{goal.title}</div>
                            <span className="pill pill--filled">Progress: {progress}/{goal.target} {goal.targetUnit}</span>
                            {perDay !== null && (
                              <span className="pill pill--filled">{perDay} {goal.targetUnit}/day</span>
                            )}
                          </div>
                          <div className="list__meta todo-meta">
                            <span className={`pill ${goal.dueDate ? 'pill--filled' : 'pill--empty'}`}>{goal.dueDate ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${goal.dueDate}T00:00:00`)) : 'No due date'}</span>
                            {daysLeft !== null && (
                              <span className="pill pill--filled">{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</span>
                            )}
                            {goal.priority && goal.priority !== 'none' && (
                              <span className="pill pill--filled" style={{ textTransform: 'capitalize' }}>
                                {goal.priority} priority
                              </span>
                            )}
                            {goal.tags?.length ? (
                              goal.tags.map((tag) => (
                                <span key={tag} className="pill pill--tag">{tag}</span>
                              ))
                            ) : (
                              <span className="pill pill--empty">No tags</span>
                            )}
                          </div>
                        </div>
                      )
                    }}
                    renderEditFields={() => (
                      <>
                        <label className="todo-field" style={{ flex: '0 1 420px', maxWidth: '420px' }}>
                          <span>Goal name</span>
                          <input
                            className="todo-edit-input"
                            type="text"
                            value={editingDraft?.title || ''}
                            onChange={(e) => updateDraft('edit', 'title', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(goal.id)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            autoFocus
                          />
                        </label>
                        <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '150px' }}>
                          <span>Due date</span>
                          <input
                            className="todo-edit-input"
                            type="date"
                            value={editingDraft?.dueDate || ''}
                            onChange={(e) => updateDraft('edit', 'dueDate', e.target.value)}
                          />
                        </label>
                        <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '100px' }}>
                          <span>Target</span>
                          <input
                            className="todo-edit-input"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={editingDraft?.target || ''}
                            onChange={(e) => updateDraft('edit', 'target', e.target.value)}
                          />
                        </label>
                        <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '120px' }}>
                          <span>Unit</span>
                          <select
                            className="todo-edit-input"
                            value={editingDraft?.targetUnit || 'pages'}
                            onChange={(e) => updateDraft('edit', 'targetUnit', e.target.value)}
                          >
                            {PRESET_UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                            <option value="custom">Custom</option>
                          </select>
                        </label>
                        {editingDraft?.targetUnit === 'custom' && (
                          <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '140px' }}>
                            <span>Custom unit</span>
                            <input
                              className="todo-edit-input"
                              type="text"
                              placeholder="e.g., chapters"
                              value={editingDraft?.customUnit || ''}
                              onChange={(e) => updateDraft('edit', 'customUnit', e.target.value)}
                            />
                          </label>
                        )}
                        <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '100px' }}>
                          <span>Progress</span>
                          <input
                            className="todo-edit-input"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={editingDraft?.progress || ''}
                            onChange={(e) => updateDraft('edit', 'progress', e.target.value)}
                          />
                        </label>
                        <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '120px' }}>
                          <span>Priority</span>
                          <select
                            className="todo-edit-input"
                            value={editingDraft?.priority || 'none'}
                            onChange={(e) => updateDraft('edit', 'priority', e.target.value)}
                          >
                            <option value="none">None</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </label>
                        <div className="todo-field" style={{ flex: '0 1 auto' }}>
                          <span>Tags</span>
                          <div className="tag-picker">
                            <div className="tag-options">
                              {editingDraft?.tags?.length === 0 ? (
                                <span 
                                  className="pill pill--empty"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => {
                                    setTagManagerMode('edit')
                                    setOriginalTags([...(editingDraft?.tags || [])])
                                    setTagManagerOpen(true)
                                  }}
                                >
                                  No tags
                                </span>
                              ) : (
                                editingDraft.tags.map((tag) => (
                                  <span 
                                    key={tag} 
                                    className="pill pill--tag"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                      setTagManagerMode('edit')
                                      setOriginalTags([...(editingDraft?.tags || [])])
                                      setTagManagerOpen(true)
                                    }}
                                  >
                                    {tag}
                                  </span>
                                ))
                              )}
                              <button
                                type="button"
                                className="pill pill--tag pill--add-tag"
                                title="Manage tags"
                                onClick={() => {
                                  setTagManagerMode('edit')
                                  setOriginalTags([...(editingDraft?.tags || [])])
                                  setTagManagerOpen(true)
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  />
                )
              })
            )}
          </ul>
        </div>
      </section>
    </>
  )
}
