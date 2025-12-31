const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const WEEKENDS = ['Sat', 'Sun']

const noop = () => {}

export default function RecurrenceSelector({
  recurrenceType = 'None',
  recurrenceInterval = '',
  recurrenceUnit = 'day',
  selectedDays = [],
  onChangeType = noop,
  onChangeInterval = noop,
  onChangeUnit = noop,
  onToggleDay = noop,
  onSelectWeekdays = noop,
  onSelectWeekends = noop,
  onClearDays = noop,
  disabled = false,
}) {
  const selectedSet = new Set(selectedDays)
  const allWeekdaysSelected = WEEKDAYS.every((day) => selectedSet.has(day))
  const allWeekendsSelected = WEEKENDS.every((day) => selectedSet.has(day))
  const showDayStrip = recurrenceType === 'Weekly' || (recurrenceType === 'Custom' && recurrenceUnit === 'week')

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: '0 1 auto' }}>
      <label className="todo-field">
        <span>Recurrence</span>
        <select
          className="todo-edit-input"
          value={recurrenceType}
          onChange={(e) => onChangeType(e.target.value)}
          disabled={disabled}
          style={disabled ? { cursor: 'not-allowed' } : {}}
        >
          <option value="None">None</option>
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
          <option value="Custom">Custom</option>
        </select>
      </label>

      {recurrenceType === 'Custom' && (
        <>
          <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '100px' }}>
            <span>Every</span>
            <input
              className="todo-edit-input"
              type="number"
              min="1"
              value={recurrenceInterval}
              onChange={(e) => onChangeInterval(e.target.value)}
              disabled={disabled}
              style={disabled ? { cursor: 'not-allowed' } : {}}
            />
          </label>
          <label className="todo-field">
            <span>Unit</span>
            <select
              className="todo-edit-input"
              value={recurrenceUnit}
              onChange={(e) => onChangeUnit(e.target.value)}
              disabled={disabled}
              style={disabled ? { cursor: 'not-allowed' } : {}}
            >
              <option value="day">days</option>
              <option value="week">weeks</option>
              <option value="month">months</option>
            </select>
          </label>
        </>
      )}

      {showDayStrip && (
        <div className="todo-field">
          <span>Days</span>
          <div className="tag-picker">
            <div className="tag-options day-strip">
              {DAYS.map((day) => {
                const isSelected = selectedSet.has(day)
                return (
                  <button
                    key={day}
                    type="button"
                    className={`pill pill--tag ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => onToggleDay(day)}
                    disabled={disabled}
                    style={disabled ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
                  >
                    {day}
                  </button>
                )
              })}

              <button
                type="button"
                className={`pill pill--tag ${allWeekdaysSelected ? 'is-selected' : ''}`}
                onClick={onSelectWeekdays}
                title="Select weekdays (Mon-Fri)"
                disabled={disabled}
                style={disabled ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
              >
                Weekdays
              </button>

              <button
                type="button"
                className={`pill pill--tag ${allWeekendsSelected ? 'is-selected' : ''}`}
                onClick={onSelectWeekends}
                title="Select weekends (Sat-Sun)"
                disabled={disabled}
                style={disabled ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
              >
                Weekends
              </button>

              <button
                type="button"
                className="pill pill--utility"
                onClick={onClearDays}
                title="Clear all days"
                disabled={disabled || selectedDays.length === 0}
                style={(disabled || selectedDays.length === 0) ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
