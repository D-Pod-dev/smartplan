import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '../App.css'
import { applyModifications, normalizeTodo, sendChatMessage } from '../utils/groq'
import ConversationManager, {
  loadConversations,
  getCurrentConversationId,
  saveConversations,
  setCurrentConversationId as persistCurrentConversationId,
  createConversation,
  deleteConversation,
  renameConversation,
} from '../components/ConversationManager'
import { loadInsights, saveInsights, incrementAiAssistedTasks, incrementTotalTasksCreated } from '../utils/insightTracker'
import { useSupabaseTaskSync } from '../hooks/useSupabaseTaskSync'
import { useSupabaseConversations } from '../hooks/useSupabaseConversations'

const TODO_STORAGE_KEY = 'smartplan.tasks'

const quickPrompts = [
  { label: 'Auto-plan today', text: 'Plan today using my tasks. Keep focus blocks before noon and leave 30 minutes for buffer.' },
  { label: 'Delegate to team', text: 'Pick tasks that can be delegated and mark them with a Delegated tag.' },
  { label: 'Summarize tasks', text: 'Summarize my tasks into a short plan with priorities.' },
]

const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const loadTodos = () => {
  if (typeof localStorage === 'undefined') return []
  try {
    const saved = localStorage.getItem(TODO_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed.map(normalizeTodo)
    }
  } catch {}
  return []
}

const toModelMessages = (thread = []) =>
  thread.map((item) => ({
    role: item.role === 'ai' ? 'assistant' : 'user',
    content: item.message,
  }))

const SMARTPLAN_TAG_REGEX = /<smartplan_actions>[\s\S]*?<\/smartplan_actions>/gi
const stripSmartPlanActions = (text = '') => text.replace(SMARTPLAN_TAG_REGEX, '').trim()

export default function SmartPlan() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState(() => loadConversations())
  const [currentConversationId, setCurrentConversationId] = useState(
    () => getCurrentConversationId() || (conversations.length > 0 ? conversations[0].id : null)
  )
  const [message, setMessage] = useState('')
  const [todos, setTodos] = useState(() => loadTodos())
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [messageActionState, setMessageActionState] = useState({}) // messageId -> { executedCount, actions with state }
  const [actionHistory, setActionHistory] = useState([]) // For undo functionality
  const [showRawForMessage, setShowRawForMessage] = useState({}) // messageId -> boolean
  const chatRef = useRef(null)
  
  // Sync tasks with Supabase
  useSupabaseTaskSync({
    tasks: todos,
    setTasks: setTodos,
    normalizeTask: normalizeTodo,
    storageKey: 'smartplan.tasks',
  })

  // Sync conversations with Supabase
  const { syncStatus: conversationsSyncStatus } = useSupabaseConversations(conversations, currentConversationId)

  const currentConversation = conversations.find((c) => c.id === currentConversationId)
  const chatThread = currentConversation?.messages || []

  const previewTodos = useMemo(() => todos.slice(0, 6), [todos])

  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    saveConversations(conversations)
  }, [conversations])

  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    persistCurrentConversationId(currentConversationId)
  }, [currentConversationId])

  useEffect(() => {
    if (!chatRef.current) return
    chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatThread, sending])

  const handleSend = async (text) => {
    const content = text.trim()
    if (!content || sending) return
    setError('')

    const activeConversation = currentConversation || createConversation()
    if (!currentConversation) {
      setConversations((prev) => [...prev, activeConversation])
      setCurrentConversationId(activeConversation.id)
    }

    const now = Date.now()
    const userMessage = {
      id: now,
      author: 'You',
      role: 'user',
      message: content,
      time: formatTime(),
    }

    const nextMessages = [...(activeConversation.messages || []), userMessage]
    
    // Update conversation with new message
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversation.id
          ? { ...conv, messages: nextMessages }
          : conv
      )
    )
    
    setMessage('')
    setSending(true)

    try {
      const { content: aiContent, actions } = await sendChatMessage(toModelMessages(nextMessages), todos)
      
      // Capture task data before execution for persistence
      const actionTitles = {}
      const actionPreviousValues = {}
      const actionTaskData = {}
      
      if (Array.isArray(actions)) {
        actions.forEach((action, idx) => {
          const actionType = String(action.type).toLowerCase()
          
          if ((actionType === 'update' || actionType === 'delete') && action.id !== undefined) {
            // Try to find the task with flexible ID matching
            const todo = todos.find(t => t.id == action.id || String(t.id) === String(action.id))
            if (todo) {
              actionTitles[idx] = todo.title || 'Untitled'
              
              // Store previous values for update actions
              if (actionType === 'update' && action.fields) {
                const previousValues = {}
                Object.keys(action.fields).forEach(field => {
                  previousValues[field] = todo[field]
                })
                actionPreviousValues[idx] = previousValues
              }
            } else {
              console.warn(`Could not find task with ID ${action.id} for ${actionType} action. Available IDs:`, todos.map(t => t.id))
            }
          }
          
          // Store task data for create actions
          if (actionType === 'create' && action.task) {
            actionTaskData[idx] = action.task
          }
        })
      }
      
      const aiMessage = {
        id: now + 1,
        author: 'SmartPlan',
        role: 'ai',
        message: stripSmartPlanActions(aiContent),
        time: formatTime(),
        actions: actions || [],
        actionStates: {}, // Track approval/rejection state of actions
        actionTitles, // Persist titles of tasks being edited/deleted
        actionPreviousValues, // Persist previous values for updates
        actionTaskData, // Persist task data for creates
      }
      
      const updatedMessages = [...nextMessages, aiMessage]
      
      // Update conversation with AI response
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversation.id
            ? { ...conv, messages: updatedMessages }
            : conv
        )
      )

      // Process actions sequentially, stopping at first delete
      if (Array.isArray(actions) && actions.length > 0) {
        let currentTodos = [...todos]
        let executedCount = 0
        let createdTasksCount = 0
        
        for (let i = 0; i < actions.length; i++) {
          const action = actions[i]
          if (action.type === 'delete') {
            // Stop at delete - user needs to approve
            break
          }
          
          // Count created tasks for insight tracking
          if (action.type === 'create') {
            createdTasksCount++
          }
          
          // Execute non-delete action
          const previousTodos = [...currentTodos]
          currentTodos = applyModifications(currentTodos.map(normalizeTodo), [action])
          
          // Track for undo
          const historyId = `${aiMessage.id}-${i}`
          setActionHistory((prev) => [...prev, { id: historyId, previousTodos }])
          
          executedCount++
        }
        
        if (executedCount > 0) {
          setTodos(currentTodos)
          
          // Update insights - track AI-assisted tasks created
          if (createdTasksCount > 0) {
            const currentInsights = loadInsights()
            let updatedInsights = currentInsights
            for (let j = 0; j < createdTasksCount; j++) {
              updatedInsights = incrementAiAssistedTasks(updatedInsights)
              updatedInsights = incrementTotalTasksCreated(updatedInsights)
            }
            saveInsights(updatedInsights)
          }
        }
        
        // Initialize message action state
        const newState = { executedCount }
        setMessageActionState((prev) => ({
          ...prev,
          [aiMessage.id]: newState
        }))
        
        // Persist executed count to message
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === activeConversation.id
              ? {
                  ...conv,
                  messages: conv.messages.map((msg) =>
                    msg.id === aiMessage.id
                      ? { ...msg, executedCount }
                      : msg
                  )
                }
              : conv
          )
        )
      }
    } catch (err) {
      setError(err?.message || 'Unable to reach SmartPlan. Check your Groq API settings.')
    } finally {
      setSending(false)
    }
  }

  const handleQuickPrompt = (promptText) => {
    setMessage(promptText)
    handleSend(promptText)
  }

  const handleNewConversation = () => {
    setCurrentConversationId(null)
    setMessage('')
    setMessageActionState({})
    setActionHistory([])
    setShowRawForMessage({})
  }

  const toggleRawView = (messageId) => {
    setShowRawForMessage((prev) => ({
      ...prev,
      [messageId]: !prev[messageId]
    }))
  }

  const downloadRawMessage = (messageId, message) => {
    const rawContent = JSON.stringify(message, null, 2)
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(rawContent))
    element.setAttribute('download', `message-${messageId}.json`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const openRawMessageInNewTab = (messageId, message) => {
    const rawContent = JSON.stringify(message, null, 2)
    const blob = new Blob([rawContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  const handleViewTask = (taskId) => {
    if (!taskId) return
    navigate('/tasks')
    setTimeout(() => {
      const el = document.getElementById(`task-${taskId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('highlight-task')
        
        // Try to focus on a focusable element within the task
        const focusable = el.querySelector('button, input, [tabindex]')
        if (focusable) {
          focusable.focus()
        }
        
        // Check if task still exists and remove highlight when it's deleted
        const checkTaskExists = setInterval(() => {
          const taskEl = document.getElementById(`task-${taskId}`)
          if (!taskEl) {
            // Task no longer exists, stop checking
            clearInterval(checkTaskExists)
          }
        }, 500)
        
        // Also allow manual removal by clicking the task element itself
        el.addEventListener('click', () => {
          el.classList.remove('highlight-task')
          clearInterval(checkTaskExists)
        }, { once: true })
      }
    }, 400)
  }

  const handleUndo = (messageId, actionIndex) => {
    const historyId = `${messageId}-${actionIndex}`
    const historyEntry = actionHistory.find((h) => h.id === historyId)
    if (!historyEntry) return
    
    setTodos(historyEntry.previousTodos)
    setActionHistory((prev) => prev.filter((h) => h.id !== historyId))
    
    // Persist undo state to conversation
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: conv.messages.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      actionStates: { ...(msg.actionStates || {}), [actionIndex]: 'undone' }
                    }
                  : msg
              )
            }
          : conv
      )
    )
  }

  const handleApproveDelete = (messageId, actionIndex, action) => {
    const message = chatThread.find((m) => m.id === messageId)
    if (!message?.actions) return
    
    const previousTodos = [...todos]
    const updatedTodos = applyModifications(todos.map(normalizeTodo), [action])
    setTodos(updatedTodos)
    
    // Track for undo
    const historyId = `${messageId}-${actionIndex}`
    setActionHistory((prev) => [...prev, { id: historyId, previousTodos }])
    
    // Persist approval state
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: conv.messages.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      actionStates: { ...(msg.actionStates || {}), [actionIndex]: 'approved' }
                    }
                  : msg
              )
            }
          : conv
      )
    )
    
    // Continue executing remaining actions
    const state = messageActionState[messageId] || { executedCount: 0 }
    let currentTodos = updatedTodos
    let newExecutedCount = actionIndex + 1
    
    for (let i = actionIndex + 1; i < message.actions.length; i++) {
      const nextAction = message.actions[i]
      if (nextAction.type === 'delete') {
        // Stop at next delete
        break
      }
      
      const prevTodos = [...currentTodos]
      currentTodos = applyModifications(currentTodos.map(normalizeTodo), [nextAction])
      
      const nextHistoryId = `${messageId}-${i}`
      setActionHistory((prev) => [...prev, { id: nextHistoryId, previousTodos: prevTodos }])
      
      newExecutedCount++
    }
    
    if (currentTodos !== updatedTodos) {
      setTodos(currentTodos)
    }
    
    setMessageActionState((prev) => ({
      ...prev,
      [messageId]: { ...state, executedCount: newExecutedCount }
    }))
    
    // Persist executedCount to conversation
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: conv.messages.map((msg) =>
                msg.id === messageId
                  ? { ...msg, executedCount: newExecutedCount }
                  : msg
              )
            }
          : conv
      )
    )
  }

  const handleRejectDelete = (messageId, actionIndex) => {
    const message = chatThread.find((m) => m.id === messageId)
    if (!message?.actions) return
    
    // Persist rejection state
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: conv.messages.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      actionStates: { ...(msg.actionStates || {}), [actionIndex]: 'rejected' }
                    }
                  : msg
              )
            }
          : conv
      )
    )
    
    // Continue with remaining actions after this delete
    const state = messageActionState[messageId] || { executedCount: 0 }
    let currentTodos = [...todos]
    let newExecutedCount = actionIndex + 1
    
    for (let i = actionIndex + 1; i < message.actions.length; i++) {
      const nextAction = message.actions[i]
      if (nextAction.type === 'delete') {
        // Stop at next delete
        break
      }
      
      const prevTodos = [...currentTodos]
      currentTodos = applyModifications(currentTodos.map(normalizeTodo), [nextAction])
      
      const historyId = `${messageId}-${i}`
      setActionHistory((prev) => [...prev, { id: historyId, previousTodos: prevTodos }])
      
      newExecutedCount++
    }
    
    if (currentTodos.length !== todos.length || JSON.stringify(currentTodos) !== JSON.stringify(todos)) {
      setTodos(currentTodos)
    }
    
    setMessageActionState((prev) => ({
      ...prev,
      [messageId]: { ...state, executedCount: newExecutedCount }
    }))
    
    // Persist executedCount to conversation
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: conv.messages.map((msg) =>
                msg.id === messageId
                  ? { ...msg, executedCount: newExecutedCount }
                  : msg
              )
            }
          : conv
      )
    )
  }

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id)
  }

  const handleDeleteConversation = (id) => {
    const updated = deleteConversation(conversations, id)
    setConversations(updated)
    
    // If deleted conversation was current, select first remaining or create new
    if (id === currentConversationId) {
      if (updated.length > 0) {
        setCurrentConversationId(updated[0].id)
      } else {
        handleNewConversation()
      }
    }
  }

  const handleRenameConversation = (id, newTitle) => {
    const updated = renameConversation(conversations, id, newTitle)
    setConversations(updated)
  }

  const formatDue = (due) => {
    if (!due?.date) return 'No due date'
    return `${due.date}${due.time ? ` · ${due.time}` : ''}`
  }

  const formatFieldValue = (field, value) => {
    if (value === null || value === undefined) return 'None'
    if (field === 'due' && typeof value === 'object') {
      return formatDue(value)
    }
    if (field === 'tags' && Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'None'
    }
    if (field === 'completed') {
      return value ? 'Yes' : 'No'
    }
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return String(value)
  }

  const formatFieldName = (field) => {
    const names = {
      title: 'Title',
      description: 'Description',
      priority: 'Priority',
      due: 'Due Date',
      tags: 'Tags',
      completed: 'Completed',
      timeAllocated: 'Time Allocated',
      startTime: 'Start Time',
      focusBlock: 'Focus Block',
    }
    return names[field] || field
  }

  return (
    <>
      <header className="page__header">
        <p className="eyebrow">Assistant</p>
        <h1>SmartPlan chat</h1>
        <p className="lede">Describe what you need—SmartPlan plans, schedules, and applies changes to your tasks.</p>
      </header>

      <ConversationManager
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
      />

      <section className="panels panels--grid">
        <div className="panel panel--chat">
          <div className="panel__title">{currentConversation?.title || 'New conversation'}</div>
          <div className="chat-thread" ref={chatRef}>
            {chatThread.length === 0 && !sending && <p className="todo-meta">Start a new plan by describing your day.</p>}
            {chatThread.map((item) => (
              <div key={item.id} className={`chat-bubble chat-bubble--${item.role}`}>
                <div className="chat-bubble__meta">
                  <span className="chat-bubble__author">{item.author}</span>
                  <span className="chat-bubble__time">{item.time}</span>
                </div>
                <div className="chat-bubble__text">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.message}</ReactMarkdown>
                </div>
                {item.actions?.length ? (
                  <>
                    <div className="action-list">
                    {item.actions.map((action, idx) => {
                      const state = messageActionState[item.id] || { executedCount: item.executedCount || 0 }
                      const persistedState = item.actionStates?.[idx]
                      const isExecuted = idx < state.executedCount
                      const isApproved = persistedState === 'approved'
                      const isRejected = persistedState === 'rejected'
                      const isUndone = persistedState === 'undone'
                      const isPending = idx === state.executedCount && action.type === 'delete' && !persistedState
                      const isBlocked = idx > state.executedCount && !persistedState
                      
                      // Use persisted title first, then fallback to action data or current todos
                      let taskName = 'Untitled'
                      if (item.actionTitles?.[idx]) {
                        taskName = item.actionTitles[idx]
                      } else if (action.task?.title) {
                        taskName = action.task.title
                      } else if (action.id !== undefined) {
                        // Try flexible ID matching
                        const todo = todos.find(t => t.id == action.id || String(t.id) === String(action.id))
                        if (todo?.title) taskName = todo.title
                      }
                      
                      const actionType = String(action.type).toLowerCase()
                      
                      let taskId = null
                      if (actionType === 'create' && (isExecuted || isApproved)) {
                        const match = todos.find(t => t.title === action.task?.title)
                        taskId = match?.id
                      } else if ((actionType === 'update' || actionType === 'complete') && action.id) {
                        taskId = action.id
                      }
                      
                      // Use persisted task data for create actions
                      const taskData = item.actionTaskData?.[idx] || action.task
                      const previousValues = item.actionPreviousValues?.[idx]
                      
                      return (
                        <div key={idx} className={`action-item action-item--${actionType} ${isExecuted || isApproved ? 'action-item--executed' : ''} ${isPending ? 'action-item--pending' : ''} ${isRejected ? 'action-item--rejected' : ''} ${isUndone ? 'action-item--undone' : ''} ${isBlocked ? 'action-item--blocked' : ''}`}>
                          <div className="action-item__header">
                            <div className="action-item__info">
                              <span className="action-item__type">{action.type}</span>
                              <span className="action-item__name">{taskName}</span>
                            </div>
                            <div className="action-item__header-buttons">
                              {(isExecuted || isApproved) && actionType !== 'delete' && !isUndone && (
                                <>
                                  {taskId && (
                                    <button className="action ghost" onClick={() => handleViewTask(taskId)}>
                                      View
                                    </button>
                                  )}
                                  {actionHistory.some((h) => h.id === `${item.id}-${idx}`) && (
                                    <button className="action ghost" onClick={() => handleUndo(item.id, idx)}>
                                      Undo
                                    </button>
                                  )}
                                </>
                              )}
                              {isApproved && actionType === 'delete' && (
                                <span className="action-item__status action-item__status--approved">
                                  Approved
                                </span>
                              )}
                              {isPending && (
                                <span className="action-item__status action-item__status--pending">
                                  Pending
                                </span>
                              )}
                              {isRejected && (
                                <span className="action-item__status action-item__status--rejected">
                                  Rejected
                                </span>
                              )}
                              {isUndone && (
                                <span className="action-item__status action-item__status--undone">
                                  Undone
                                </span>
                              )}
                              {isBlocked && (
                                <span className="action-item__status action-item__status--blocked">Blocked</span>
                              )}
                            </div>
                          </div>
                          
                          {actionType === 'create' && taskData && (
                            <details className="action-item__details">
                              <summary>View values</summary>
                              <div className="action-item__field-list">
                                {Object.entries(taskData).map(([field, value]) => (
                                  <div key={field} className="action-item__field">
                                    <span className="action-item__field-name">{formatFieldName(field)}:</span>
                                    <span className="action-item__field-value">{formatFieldValue(field, value)}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                          
                          {actionType === 'update' && action.fields && (
                            <div className="action-item__changes">
                              <strong>Changes:</strong>
                              <div className="action-item__field-list">
                                {Object.entries(action.fields).map(([field, newValue]) => {
                                  const oldValue = previousValues?.[field]
                                  return (
                                    <div key={field} className="action-item__field">
                                      <span className="action-item__field-name">{formatFieldName(field)}:</span>
                                      <div className="action-item__field-change">
                                        <span className="action-item__field-old">{formatFieldValue(field, oldValue)}</span>
                                        <span className="action-item__field-arrow">→</span>
                                        <span className="action-item__field-new">{formatFieldValue(field, newValue)}</span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          
                          {isPending && actionType === 'delete' && (
                            <div className="action-item__buttons">
                              <button className="action" onClick={() => handleApproveDelete(item.id, idx, action)}>
                                Delete
                              </button>
                              <button className="action ghost" onClick={() => handleRejectDelete(item.id, idx)}>
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}  
                    </div>
                    <div className="message-raw-controls">
                      <button 
                        className="json-link" 
                        onClick={() => toggleRawView(item.id)}
                      >
                        {showRawForMessage[item.id] ? '↑ hide raw' : '↓ show raw'}
                      </button>
                      {showRawForMessage[item.id] && (
                        <div className="message-raw-actions">
                          <button 
                            className="action ghost" 
                            onClick={() => openRawMessageInNewTab(item.id, item)}
                          >
                            Open in new tab
                          </button>
                          <button 
                            className="action ghost" 
                            onClick={() => downloadRawMessage(item.id, item)}
                          >
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                    {showRawForMessage[item.id] && (
                      <pre className="chat-bubble__raw-content">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    )}
                  </>
                ) : null}
              </div>
            ))}
            {sending && (
              <div className="chat-bubble chat-bubble--ai">
                <div className="chat-bubble__meta">
                  <span className="chat-bubble__author">SmartPlan</span>
                  <span className="chat-bubble__time">Now</span>
                </div>
                <p className="chat-bubble__text">Thinking through your schedule…</p>
              </div>
            )}
          </div>
          {error && <div className="pill pill--filled">{error}</div>}
          <div className="chat__composer">
            <textarea
              className="chat__input"
              placeholder="Tell SmartPlan what to handle"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(message)
                }
              }}
              disabled={sending}
            />
            <button className="chat__submit" type="button" onClick={() => handleSend(message)} disabled={sending}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
          <div className="chips">
            {quickPrompts.map((chip) => (
              <button
                key={chip.label}
                className="chip"
                type="button"
                onClick={() => handleQuickPrompt(chip.text)}
                disabled={sending}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel__title">Todo snapshot</div>
          <p className="panel__copy">These tasks are sent with each chat message so the assistant can propose edits.</p>
          {previewTodos.length === 0 && <p className="todo-meta">No tasks found. Add some in Today or Tasks, or let SmartPlan create them.</p>}
          <div className="list">
            {previewTodos.map((todo) => (
              <div key={todo.id} className="list__item">
                <div className="list__title">{todo.title}</div>
                <div className="list__meta">
                  <span className="pill pill--empty">{todo.priority || 'None'}</span>
                  <span className="pill pill--empty">{formatDue(todo.due)}</span>
                  {todo.tags?.slice(0, 3).map((tag) => (
                    <span key={tag} className="pill pill--empty">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {todos.length > previewTodos.length && (
            <p className="todo-meta">+{todos.length - previewTodos.length} more tasks in context</p>
          )}
        </div>
      </section>

    </>
  )
}
