# SmartPlan — AI-powered Task Management

SmartPlan is a productivity app that combines task management with AI-powered assistance. It helps you plan your day, focus on what matters most, and track your progress through intelligent insights.

## Features

- **Today Dashboard**: View your daily tasks, status cards, and focus queue
- **Smart Planning**: AI-assisted chat that helps you prioritize, schedule, and organize tasks
- **Focus Mode**: Pomodoro-style focus sessions with customizable work/break intervals
- **Task Management**: Create, organize, and track tasks with tags, priorities, goals, and recurrence
- **Goals Tracking**: Set and monitor goals, link tasks to specific objectives
- **Insights**: Track metrics like focus time, productivity flow, and AI-assisted tasks
- **Recurring Tasks**: Support for daily, weekly, and custom recurrence patterns
- **Cloud Sync**: Supabase integration for seamless data persistence across devices

## Pages

- **Today**: Daily task overview with priority focus list
- **Tasks**: Full task library with filtering and management
- **Focus**: Pomodoro-style timer with queue management
- **SmartPlan**: AI chat assistant for planning and task optimization
- **Goals**: Create and track long-term objectives
- **Insights**: Productivity metrics and analytics
- **Settings**: App preferences and Supabase configuration

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open the app and navigate via the sidebar. The app runs on `http://localhost:5173` by default.

### Build

```bash
npm run build
npm run preview
```

## Tech Stack

- **Frontend**: React 19 + Vite
- **Routing**: React Router DOM
- **Backend**: Supabase (PostgreSQL + auth)
- **Styling**: Custom CSS
- **AI Integration**: Groq API (via utility functions)
- **Markdown**: React Markdown with GFM support

## Setup

Refer to [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) for Supabase database configuration.

Refer to [SUPABASE_INTEGRATION.md](SUPABASE_INTEGRATION.md) for authentication and API setup.

## Project Structure

```
src/
├── components/        # Reusable UI components
├── pages/            # Route pages
├── contexts/         # React context providers
├── hooks/            # Custom hooks (Supabase integration)
├── utils/            # Utilities (date, AI, sync, storage)
└── App.jsx           # Main app shell
```
