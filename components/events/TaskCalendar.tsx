'use client'

import { useMemo } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { pt } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import type { EventTask, ChecklistItemStatus } from '@/types/app'

const locales = { pt }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

const STATUS_BG: Record<ChecklistItemStatus, string> = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  skipped: '#94a3b8',
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: EventTask
}

interface TaskCalendarProps {
  tasks: EventTask[]
  onSelectTask: (taskId: string) => void
}

export default function TaskCalendar({ tasks, onSelectTask }: TaskCalendarProps) {
  const events: CalendarEvent[] = useMemo(() =>
    tasks
      .filter(t => !!t.due_at)
      .map(t => ({
        id: t.id,
        title: t.title,
        start: new Date(t.due_at!),
        end: new Date(t.due_at!),
        resource: t,
      })),
    [tasks]
  )

  function eventStyleGetter(event: object) {
    const e = event as CalendarEvent
    const bg = STATUS_BG[e.resource.status] ?? '#94a3b8'
    return {
      style: {
        backgroundColor: bg,
        borderColor: bg,
        color: '#fff',
        borderRadius: '4px',
        fontSize: '11px',
        padding: '1px 4px',
      },
    }
  }

  return (
    <div className="h-[600px]">
      <style>{`
        .rbc-calendar { font-family: inherit; }
        .rbc-header { font-size: 12px; font-weight: 600; color: #64748b; padding: 6px 0; }
        .rbc-today { background-color: #eef2ff; }
        .rbc-off-range-bg { background-color: #f8fafc; }
        .rbc-event { border: none !important; }
        .rbc-event:focus { outline: 2px solid #6366f1; }
        .rbc-toolbar button { font-size: 13px; color: #475569; border-color: #e2e8f0; border-radius: 6px; }
        .rbc-toolbar button.rbc-active { background-color: #0f172a; color: #fff; border-color: #0f172a; }
        .rbc-toolbar button:hover { background-color: #f1f5f9; color: #0f172a; }
        .rbc-toolbar-label { font-size: 15px; font-weight: 600; color: #1e293b; }
      `}</style>
      <Calendar
        localizer={localizer}
        events={events}
        defaultView={Views.MONTH}
        views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
        startAccessor={(e: CalendarEvent) => e.start}
        endAccessor={(e: CalendarEvent) => e.end}
        style={{ height: '100%' }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={(event: object) => onSelectTask((event as CalendarEvent).id)}
        messages={{
          month: 'Mês',
          week: 'Semana',
          agenda: 'Agenda',
          today: 'Hoje',
          previous: '‹',
          next: '›',
          noEventsInRange: 'Sem tarefas neste período.',
          date: 'Data',
          time: 'Hora',
          event: 'Tarefa',
        }}
        culture="pt"
      />
    </div>
  )
}
