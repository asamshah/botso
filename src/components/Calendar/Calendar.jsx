import { useState, useEffect, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  getISOWeek,
  setMonth
} from 'date-fns'
import { supabase } from '../../lib/supabase'
import EntryInput from '../EntryInput/EntryInput'
import './Calendar.css'

function Calendar({ selectedDate, onDateSelect, refreshKey, onEntryAdded, onEntryDateChange }) {
  const [activityData, setActivityData] = useState({})
  const [dragOverDate, setDragOverDate] = useState(null)
  const currentYear = new Date().getFullYear()

  // Generate calendar data for all 12 months
  const allMonths = useMemo(() => {
    const months = []

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthDate = setMonth(new Date(currentYear, 0, 1), monthIndex)
      const monthStart = startOfMonth(monthDate)
      const monthEnd = endOfMonth(monthDate)
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

      const weeks = []
      let day = startDate

      while (day <= endDate) {
        const week = {
          weekNum: getISOWeek(day),
          days: []
        }
        for (let i = 0; i < 7; i++) {
          week.days.push(new Date(day))
          day = addDays(day, 1)
        }
        weeks.push(week)
      }

      months.push({
        date: monthDate,
        name: format(monthDate, 'MMMM'),
        weeks
      })
    }

    return months
  }, [currentYear])

  // Fetch activity data for the year
  useEffect(() => {
    fetchActivityData()
  }, [currentYear, refreshKey])

  async function fetchActivityData() {
    const startDate = `${currentYear}-01-01`
    const endDate = `${currentYear}-12-31`

    const { data, error } = await supabase
      .from('entries')
      .select('date')
      .gte('date', startDate)
      .lte('date', endDate)

    if (data && !error) {
      const counts = {}
      data.forEach(entry => {
        counts[entry.date] = (counts[entry.date] || 0) + 1
      })
      setActivityData(counts)
    }
  }

  function getActivityLevel(date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    const count = activityData[dateStr] || 0
    if (count === 0) return 0
    if (count <= 2) return 1
    if (count <= 4) return 2
    if (count <= 6) return 3
    return 4
  }

  const handleDragOver = (e, day) => {
    e.preventDefault()
    const dateStr = format(day, 'yyyy-MM-dd')
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOverDate(null)
  }

  const handleDrop = async (e, day) => {
    e.preventDefault()
    setDragOverDate(null)

    const entryId = e.dataTransfer.getData('entryId')
    if (entryId && onEntryDateChange) {
      const newDate = format(day, 'yyyy-MM-dd')
      await onEntryDateChange(entryId, newDate)
    }
  }

  return (
    <main className="calendar">
      <div className="calendar-compose">
        <EntryInput
          selectedDate={selectedDate}
          onEntryAdded={onEntryAdded}
        />
      </div>

      
      <div className="months-container">
        {allMonths.map((month, monthIndex) => (
          <section key={monthIndex} className="month-section">
            <div className="month-header-row">
              <h2 className="month-name">{month.name}</h2>
              <span className="month-year">{currentYear}</span>
            </div>

            <div className="calendar-grid">
              <div className="weekday-row">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>

              {month.weeks.map((week, weekIndex) => {
                // Skip weeks where no days are in current month
                const hasCurrentMonthDay = week.days.some(d => isSameMonth(d, month.date))
                if (!hasCurrentMonthDay) return null

                return (
                  <div key={weekIndex} className="week-row">
                    {week.days.map((day, dayIndex) => {
                      const isCurrentMonth = isSameMonth(day, month.date)
                      const isSelected = isSameDay(day, selectedDate)
                      const isTodayDate = isToday(day)
                      const activityLevel = getActivityLevel(day)

                      // Don't render days from other months
                      if (!isCurrentMonth) {
                        return <div key={dayIndex} className="day-cell empty"></div>
                      }

                      const dateStr = format(day, 'yyyy-MM-dd')
                      const isDragOver = dragOverDate === dateStr

                      return (
                        <button
                          key={dayIndex}
                          className={`day-cell ${isSelected ? 'selected' : ''} ${isTodayDate ? 'today' : ''} ${isDragOver ? 'drag-over' : ''}`}
                          data-activity={activityLevel}
                          onClick={() => onDateSelect(day)}
                          onDragOver={(e) => handleDragOver(e, day)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day)}
                          title={format(day, 'EEEE, MMMM d, yyyy')}
                        >
                          {format(day, 'd')}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}

export default Calendar
