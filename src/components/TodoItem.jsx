export default function TodoItem({
  item,
  isEditing,
  onToggleCompletion,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  renderDisplay,
  renderEditFields,
  id,
}) {
  return (
    <li className="list__item" id={id}>
      <div className={`todo-row ${isEditing ? 'is-editing' : ''}`}>
        <input
          type="checkbox"
          className="todo-checkbox"
          aria-label={`Mark ${item.title} as ${item.completed ? 'incomplete' : 'complete'}`}
          checked={item.completed}
          onChange={() => onToggleCompletion(item.id)}
          disabled={Boolean(isEditing)}
        />

        <div className="todo-main">
          {isEditing ? renderEditFields() : renderDisplay()}
        </div>

        <div className={`todo-actions ${isEditing ? 'is-editing' : ''}`}>
          {isEditing ? (
            <>
              <button className="action link" type="button" onClick={onCancelEdit}>
                Cancel
              </button>
              <button className="action primary" type="button" onClick={() => onSaveEdit(item.id)}>
                Save
              </button>
            </>
          ) : (
            <>
              <button className="action link" type="button" onClick={() => onEdit(item)}>
                Edit
              </button>
              <button 
                className="action ghost" 
                type="button" 
                onClick={() => onDelete(item.id)}
                disabled={Boolean(item.goalId)}
                style={item.goalId ? { 
                  opacity: 0.4, 
                  cursor: 'not-allowed'
                } : {}}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  )
}
