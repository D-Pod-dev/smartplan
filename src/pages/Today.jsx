import { useEffect, useMemo, useRef, useState } from 'react'
import '../App.css'

const seedTasks = [
  { id: 1, title: 'Outline launch checklist', due: { date: '2025-12-29', time: '11:00' }, tags: ['Launch'], priority: 'High', completed: false, timeAllocated: 90 },
  { id: 2, title: 'Reply to customer threads', due: { date: '2025-12-29', time: '13:00' }, tags: ['CX'], priority: 'Medium', completed: false, timeAllocated: 45 },
  { id: 3, title: 'Draft sprint goals', due: { date: '2025-12-29', time: '16:00' }, tags: ['Product'], priority: 'High', completed: false, timeAllocated: 75 },
  { id: 4, title: 'Share hiring scorecards', due: { date: '2025-12-29', time: '17:30' }, tags: ['People'], priority: 'Low', completed: false, timeAllocated: 50 },
]

const emptyDraft = () => ({
  title: '',
  dueDate: '',
  dueTime: '',
  priority: 'None',
  tags: [],
  timeAllocated: '',
})

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '')

const normalizeTask = (task) => {
  const parsedDue = (() => {
    if (task && typeof task.due === 'object' && task.due !== null) {
      return { date: task.due.date || '', time: task.due.time || '' }
    }
    if (typeof task?.due === 'string') {
      const pieces = task.due.split('·').map((part) => part.trim()).filter(Boolean)
      const [first, second] = pieces
      const date = isIsoDate(first) ? first : ''
      const time = pieces.length > 1 ? second : (!date && first && /\d/.test(first) ? first : '')
      return { date, time: time || '' }
    }
    return { date: '', time: '' }
  })()

  const normalizedTags = Array.isArray(task?.tags)
    ? task.tags.filter(Boolean)
    : task?.tag
      ? [task.tag]
      : []

  const rawTime = task?.timeAllocated
  const timeAllocated = rawTime === null || rawTime === undefined || rawTime === '' ? null : Number(rawTime)

  return {
    id: task?.id ?? Date.now(),
    title: task?.title ?? 'Untitled task',
    due: parsedDue,
    tags: normalizedTags,
    priority: task?.priority ?? 'None',
    completed: Boolean(task?.completed),
    timeAllocated: Number.isFinite(timeAllocated) ? timeAllocated : null,
  }
}

const deriveInitialTasks = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.tasks')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeTask)
        }
      } catch {}
    }
  }
  return seedTasks.map(normalizeTask)
}

const deriveInitialTags = (tasks) => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.tags')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return Array.from(new Set(parsed.map((t) => String(t).trim()).filter(Boolean)))
        }
      } catch {}
    }
  }
  return Array.from(new Set(tasks.flatMap((task) => task.tags || [])))
}

const formatTimeForDisplay = (time) => {
  if (!time) return ''
  if (/^\d{2}:\d{2}$/.test(time)) {
    const [hours, minutes] = time.split(':').map(Number)
    const date = new Date()
    date.setHours(hours)
    date.setMinutes(minutes)
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
  }
  return time
}

const formatDue = (due) => {
  if (!due?.date && !due?.time) return ''
  const dateLabel = due.date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${due.date}T00:00:00`)) : ''
  const timeLabel = formatTimeForDisplay(due.time)
  return [dateLabel, timeLabel].filter(Boolean).join(' · ')
}

export default function Today() {
  const initialData = useMemo(() => {
    const initialTasks = deriveInitialTasks()
    return { tasks: initialTasks, tags: deriveInitialTags(initialTasks) }
  }, [])

  const [tasks, setTasks] = useState(initialData.tasks)
  const [tags, setTags] = useState(initialData.tags)
  const [editingId, setEditingId] = useState(null)
  const [editingDraft, setEditingDraft] = useState(() => emptyDraft())
  const [composerDraft, setComposerDraft] = useState(() => emptyDraft())
  const [composerTagInput, setComposerTagInput] = useState('')
  const [editingTagInput, setEditingTagInput] = useState('')
  const [composerTagInputOpen, setComposerTagInputOpen] = useState(false)
  const [editingTagInputOpen, setEditingTagInputOpen] = useState(false)
  const composerRef = useRef(null)
  const composerTagInputRef = useRef(null)
  const editingTagInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('smartplan.tasks', JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem('smartplan.tags', JSON.stringify(tags))
  }, [tags])

  useEffect(() => {
    const tagsFromTasks = tasks.flatMap((t) => t.tags || [])
    setTags((prev) => {
      const merged = Array.from(new Set([...prev, ...tagsFromTasks]))
      return merged.length === prev.length && merged.every((tag, index) => tag === prev[index]) ? prev : merged
    })
  }, [tasks])

  useEffect(() => {
    if (composerTagInputOpen) {
      composerTagInputRef.current?.focus()
    }
  }, [composerTagInputOpen])

  useEffect(() => {
    if (editingTagInputOpen) {
      editingTagInputRef.current?.focus()
    }
  }, [editingTagInputOpen])

  const focusAdd = () => composerRef.current?.focus()

  const addTagToPool = (label) => {
    const tag = label.trim()
    if (!tag) return ''
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))
    return tag
  }

  const toggleComposerTagInput = () => {
    setComposerTagInputOpen((prev) => {
      if (prev) {
        setComposerTagInput('')
      }
      return !prev
    })
  }

  const toggleEditingTagInput = () => {
    setEditingTagInputOpen((prev) => {
      if (prev) {
        setEditingTagInput('')
      }
      return !prev
    })
  }

  const toggleTagSelection = (tag, target) => {
    const setter = target === 'edit' ? setEditingDraft : setComposerDraft
    setter((prev) => {
      const exists = prev.tags.includes(tag)
      const nextTags = exists ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag]
      return { ...prev, tags: nextTags }
    })
  }

  const attachNewTag = (input, target) => {
    const normalized = addTagToPool(input)
    if (!normalized) return
    const setter = target === 'edit' ? setEditingDraft : setComposerDraft
    setter((prev) => (prev.tags.includes(normalized) ? prev : { ...prev, tags: [...prev.tags, normalized] }))
    if (target === 'edit') {
      setEditingTagInput('')
      setEditingTagInputOpen(false)
    } else {
      setComposerTagInput('')
      setComposerTagInputOpen(false)
    }
  }

  const updateDraft = (target, field, value) => {
    const setter = target === 'edit' ? setEditingDraft : setComposerDraft
    setter((prev) => ({ ...prev, [field]: value }))
  }

  const resetComposer = () => {
    setComposerDraft(emptyDraft())
    setComposerTagInput('')
    setComposerTagInputOpen(false)
    focusAdd()
  }

  const addTask = () => {
    const title = composerDraft.title.trim()
    if (!title) return
    const normalizedTags = Array.from(new Set(composerDraft.tags.map((tag) => tag.trim()).filter(Boolean)))
    const parsedTime = composerDraft.timeAllocated === '' ? null : Number(composerDraft.timeAllocated)
    const timeAllocated = Number.isFinite(parsedTime) ? parsedTime : null

    const newTask = {
      id: Date.now(),
      title,
      due: { date: composerDraft.dueDate, time: composerDraft.dueTime },
      priority: composerDraft.priority || 'None',
      tags: normalizedTags,
      completed: false,
      timeAllocated,
    }

    setTasks((prev) => [newTask, ...prev])
    setTags((prev) => Array.from(new Set([...prev, ...normalizedTags])))
    resetComposer()
  }

  const toggleTask = (id) => {
    if (editingId) return
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  const startEdit = (task) => {
    setEditingId(task.id)
    setEditingDraft({
      title: task.title,
      dueDate: task.due?.date || '',
      dueTime: task.due?.time || '',
      priority: task.priority || 'None',
      tags: task.tags || [],
      timeAllocated: task.timeAllocated ?? '',
    })
    setEditingTagInput('')
    setEditingTagInputOpen(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingDraft(emptyDraft())
    setEditingTagInput('')
  }

  const saveEdit = (id) => {
    const title = editingDraft.title.trim()
    if (!title) return

    const normalizedTags = Array.from(new Set(editingDraft.tags.map((tag) => tag.trim()).filter(Boolean)))
    const parsedTime = editingDraft.timeAllocated === '' ? null : Number(editingDraft.timeAllocated)
    const timeAllocated = Number.isFinite(parsedTime) ? parsedTime : null

    setTasks((prev) => prev.map((t) => (t.id === id
      ? {
          ...t,
          title,
          due: { date: editingDraft.dueDate, time: editingDraft.dueTime },
          priority: editingDraft.priority || 'None',
          tags: normalizedTags,
          timeAllocated,
        }
      : t)))

    setTags((prev) => {
      const merged = Array.from(new Set([...prev, ...normalizedTags]))
      return merged.length === prev.length && merged.every((tag, index) => tag === prev[index]) ? prev : merged
    })

    cancelEdit()
  }

  const deleteTask = (id) => {
    const task = tasks.find((t) => t.id === id)
    const confirmed = window.confirm(`Delete "${task?.title ?? 'this task'}"?`)
    if (!confirmed) return
    setTasks((prev) => prev.filter((t) => t.id !== id))
    if (editingId === id) {
      cancelEdit()
    }
  }

  const renderTags = (taskTags) => {
    if (!taskTags?.length) {
      return <span className="pill pill--subtle">No tags</span>
    }
    return taskTags.map((tag) => (
      <span key={tag} className="pill pill--tag">{tag}</span>
    ))
  }

  return (
    <>
      <header className="page__header">
        <p className="eyebrow">SmartPlan</p>
        <h1>Today</h1>
        <p className="lede">Focus first, meetings second—SmartPlan keeps you flowing.</p>
        <div className="actions">
          <button className="action primary" type="button">Ask SmartPlan</button>
          <button className="action ghost" type="button" onClick={focusAdd}>Add task</button>
          <button className="action link" type="button">View backlog</button>
        </div>
      </header>

      <section className="panels panels--grid">
        <div className="panel panel--focus">
          <div className="panel__title">Today&apos;s tasks</div>

          <div className="list__item todo-row todo-row--compose">
            <button
              className="todo-checkbox todo-checkbox--add"
              type="button"
              aria-label="Add task"
              onClick={addTask}
            >
              +
            </button>
            <div className="todo-main">
              <input
                ref={composerRef}
                className="todo-edit-input"
                type="text"
                placeholder="Task name"
                value={composerDraft.title}
                onChange={(e) => updateDraft('compose', 'title', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTask()
                }}
              />

              <div className="todo-field-row">
                <label className="todo-field">
                  <span>Due date</span>
                  <input
                    className="todo-edit-input"
                    type="date"
                    value={composerDraft.dueDate}
                    onChange={(e) => updateDraft('compose', 'dueDate', e.target.value)}
                  />
                </label>
                <label className="todo-field">
                  <span>Due time</span>
                  <input
                    className="todo-edit-input"
                    type="time"
                    value={composerDraft.dueTime}
                    onChange={(e) => updateDraft('compose', 'dueTime', e.target.value)}
                  />
                </label>
                <label className="todo-field">
                  <span>Priority</span>
                  <select
                    className="todo-edit-input"
                    value={composerDraft.priority}
                    onChange={(e) => updateDraft('compose', 'priority', e.target.value)}
                  >
                    <option value="None">None</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>
                <label className="todo-field">
                  <span>Time allotted (min)</span>
                  <input
                    className="todo-edit-input"
                    type="number"
                    min="0"
                    step="5"
                    value={composerDraft.timeAllocated}
                    onChange={(e) => updateDraft('compose', 'timeAllocated', e.target.value)}
                  />
                </label>
              </div>

              <div className="todo-field">
                <span>Tags</span>
                <div className="tag-picker">
                  <div className="tag-options">
                    {tags.map((tag) => {
                      const isSelected = composerDraft.tags.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          className={`pill pill--tag ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => toggleTagSelection(tag, 'compose')}
                        >
                          {tag}
                        </button>
                      )
                    })}
                    {composerTagInputOpen && (
                      <div className="tag-create tag-create--inline">
                        <input
                          ref={composerTagInputRef}
                          className="todo-edit-input"
                          type="text"
                          placeholder="New tag"
                          value={composerTagInput}
                          onChange={(e) => setComposerTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              attachNewTag(composerTagInput, 'compose')
                            }
                          }}
                        />
                        <button className="action ghost" type="button" onClick={() => attachNewTag(composerTagInput, 'compose')}>
                          Add tag
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      className={`pill pill--tag pill--add-tag ${composerTagInputOpen ? 'is-active' : ''}`}
                      title="Create new tag"
                      onClick={toggleComposerTagInput}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="todo-actions">
              <button className="action link" type="button" onClick={resetComposer}>Clear</button>
              <button className="action primary" type="button" onClick={addTask}>Add</button>
            </div>
          </div>

          <ul className="list list--focus">
            {tasks.map((task) => {
              const isEditing = editingId === task.id
              return (
                <li key={task.id} className="list__item">
                  <div className={`todo-row ${isEditing ? 'is-editing' : ''}`}>
                    <input
                      type="checkbox"
                      className="todo-checkbox"
                      aria-label={`Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      disabled={Boolean(editingId)}
                    />

                    <div className="todo-main">
                      {isEditing ? (
                        <>
                          <input
                            className="todo-edit-input"
                            type="text"
                            value={editingDraft.title}
                            onChange={(e) => updateDraft('edit', 'title', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(task.id)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            autoFocus
                          />

                          <div className="todo-field-row">
                            <label className="todo-field">
                              <span>Due date</span>
                              <input
                                className="todo-edit-input"
                                type="date"
                                value={editingDraft.dueDate}
                                onChange={(e) => updateDraft('edit', 'dueDate', e.target.value)}
                              />
                            </label>
                            <label className="todo-field">
                              <span>Due time</span>
                              <input
                                className="todo-edit-input"
                                type="time"
                                value={editingDraft.dueTime}
                                onChange={(e) => updateDraft('edit', 'dueTime', e.target.value)}
                              />
                            </label>
                            <label className="todo-field">
                              <span>Priority</span>
                              <select
                                className="todo-edit-input"
                                value={editingDraft.priority}
                                onChange={(e) => updateDraft('edit', 'priority', e.target.value)}
                              >
                                <option value="None">None</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            </label>
                            <label className="todo-field">
                              <span>Time allotted (min)</span>
                              <input
                                className="todo-edit-input"
                                type="number"
                                min="0"
                                step="5"
                                value={editingDraft.timeAllocated}
                                onChange={(e) => updateDraft('edit', 'timeAllocated', e.target.value)}
                              />
                            </label>
                          </div>

                          <div className="todo-field">
                            <span>Tags</span>
                            <div className="tag-picker">
                              <div className="tag-options">
                                {tags.map((tag) => {
                                  const isSelected = editingDraft.tags.includes(tag)
                                  return (
                                    <button
                                      key={tag}
                                      type="button"
                                      className={`pill pill--tag ${isSelected ? 'is-selected' : ''}`}
                                      onClick={() => toggleTagSelection(tag, 'edit')}
                                    >
                                      {tag}
                                    </button>
                                  )
                                })}
                                {editingTagInputOpen && (
                                  <div className="tag-create tag-create--inline">
                                    <input
                                      ref={editingTagInputRef}
                                      className="todo-edit-input"
                                      type="text"
                                      placeholder="New tag"
                                      value={editingTagInput}
                                      onChange={(e) => setEditingTagInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault()
                                          attachNewTag(editingTagInput, 'edit')
                                        }
                                      }}
                                    />
                                    <button className="action ghost" type="button" onClick={() => attachNewTag(editingTagInput, 'edit')}>
                                      Add tag
                                    </button>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  className={`pill pill--tag pill--add-tag ${editingTagInputOpen ? 'is-active' : ''}`}
                                  title="Create new tag"
                                  onClick={toggleEditingTagInput}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={`list__title todo-title ${task.completed ? 'is-completed' : ''}`}>{task.title}</div>
                          <div className="list__meta todo-meta">
                            <span className="pill pill--subtle">{formatDue(task.due) || 'No due date'}</span>
                            <span className="pill pill--subtle">{task.timeAllocated ? `${task.timeAllocated} min` : 'No estimate'}</span>
                            <span className="pill pill--subtle">{task.priority === 'None' ? 'No priority' : `${task.priority} priority`}</span>
                            {renderTags(task.tags)}
                          </div>
                        </>
                      )}
                    </div>

                    <div className={`todo-actions ${isEditing ? 'is-editing' : ''}`}>
                      {isEditing ? (
                        <>
                          <button className="action link" type="button" onClick={cancelEdit}>Cancel</button>
                          <button className="action ghost" type="button" onClick={() => saveEdit(task.id)}>Save</button>
                        </>
                      ) : (
                        <>
                          <button className="action link" type="button" onClick={() => startEdit(task)}>Edit</button>
                          <button className="action link" type="button" onClick={() => deleteTask(task.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <button className="action ghost" type="button">Auto-prioritize with SmartPlan</button>
        </div>
      </section>
    </>
  )
}
