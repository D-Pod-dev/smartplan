import '../App.css'

export default function Settings() {
  return (
    <>
      <header className="page__header">
        <p className="eyebrow">Preferences</p>
        <h1>Settings</h1>
        <p className="lede">Customize SmartPlan to match your workflow.</p>
      </header>

      <section className="panels">
        <div className="panel">
          <div className="panel__title">General</div>
          <p className="panel__copy">Theme, notifications, and default durations.</p>
        </div>
        <div className="panel">
          <div className="panel__title">Integrations</div>
          <p className="panel__copy">Connect calendar, tasks, and communication tools.</p>
        </div>
      </section>
    </>
  )
}
