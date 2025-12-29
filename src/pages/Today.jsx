import { useEffect, useRef, useState } from 'react'
import '../App.css'

const seedTasks = [
  { id: 1, title: 'Outline launch checklist', due: 'Today · 11:00 AM', tag: 'Launch', priority: 'High', completed: false },
  { id: 2, title: 'Reply to customer threads', due: 'Today · 1:00 PM', tag: 'CX', priority: 'Medium', completed: false },
  { id: 3, title: 'Draft sprint goals', due: 'Today · 4:00 PM', tag: 'Product', priority: 'High', completed: false },
  { id: 4, title: 'Share hiring scorecards', due: 'Today · 5:30 PM', tag: 'People', priority: 'Low', completed: false },
]

export default function Today() {
  const [tasks, setTasks] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDue, setNewDue] = useState('')
  const composerRef = useRef(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    const saved = localStorage.getItem('smartplan.tasks')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setTasks(parsed)
          isInitialMount.current = false
          return
        }
      } catch {}
    }
    setTasks(seedTasks)
    isInitialMount.current = false
  }, [])

  useEffect(() => {
    if (isInitialMount.current) return
    localStorage.setItem('smartplan.tasks', JSON.stringify(tasks))
  }, [tasks])

  const focusAdd = () => composerRef.current?.focus()

  const addTask = () => {
    const title = newTitle.trim()
    if (!title) return
    const id = Date.now()
    const due = newDue.trim()
    setTasks((prev) => [{ id, title, due, tag: 'General', priority: 'Medium', completed: false }, ...prev])
    setNewTitle('')
    setNewDue('')
    composerRef.current?.focus()
  }

  const toggleTask = (id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  const startEdit = (task) => {
    setEditingId(task.id)
    setEditingTitle(task.title)
  }

  const saveEdit = (id) => {
    const title = editingTitle.trim()
    if (!title) return
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)))
    setEditingId(null)
    setEditingTitle('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
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

          <div className="todo-composer">
            <input
              ref={composerRef}
              className="todo-edit-input"
              type="text"
              placeholder="Add a task"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTask()
              }}
            />
            <input
              className="todo-edit-input"
              type="text"
              placeholder="Due (optional)"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTask()
              }}
            />
            <button className="action ghost" type="button" onClick={addTask}>Add</button>
          </div>

          <ul className="list list--focus">
            {tasks.map((task) => (
              <li key={task.id} className="list__item">
                <div className="todo-row">
                  <input
                    type="checkbox"
                    aria-label={`Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                  />

                  <div className="todo-main">
                    {editingId === task.id ? (
                      <>
                        <input
                          className="todo-edit-input"
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(task.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          autoFocus
                        />
                        <div className="todo-actions">
                          <button className="action ghost" type="button" onClick={() => saveEdit(task.id)}>Save</button>
                          <button className="action link" type="button" onClick={cancelEdit}>Cancel</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={`list__title todo-title ${task.completed ? 'is-completed' : ''}`}>{task.title}</div>
                        {(task.due || task.tag) && (
                          <div className="list__meta todo-meta">
                            {task.due}
                            {task.tag ? (task.due ? ' · ' : '') + task.tag : ''}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="todo-actions">
                    {editingId !== task.id && (
                      <button className="action link" type="button" onClick={() => startEdit(task)}>Edit</button>
                    )}
                    <button className="action link" type="button" onClick={() => deleteTask(task.id)}>Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <button className="action ghost" type="button">Auto-prioritize with SmartPlan</button>
        </div>
      </section>
    </>
  )
}
