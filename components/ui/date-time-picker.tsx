'use client'

import { useState } from 'react'
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
  minValue?: string     // "YYYY-MM-DDTHH:MM" — disables dates/times before this
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

export function DateTimePicker({ value, onChange, placeholder = 'Selecionar data', className, minValue }: DateTimePickerProps) {
  const [open, setOpen] = useState(false)

  const date = value ? parse(value.slice(0, 10), 'yyyy-MM-dd', new Date()) : undefined
  const time = value ? value.slice(11, 16) : '00:00'
  const [hh, mm] = time.split(':')
  const validDate = date && isValid(date) ? date : undefined

  const minDate = minValue ? parse(minValue.slice(0, 10), 'yyyy-MM-dd', new Date()) : undefined
  const minTime = minValue ? minValue.slice(11, 16) : undefined
  const isSameDay = minDate && validDate && format(validDate, 'yyyy-MM-dd') === format(minDate, 'yyyy-MM-dd')
  const minHH = isSameDay && minTime ? minTime.slice(0, 2) : '00'
  const minMM = isSameDay && minTime && hh === minHH ? minTime.slice(3, 5) : '00'

  function handleDaySelect(day: Date | undefined) {
    if (!day) return
    const dateStr = format(day, 'yyyy-MM-dd')
    onChange(`${dateStr}T${time}`)
  }

  function handleHour(h: string) {
    const dateStr = validDate ? format(validDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    // if hour is now == minHH and current minute is too early, clamp it
    const clampedMM = isSameDay && minTime && h === minHH && mm < minMM ? minMM : mm
    onChange(`${dateStr}T${h}:${clampedMM}`)
  }

  function handleMinute(m: string) {
    const dateStr = validDate ? format(validDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    onChange(`${dateStr}T${hh}:${m}`)
  }

  const displayValue = validDate
    ? `${format(validDate, "d MMM yyyy", { locale: pt })}  ${time}`
    : ''

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-left text-slate-800',
          !displayValue && 'text-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-slate-300',
          className
        )}
      >
        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1 truncate">{displayValue || placeholder}</span>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start">
          <Popover.Popup className="z-50 rounded-xl border border-slate-200 bg-white shadow-xl p-3 outline-none">
            <DayPicker
              mode="single"
              selected={validDate}
              onSelect={handleDaySelect}
              locale={pt}
              weekStartsOn={1}
              showOutsideDays
              disabled={minDate ? { before: minDate } : undefined}
              classNames={{
                root: 'rdp-custom',
                months: 'flex flex-col',
                month: 'space-y-3',
                month_caption: 'flex items-center justify-between px-1 mb-1',
                caption_label: 'text-sm font-semibold text-slate-800 capitalize',
                nav: 'flex items-center gap-1',
                button_previous: 'flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors',
                button_next: 'flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors',
                weeks: 'space-y-1',
                weekdays: 'flex',
                weekday: 'w-8 text-center text-xs text-slate-400 font-normal',
                week: 'flex',
                day: 'w-8 h-8 text-center',
                day_button: cn(
                  'w-8 h-8 rounded-md text-sm text-slate-700 hover:bg-slate-100 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-slate-300'
                ),
                selected: '[&>button]:bg-slate-900 [&>button]:text-white [&>button]:hover:bg-slate-800',
                today: '[&>button]:text-violet-600 [&>button]:font-semibold',
                outside: '[&>button]:text-slate-300',
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
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-2 px-1">Hora</p>
              <div className="flex items-center justify-center gap-1">
                {/* Hours */}
                <div className="w-14 overflow-y-auto max-h-40 rounded-lg border border-slate-200 scroll-smooth">
                  {HOURS.map(h => {
                    const disabled = isSameDay && h < minHH
                    const selected = h === hh
                    return (
                      <button
                        key={h}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleHour(h)}
                        className={cn(
                          'w-full text-center text-sm py-1.5 transition-colors',
                          selected
                            ? 'bg-slate-900 text-white font-semibold'
                            : disabled
                              ? 'text-slate-200 cursor-not-allowed'
                              : 'text-slate-700 hover:bg-slate-100',
                        )}
                      >
                        {h}
                      </button>
                    )
                  })}
                </div>

                <span className="text-slate-400 font-semibold text-sm select-none">:</span>

                {/* Minutes */}
                <div className="w-14 overflow-y-auto max-h-40 rounded-lg border border-slate-200 scroll-smooth">
                  {MINUTES.map(m => {
                    const disabled = isSameDay && hh === minHH && m < minMM
                    const selected = m === mm
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleMinute(m)}
                        className={cn(
                          'w-full text-center text-sm py-1.5 transition-colors',
                          selected
                            ? 'bg-slate-900 text-white font-semibold'
                            : disabled
                              ? 'text-slate-200 cursor-not-allowed'
                              : 'text-slate-700 hover:bg-slate-100',
                        )}
                      >
                        {m}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 w-full text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg py-2 transition-colors"
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
