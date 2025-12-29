const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const WEEKENDS = ['Sat', 'Sun']

const noop = () => {}

export default function DayStrip({
  selectedDays = [],
  onToggleDay = noop,
  onSelectWeekdays = noop,
  onSelectWeekends = noop,
  onClear = noop,
}) {
  const selectedSet = new Set(selectedDays)
  const allWeekdaysSelected = WEEKDAYS.every((day) => selectedSet.has(day))
  const allWeekendsSelected = WEEKENDS.every((day) => selectedSet.has(day))

  return (
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
        >
          Weekdays
        </button>

        <button
          type="button"
          className={`pill pill--tag ${allWeekendsSelected ? 'is-selected' : ''}`}
          onClick={onSelectWeekends}
          title="Select weekends (Sat-Sun)"
        >
          Weekends
        </button>

        <button
          type="button"
          className="pill pill--utility"
          onClick={onClear}
          title="Clear all days"
          disabled={selectedDays.length === 0}
        >
          Clear
        </button>
      </div>
    </div>
  )
}
