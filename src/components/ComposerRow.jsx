export default function ComposerRow({
  fields = [],
  onSubmit,
  onClear,
  submitLabel = 'Add',
  clearLabel = 'Clear',
  addButtonAria = 'Add item',
  submitDisabled = false,
  actions,
  children,
  className = '',
  mainClassName = '',
  mainStyle,
  addButtonContent = '+',
  tagsSection,
}) {
  return (
    <div className={`list__item todo-row todo-row--compose ${className}`.trim()}>
      <button
        className="todo-checkbox todo-checkbox--add"
        type="button"
        aria-label={addButtonAria}
        onClick={onSubmit}
      >
        {addButtonContent}
      </button>

      <div className={`todo-main ${mainClassName}`.trim()} style={mainStyle}>
        {fields.map(({ key, label, node, as: FieldTag = 'label', style, hideLabel = false }) => {
          const Tag = FieldTag
          return (
            <Tag key={key} className="todo-field" style={style}>
              {!hideLabel && label ? <span>{label}</span> : null}
              {node}
            </Tag>
          )
        })}

        {tagsSection ? (() => {
          const {
            label = 'Tags',
            tags = [],
            onManage = () => {},
            manageButtonRef,
            emptyLabel = 'No tags',
            renderTag,
            hideLabel = false,
            style,
          } = tagsSection

          return (
            <div className="todo-field" style={style}>
              {!hideLabel && label ? <span>{label}</span> : null}
              <div className="tag-picker">
                <div className="tag-options">
                  {tags.length === 0 ? (
                    <span
                      className="pill pill--empty"
                      style={{ cursor: 'pointer' }}
                      onClick={onManage}
                    >
                      {emptyLabel}
                    </span>
                  ) : (
                    tags.map((tag) => (
                      renderTag ? (
                        <span key={tag}>{renderTag(tag, onManage)}</span>
                      ) : (
                        <span
                          key={tag}
                          className="pill pill--tag"
                          style={{ cursor: 'pointer' }}
                          onClick={onManage}
                        >
                          {tag}
                        </span>
                      )
                    ))
                  )}
                  <button
                    type="button"
                    className="pill pill--tag pill--add-tag"
                    title="Manage tags"
                    onClick={onManage}
                    ref={manageButtonRef}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )
        })() : null}
        {children}
      </div>

      <div className="todo-actions">
        {actions || (
          <>
            <button className="action link" type="button" onClick={onClear}>{clearLabel}</button>
            <button className="action primary" type="button" onClick={onSubmit} disabled={submitDisabled}>{submitLabel}</button>
          </>
        )}
      </div>
    </div>
  )
}
