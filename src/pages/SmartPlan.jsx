import '../App.css'

const chatThread = [
  {
    id: 1,
    author: 'You',
    role: 'user',
    message: 'Plan my day around a 10am standup and 2pm focus block. Keep deep work in the morning.',
    time: '08:12',
  },
  {
    id: 2,
    author: 'SmartPlan',
    role: 'ai',
    message:
      'I front-loaded deep work from 8:30–10:00, slotted standup at 10:00, left a 90-minute focus block at 2:00, and stacked shallow tasks after 3:30.',
    time: '08:12',
  },
  {
    id: 3,
    author: 'SmartPlan',
    role: 'ai',
    message: 'Want me to auto-prioritize inbox and assign owners for the hiring tasks?',
    time: '08:13',
  },
]

export default function SmartPlan() {
  return (
    <>
      <header className="page__header">
        <p className="eyebrow">Assistant</p>
        <h1>SmartPlan chat</h1>
        <p className="lede">Describe what you need—SmartPlan plans, schedules, and assigns.</p>
      </header>

      <section className="panels panels--grid">
        <div className="panel panel--chat">
          <div className="panel__title">Conversation</div>
          <div className="chat-thread">
            {chatThread.map((item) => (
              <div key={item.id} className={`chat-bubble chat-bubble--${item.role}`}>
                <div className="chat-bubble__meta">
                  <span className="chat-bubble__author">{item.author}</span>
                  <span className="chat-bubble__time">{item.time}</span>
                </div>
                <p className="chat-bubble__text">{item.message}</p>
              </div>
            ))}
          </div>
          <div className="chat__composer">
            <input className="chat__input" type="text" placeholder="Tell SmartPlan what to handle" />
            <button className="chat__submit" type="button">Send</button>
          </div>
          <div className="chips">
            <button className="chip" type="button">Auto-plan today</button>
            <button className="chip" type="button">Delegate to team</button>
            <button className="chip" type="button">Summarize tasks</button>
          </div>
        </div>
      </section>
    </>
  )
}
