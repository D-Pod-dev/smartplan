import { useEffect, useMemo, useRef, useState } from 'react'

const PROTECTED_TAGS = ['Goal']

export default function TagManager({
  isOpen,
  tags = [],
  selectedTags = [],
  onChangeSelected,
  onCreateTag,
  onRenameTag,
  onDeleteTag,
  onClearSelected,
  onCancel,
  onDone,
  title = 'Manage Tags',
}) {
  const [search, setSearch] = useState('')
  const [newTagInput, setNewTagInput] = useState('')
  const [editId, setEditId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [infoPopupTag, setInfoPopupTag] = useState(null)
  const closeBtnRef = useRef(null)
  const editInputRef = useRef(null)
  const infoGotItRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setNewTagInput('')
      setEditId(null)
      setEditValue('')
      setInfoPopupTag(null)
      closeBtnRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (editId) {
      editInputRef.current?.focus()
    }
  }, [editId])

  useEffect(() => {
    if (infoPopupTag) {
      infoGotItRef.current?.focus()
    }
  }, [infoPopupTag])

  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? tags.filter((t) => t.toLowerCase().includes(q)) : tags
  }, [tags, search])

  if (!isOpen) return null

  const toggleSelection = (tag) => {
    if (!onChangeSelected) return
    if (PROTECTED_TAGS.includes(tag)) return // Prevent toggling protected tags
    const exists = selectedTags.includes(tag)
    const next = exists ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag]
    onChangeSelected(next)
  }

  const handleCreate = () => {
    if (!newTagInput.trim()) return
    const trimmed = newTagInput.trim()
    if (PROTECTED_TAGS.includes(trimmed)) {
      alert(`The "${trimmed}" tag is protected and cannot be created manually.`)
      setNewTagInput('')
      return
    }
    const normalized = onCreateTag?.(trimmed)
    if (normalized) {
      if (!selectedTags.includes(normalized)) {
        onChangeSelected?.([...selectedTags, normalized])
      }
      setNewTagInput('')
    }
  }

  const handleRename = () => {
    const nextName = editValue.trim()
    if (!nextName || nextName === editId) {
      setEditId(null)
      setEditValue('')
      return
    }
    onRenameTag?.(editId, nextName)
    setEditId(null)
    setEditValue('')
  }

  const handleDelete = (tag) => {
    onDeleteTag?.(tag)
    if (selectedTags.includes(tag)) {
      onChangeSelected?.(selectedTags.filter((t) => t !== tag))
    }
  }

  return (
    <>
      <div
        className="sidebar-overlay"
        onClick={onCancel}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel?.()
        }}
        role="button"
        tabIndex={0}
      />
      <div className="tag-manager-modal">
        <div className="tag-manager-header">
          <h2>{title}</h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="action link"
            onClick={onCancel}
          >
            ✕
          </button>
        </div>
        <div className="tag-manager-content">
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              className="todo-edit-input"
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {filteredTags.length === 0 ? (
            <p className="tag-manager-empty">{search ? 'No tags match your search.' : 'No tags yet. Create one below!'}</p>
          ) : (
            <ul className="tag-manager-list">
              {filteredTags.map((tag) => (
                <li key={tag} className="tag-manager-item">
                  {editId === tag ? (
                    <div className="tag-manager-edit">
                      <input
                        ref={editInputRef}
                        type="text"
                        className="todo-edit-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename()
                          if (e.key === 'Escape') {
                            setEditId(null)
                            setEditValue('')
                          }
                        }}
                        autoFocus
                      />
                      <div className="tag-manager-actions">
                        <button type="button" className="action ghost" onClick={handleRename}>Save</button>
                        <button
                          type="button"
                          className="action link"
                          onClick={() => {
                            setEditId(null)
                            setEditValue('')
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`pill pill--tag ${selectedTags.includes(tag) ? 'is-selected' : ''} ${PROTECTED_TAGS.includes(tag) ? 'is-disabled' : ''}`}
                        onClick={() => toggleSelection(tag)}
                        style={{ cursor: PROTECTED_TAGS.includes(tag) ? 'not-allowed' : 'pointer', opacity: PROTECTED_TAGS.includes(tag) ? 0.7 : 1 }}
                        title={PROTECTED_TAGS.includes(tag) ? 'This tag is automatically managed and cannot be manually added or removed' : undefined}
                      >
                        {tag}
                      </button>
                      <div className="tag-manager-actions">
                        {!PROTECTED_TAGS.includes(tag) && (
                          <>
                            <button
                              type="button"
                              className="action link"
                              onClick={() => {
                                setEditId(tag)
                                setEditValue(tag)
                              }}
                              title="Edit tag"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="action link"
                              onClick={() => handleDelete(tag)}
                              title="Delete tag"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {PROTECTED_TAGS.includes(tag) && (
                          <>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic' }}>Auto-managed</span>
                            <button
                              type="button"
                              className="action link"
                              onClick={() => setInfoPopupTag(tag)}
                              title="More info"
                              style={{ padding: '0 0.25rem', fontSize: '1rem' }}
                            >
                              ℹ️
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--sidebar-border)' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted)', fontSize: '0.88rem' }}>
              Create new tag
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="todo-edit-input"
                placeholder="Tag name"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="action ghost"
                onClick={handleCreate}
                disabled={!newTagInput.trim()}
              >
                Create & Add
              </button>
            </div>
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--sidebar-border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="action link"
              style={{ marginRight: '0.35rem' }}
              onClick={() => {
                // Keep protected tags when clearing
                const protectedSelectedTags = selectedTags.filter(tag => PROTECTED_TAGS.includes(tag))
                if (protectedSelectedTags.length > 0) {
                  onChangeSelected?.(protectedSelectedTags)
                } else {
                  onClearSelected?.()
                }
              }}
            >
              Clear tags
            </button>
            <button
              type="button"
              className="action ghost"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="action primary"
              onClick={onDone}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {infoPopupTag && (
        <>
          <div
            className="sidebar-overlay"
            onClick={() => setInfoPopupTag(null)}
            style={{ 
              zIndex: 1300,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--sidebar-bg)',
              border: '1px solid var(--sidebar-border)',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '400px',
              zIndex: 1301,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>
              "{infoPopupTag}" Tag
            </h3>
            <p style={{ margin: '0 0 1rem 0', lineHeight: '1.6', color: 'var(--color-text)' }}>
              This tag is automatically managed by the system and cannot be manually added or removed.
            </p>
            <p style={{ margin: '0 0 1.5rem 0', lineHeight: '1.6', color: 'var(--muted)' }}>
              The "Goal" tag is automatically added to tasks that are generated from your goals to help you track goal-related work.
            </p>
            <button
              ref={infoGotItRef}
              type="button"
              className="action primary"
              onClick={() => setInfoPopupTag(null)}
              style={{ width: '100%' }}
            >
              Got it
            </button>
          </div>
        </>
      )}
    </>
  )
}
