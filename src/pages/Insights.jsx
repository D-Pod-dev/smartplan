import '../App.css'

const insights = [
  { title: 'Flow score', value: '82', caption: 'Stable week · +6 vs. last week' },
  { title: 'Time saved', value: '2.4h', caption: 'SmartPlan assisted 14 tasks' },
  { title: 'Focus ratio', value: '64%', caption: 'Deep work vs. meetings today' },
]

export default function Insights() {
  return (
    <>
      <header className="page__header">
        <p className="eyebrow">Metrics</p>
        <h1>Insights</h1>
        <p className="lede">Measure flow, time saved, and where SmartPlan helps most.</p>
      </header>

      <section className="panels">
        <div className="panel">
          <div className="panel__title">Today&apos;s insights</div>
          <div className="insights">
            {insights.map((item) => (
              <div key={item.title} className="insight">
                <div className="insight__label">{item.title}</div>
                <div className="insight__value">{item.value}</div>
                <div className="insight__meta">{item.caption}</div>
              </div>
            ))}
          </div>
          <p className="panel__copy">SmartPlan tracks where assists save time and nudges you when it can take over the next task.</p>
        </div>
      </section>
    </>
  )
}
