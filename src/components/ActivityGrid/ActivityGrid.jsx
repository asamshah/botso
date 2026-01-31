import { useState, useEffect, useMemo } from 'react'
import {
  subDays,
  format,
  startOfWeek,
  addDays
} from 'date-fns'
import { supabase } from '../../lib/supabase'
import './ActivityGrid.css'

function ActivityGrid() {
  const [activityData, setActivityData] = useState({})

  // Generate last 16 weeks of dates (112 days) for compact display
  const gridDays = useMemo(() => {
    const today = new Date()
    const weeks = []

    // Start from 16 weeks ago, aligned to week start (Monday)
    let currentWeekStart = startOfWeek(subDays(today, 16 * 7), { weekStartsOn: 1 })

    for (let w = 0; w < 17; w++) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const day = addDays(currentWeekStart, d)
        if (day <= today) {
          week.push(day)
        } else {
          week.push(null) // Future dates
        }
      }
      weeks.push(week)
      currentWeekStart = addDays(currentWeekStart, 7)
    }

    return weeks
  }, [])

  useEffect(() => {
    fetchActivityData()
  }, [])

  async function fetchActivityData() {
    const today = new Date()
    const startDate = format(subDays(today, 120), 'yyyy-MM-dd')
    const endDate = format(today, 'yyyy-MM-dd')

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
    if (!date) return -1
    const dateStr = format(date, 'yyyy-MM-dd')
    const count = activityData[dateStr] || 0
    if (count === 0) return 0
    if (count <= 2) return 1
    if (count <= 4) return 2
    if (count <= 6) return 3
    return 4
  }

  return (
    <div className="activity-grid">
      <h3 className="activity-title">Activity</h3>
      <div className="grid-container">
        {gridDays.map((week, weekIndex) => (
          <div key={weekIndex} className="grid-week">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`grid-cell ${day ? '' : 'empty'}`}
                data-activity={getActivityLevel(day)}
                title={day ? format(day, 'MMM d, yyyy') : ''}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ActivityGrid
