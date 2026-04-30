'use client'

import { useState, useRef } from 'react'
import { Popover } from '@base-ui/react/popover'
import { DayPicker } from 'react-day-picker'
import { format, parse, isValid } from 'date-fns'
import { pt } from 'date-fns/locale'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import 'react-day-picker/style.css'

interface DateTimePickerProps {
  value?: string        // "YYYY-MM-DDTHH:MM"
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

export function DateTimePicker({ value, onChange, placeholder = 'Selecionar data', className }: DateTimePickerProps) {
  const [open, setOpen] = useState(false)

  const date = value ? parse(value.slice(0, 10), 'yyyy-MM-dd', new Date()) : undefined
  const time = value ? value.slice(11, 16) : '00:00'
  const validDate = date && isValid(date) ? date : undefined

  function handleDaySelect(day: Date | undefined) {
    if (!day) return
    const dateStr = format(day, 'yyyy-MM-dd')
    onChange(`${dateStr}T${time}`)
    // keep open to allow time selection
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const dateStr = validDate ? format(validDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    onChange(`${dateStr}T${e.target.value}`)
  }

  const displayValue = validDate
    ? `${format(validDate, "d MMM yyyy", { locale: pt })}  ${time}`
    : ''

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-left',
          !displayValue && 'text-zinc-500',
          'focus:outline-none focus:ring-2 focus:ring-zinc-600',
          className
        )}
      >
        <CalendarIcon className="w-4 h-4 text-zinc-500 shrink-0" />
        <span className="flex-1 truncate">{displayValue || placeholder}</span>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start">
          <Popover.Popup className="z-50 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl p-3 outline-none">
            <DayPicker
              mode="single"
              selected={validDate}
              onSelect={handleDaySelect}
              locale={pt}
              weekStartsOn={1}
              showOutsideDays
              classNames={{
                root: 'rdp-custom',
                months: 'flex flex-col',
                month: 'space-y-3',
                month_caption: 'flex items-center justify-between px-1 mb-1',
                caption_label: 'text-sm font-semibold text-white capitalize',
                nav: 'flex items-center gap-1',
                button_previous: 'flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors',
                button_next: 'flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors',
                weeks: 'space-y-1',
                weekdays: 'flex',
                weekday: 'w-8 text-center text-xs text-zinc-500 font-normal',
                week: 'flex',
                day: 'w-8 h-8 text-center',
                day_button: cn(
                  'w-8 h-8 rounded-md text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-zinc-500'
                ),
                selected: '[&>button]:bg-white [&>button]:text-zinc-900 [&>button]:hover:bg-zinc-100',
                today: '[&>button]:text-violet-400 [&>button]:font-semibold',
                outside: '[&>button]:text-zinc-600',
                disabled: '[&>button]:opacity-30 [&>button]:cursor-not-allowed',
              }}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === 'left'
                    ? <ChevronLeft className="w-4 h-4" />
                    : <ChevronRight className="w-4 h-4" />,
              }}
            />

            {/* Time picker */}
            <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-3 px-1">
              <span className="text-xs text-zinc-400 shrink-0">Hora</span>
              <input
                type="time"
                value={time}
                onChange={handleTimeChange}
                className="flex-1 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-600"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-white bg-zinc-700 hover:bg-zinc-600 rounded-md px-3 py-1.5 transition-colors"
              >
                OK
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
