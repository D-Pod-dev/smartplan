const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT ?? import.meta.env.REACT_APP_AZURE_OPENAI_ENDPOINT
const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY ?? import.meta.env.REACT_APP_AZURE_OPENAI_API_KEY
const deployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME ?? import.meta.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME
const apiVersion = '2024-10-21'

// Core instruction for how the assistant should respond and emit machine-readable actions
export const systemPrompt = `You are SmartPlan, a focused scheduling copilot. Be concise, avoid over-explaining.

You receive:\n- User chat messages\n- Current todo JSON snapshot\n- You return natural language guidance AND a machine-readable actions block.

Action format (always include, even if empty):
<smartplan_actions>{
	"actions": [
		{"type":"create","task":{ "title":"string", "due":{ "date":"YYYY-MM-DD","time":"HH:MM"}, "priority":"High|Medium|Low|None", "tags":["..."], "completed":false, "timeAllocated":number|null, "objective":string|null, "goalId":string|null, "recurrence":{ "type":"None|Daily|Weekly|Custom", "interval":number|null, "unit":"day|week|month", "daysOfWeek":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] }, "inToday":boolean }} ,
		{"type":"update","id":123,"fields":{ "title":"...only when changing", "due":{ "date":"YYYY-MM-DD","time":"HH:MM"}, "priority":"High|Medium|Low|None", "tags":["..."], "completed":boolean, "completedDate":"YYYY-MM-DD", "timeAllocated":number|null, "objective":string|null, "goalId":string|null, "recurrence":{...}, "inToday":boolean }},
		{"type":"complete","id":123,"completed":true,"completedDate":"YYYY-MM-DD"},
		{"type":"delete","id":123}
	]
}</smartplan_actions>

Rules:\n- Never invent task IDs; only use provided IDs for updates/deletes.\n- For new tasks, include full task object; omit impossible fields.\n- If no changes are needed, return actions: [] but still wrap in the tags.\n- Keep the natural language reply separate from the actions block.\n- Preserve user intent, respect provided dates/times, avoid over-scheduling.\n- IMPORTANT: Leave due.time as null unless the user explicitly mentions a specific time. If no time is given, set time to null.\n- IMPORTANT: If timeAllocated is not provided by the user, estimate how long the task will reasonably take in minutes based on the task description and complexity.
`

const buildUrl = () => {
	if (!endpoint || !deployment) return ''
	const normalized = endpoint.replace(/\/+$/, '')
	return `${normalized}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
}

export const sanitizeTodos = (todos = []) =>
	todos.map((t) => ({
		id: t.id,
		title: t.title,
		due: {
			date: t?.due?.date || '',
			time: t?.due?.time || '',
		},
		priority: t.priority || 'None',
		tags: Array.isArray(t.tags) ? t.tags.filter(Boolean) : [],
		completed: Boolean(t.completed),
		completedDate: t?.completedDate || null,
		timeAllocated: Number.isFinite(t?.timeAllocated) ? t.timeAllocated : null,
		objective: t?.objective ?? t?.target ?? null,
		goalId: t?.goalId ?? null,
		recurrence: normalizeRecurrence(t?.recurrence),
		inToday: Boolean(t?.inToday),
	}))

export const normalizeRecurrence = (recurrence) => {
	const fallback = { type: 'None', interval: null, unit: 'day', daysOfWeek: [] }
	if (!recurrence) return fallback
	const type = recurrence.type || 'None'
	const unit = recurrence.unit || 'day'
	const intervalRaw = recurrence.interval
	const parsedInterval = intervalRaw === null || intervalRaw === undefined || intervalRaw === '' ? null : Number(intervalRaw)
	const interval = Number.isFinite(parsedInterval) ? parsedInterval : null
	const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
	const days = Array.isArray(recurrence.daysOfWeek) ? recurrence.daysOfWeek.filter(Boolean) : []
	const uniqueDays = Array.from(new Set(days)).filter((d) => weekdayOrder.includes(d))
	const sortedDays = uniqueDays.sort((a, b) => weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b))
	const keepDays = type === 'Weekly' || (type === 'Custom' && unit === 'week')

	return {
		type,
		interval: type === 'Custom' ? interval : null,
		unit,
		daysOfWeek: keepDays ? sortedDays : [],
	}
}

export const normalizeTodo = (todo = {}) => {
	const dueDate = todo?.due?.date || ''
	const dueTime = todo?.due?.time || ''
	const rawTime = todo?.timeAllocated
	const timeAllocated = rawTime === null || rawTime === undefined || rawTime === '' ? null : Number(rawTime)
	const tags = Array.isArray(todo.tags) ? todo.tags.filter(Boolean) : []
	const objective = todo?.objective ?? todo?.target ?? null
	const recurrence = normalizeRecurrence(todo.recurrence)

	return {
		id: todo.id ?? Date.now(),
		title: todo.title || 'Untitled task',
		due: { date: dueDate, time: dueTime },
		priority: todo.priority || 'None',
		tags,
		completed: Boolean(todo.completed),
		completedDate: todo?.completedDate || null,
		timeAllocated: Number.isFinite(timeAllocated) ? timeAllocated : null,
		objective,
		goalId: todo?.goalId ?? null,
		recurrence,
		inToday: 'inToday' in todo ? Boolean(todo.inToday) : true,
	}
}

const applyFields = (todo, fields = {}) => {
	const next = { ...todo }
	if ('title' in fields) next.title = fields.title || 'Untitled task'
	if ('due' in fields) next.due = { date: fields?.due?.date || '', time: fields?.due?.time || '' }
	if ('priority' in fields) next.priority = fields.priority || 'None'
	if ('tags' in fields) next.tags = Array.isArray(fields.tags) ? fields.tags.filter(Boolean) : []
	if ('completed' in fields) next.completed = Boolean(fields.completed)
	if ('completedDate' in fields) next.completedDate = fields.completedDate || null
	if ('timeAllocated' in fields) {
		const val = fields.timeAllocated
		const parsed = val === null || val === undefined || val === '' ? null : Number(val)
		next.timeAllocated = Number.isFinite(parsed) ? parsed : null
	}
	if ('objective' in fields) next.objective = fields.objective ?? null
	if ('goalId' in fields) next.goalId = fields.goalId ?? null
	if ('recurrence' in fields) next.recurrence = normalizeRecurrence(fields.recurrence)
	if ('inToday' in fields) next.inToday = Boolean(fields.inToday)
	return next
}

const extractActions = (content = '') => {
	const match = content.match(/<smartplan_actions>([\s\S]*?)<\/smartplan_actions>/i)
	if (!match) return []
	try {
		const parsed = JSON.parse(match[1])
		if (Array.isArray(parsed?.actions)) return parsed.actions
	} catch (err) {
		console.warn('SmartPlan: unable to parse actions JSON', err)
	}
	return []
}

export async function sendChatMessage(messages = [], todos = []) {
	if (!apiKey || !endpoint || !deployment) {
		throw new Error('Azure OpenAI client is not configured. Check your environment variables.')
	}

	const snapshot = sanitizeTodos(todos)
	const payloadMessages = [
		{ role: 'system', content: systemPrompt },
		{
			role: 'system',
			content: `Current todos JSON (read-only):\n${JSON.stringify(snapshot, null, 2)}`,
		},
		...messages,
	]

	const url = buildUrl()
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'api-key': apiKey,
		},
		body: JSON.stringify({
			messages: payloadMessages,
			model: deployment,
			temperature: 0.2,
			max_tokens: 700,
		}),
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Azure OpenAI error ${response.status}: ${text || response.statusText}`)
	}

	const data = await response.json()
	const aiMessage = data?.choices?.[0]?.message?.content?.trim() || ''
	const actions = extractActions(aiMessage)
	return { content: aiMessage, actions }
}

export function applyModifications(todos = [], actions = []) {
	let next = [...todos]

	actions.forEach((action) => {
		if (!action || !action.type) return
		const type = String(action.type).toLowerCase()

		if (type === 'create' && action.task) {
			next = [...next, normalizeTodo(action.task)]
			return
		}

		if (type === 'delete' && action.id !== undefined && action.id !== null) {
			next = next.filter((t) => t.id !== action.id)
			return
		}

		if ((type === 'update' || type === 'complete') && action.id !== undefined && action.id !== null) {
			next = next.map((t) => {
				if (t.id !== action.id) return t
				if (type === 'complete') {
					const completedFlag = 'completed' in action ? Boolean(action.completed) : true
					const completedDate = action.completedDate || (completedFlag ? new Date().toISOString().slice(0, 10) : null)
					return applyFields(t, { completed: completedFlag, completedDate })
				}
				return applyFields(t, action.fields)
			})
			return
		}
	})

	return next
}

export default {
	sendChatMessage,
	applyModifications,
	systemPrompt,
	sanitizeTodos,
	normalizeRecurrence,
	normalizeTodo,
}
