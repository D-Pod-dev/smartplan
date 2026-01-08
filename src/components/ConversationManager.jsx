import { useEffect, useState } from 'react'
import '../App.css'

const CONVERSATIONS_STORAGE_KEY = 'smartplan.conversations'
const CURRENT_CONVERSATION_KEY = 'smartplan.currentConversation'

export const loadConversations = () => {
  if (typeof localStorage === 'undefined') return []
  try {
    const saved = localStorage.getItem(CONVERSATIONS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

export const getCurrentConversationId = () => {
  if (typeof localStorage === 'undefined') return null
  try {
    const saved = localStorage.getItem(CURRENT_CONVERSATION_KEY)
    return saved ? saved : null
  } catch {}
  return null
}

export const saveConversations = (conversations) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations))
}

export const setCurrentConversationId = (id) => {
  if (typeof localStorage === 'undefined') return
  if (!id) {
    localStorage.removeItem(CURRENT_CONVERSATION_KEY)
    return
  }
  localStorage.setItem(CURRENT_CONVERSATION_KEY, id)
}

export const createConversation = (title) => {
  const id = Date.now().toString()
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  return {
    id,
    title: title?.trim() || `Conversation ${dateStr} · ${timeStr}`,
    createdAt: now.toISOString(),
    messages: [],
  }
}

export const deleteConversation = (conversations, conversationId) => {
  return conversations.filter((conv) => conv.id !== conversationId)
}

export const renameConversation = (conversations, conversationId, newTitle) => {
  return conversations.map((conv) =>
    conv.id === conversationId ? { ...conv, title: newTitle } : conv
  )
}

export default function ConversationManager({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  const handleNewConversation = () => {
    onNewConversation()
    setIsOpen(false)
  }

  const handleDelete = (id) => {
    if (confirm('Delete this conversation? This cannot be undone.')) {
      onDeleteConversation(id)
      setIsOpen(false)
    }
  }

  const handleRenameStart = (id, currentTitle) => {
    setEditingId(id)
    setEditTitle(currentTitle)
  }

  const handleRenameSave = (id) => {
    if (editTitle.trim() && onRenameConversation) {
      onRenameConversation(id, editTitle.trim())
    }
    setEditingId(null)
  }

  const handleRenameCancel = () => {
    setEditingId(null)
    setEditTitle('')
  }

  return (
    <div className="conversation-manager">
      <button
        className="conversation-manager__toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Manage conversations"
      >
        💬 Conversations ({conversations.length})
      </button>

      {isOpen && (
        <div className="conversation-manager__menu">
          <div className="conversation-manager__header">
            <h3>Your Conversations</h3>
            <button
              className="conversation-manager__new"
              onClick={handleNewConversation}
              title="Start a new conversation"
            >
              + New
            </button>
          </div>

          <div className="conversation-manager__list">
            {conversations.length === 0 ? (
              <p className="conversation-manager__empty">No conversations yet. Start a new one!</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-manager__item ${
                    conv.id === currentConversationId ? 'is-active' : ''
                  }`}
                >
                  {editingId === conv.id ? (
                    <div className="conversation-manager__edit-mode">
                      <input
                        type="text"
                        className="conversation-manager__edit-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Enter conversation title"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameSave(conv.id)
                          } else if (e.key === 'Escape') {
                            handleRenameCancel()
                          }
                        }}
                      />
                      <button
                        className="conversation-manager__edit-save"
                        onClick={() => handleRenameSave(conv.id)}
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        className="conversation-manager__edit-cancel"
                        onClick={handleRenameCancel}
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="conversation-manager__item-button"
                        onClick={() => {
                          onSelectConversation(conv.id)
                          setIsOpen(false)
                        }}
                      >
                        <span className="conversation-manager__item-title">{conv.title}</span>
                        <span className="conversation-manager__item-meta">
                          {conv.messages?.length || 0} messages
                        </span>
                      </button>
                      <button
                        className="conversation-manager__edit"
                        onClick={() => handleRenameStart(conv.id, conv.title)}
                        title="Edit conversation title"
                      >
                        ✎
                      </button>
                      <button
                        className="conversation-manager__delete"
                        onClick={() => handleDelete(conv.id)}
                        title="Delete conversation"
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <button
            className="conversation-manager__close"
            onClick={() => setIsOpen(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
