import { useState, useEffect } from 'react'
import { format, isToday, startOfMonth, endOfMonth } from 'date-fns'
import { supabase } from '../../lib/supabase'
import EntryItem from '../EntryItem/EntryItem'
import './RightSidebar.css'

function RightSidebar({ selectedDate, refreshKey, onEntryUpdated, searchQuery, selectedTags, onPostClick }) {
  const [dayEntries, setDayEntries] = useState([])
  const [monthEntries, setMonthEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEntries()
  }, [selectedDate, refreshKey])

  async function fetchEntries() {
    try {
      setLoading(true)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd')

      // Fetch day entries
      const { data: dayData, error: dayError } = await supabase
        .from('entries')
        .select('*')
        .eq('date', dateStr)
        .order('created_at', { ascending: false })

      // Fetch month entries (excluding selected day)
      const { data: monthData, error: monthError } = await supabase
        .from('entries')
        .select('*')
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .neq('date', dateStr)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (dayData && !dayError && Array.isArray(dayData)) {
        setDayEntries(dayData)
      }
      if (monthData && !monthError && Array.isArray(monthData)) {
        setMonthEntries(monthData)
      }
    } catch (error) {
      console.error('Error fetching entries:', error)
    }
    setLoading(false)
  }

  async function handleDelete(id) {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id)

    if (!error) {
      onEntryUpdated()
    }
  }

  // Filter entries based on search query and selected tags
  const filterEntries = (entries) => {
    return entries.filter(entry => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const titleMatch = entry.title?.toLowerCase().includes(query)
        const categoryMatch = entry.category?.toLowerCase().includes(query)
        const tagsMatch = entry.tags?.some(tag => tag.toLowerCase().includes(query))
        if (!titleMatch && !categoryMatch && !tagsMatch) return false
      }

      // Tag filter
      if (selectedTags.length > 0) {
        if (!entry.tags || !Array.isArray(entry.tags)) return false
        const hasAllTags = selectedTags.every(tag => entry.tags.includes(tag))
        if (!hasAllTags) return false
      }

      return true
    })
  }

  const filteredDayEntries = filterEntries(dayEntries)
  const filteredMonthEntries = filterEntries(monthEntries)

  const dayFormatted = format(selectedDate, 'EEEE d')
  const dateMonth = format(selectedDate, 'MMMM')
  const monthOnly = format(selectedDate, 'MMMM')
  const yearOnly = format(selectedDate, 'yyyy')

  // Group month entries by date
  const groupedMonthEntries = filteredMonthEntries.reduce((acc, entry) => {
    const date = entry.date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(entry)
    return acc
  }, {})

  const hasActiveFilters = searchQuery || selectedTags.length > 0

  return (
    <aside className="right-sidebar">
      {/* Selected Day Section */}
      <section className="day-section">
        <header className="date-header">
          <h2 className="date-title">{dayFormatted}</h2>
          <span className="date-month">{dateMonth}</span>
        </header>

        <div className="day-content">
          <div className="posts-container">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : filteredDayEntries.length === 0 ? (
              <div className="empty-state">
                {hasActiveFilters ? (
                  <p className="empty-hint">No matching entries</p>
                ) : (
                  <>
                    <p className="empty-title">No posts yet</p>
                    <p className="empty-hint">Share what's on your mind</p>
                  </>
                )}
              </div>
            ) : (
              <div className="posts-list">
                {filteredDayEntries.map(entry => (
                  <EntryItem
                    key={entry.id}
                    entry={entry}
                    onDelete={handleDelete}
                    onUpdate={onEntryUpdated}
                    onPostClick={onPostClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Month Section */}
      <section className="month-section">
        <header className="month-header">
          <h2 className="month-label">
            <span className="month-name">{monthOnly}</span>{' '}
            <span className="month-year">{yearOnly}</span>
          </h2>
          <span className="post-count">{filteredMonthEntries.length} {filteredMonthEntries.length === 1 ? 'post' : 'posts'}</span>
        </header>

        <div className="posts-container">
          {!loading && filteredMonthEntries.length === 0 ? (
            <div className="empty-state">
              <p className="empty-hint">
                {hasActiveFilters ? 'No matching entries' : 'No other posts this month'}
              </p>
            </div>
          ) : (
            <div className="month-posts">
              {Object.entries(groupedMonthEntries).map(([date, entries]) => {
                let formattedDate = date
                try {
                  formattedDate = format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d')
                } catch (e) {
                  console.error('Date parse error:', e)
                }
                return (
                  <div key={date} className="date-group">
                    <div className="date-group-header">
                      {formattedDate}
                    </div>
                    <div className="posts-list">
                      {entries.map(entry => (
                        <EntryItem
                          key={entry.id}
                          entry={entry}
                          onDelete={handleDelete}
                          onUpdate={onEntryUpdated}
                          onPostClick={onPostClick}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </aside>
  )
}

export default RightSidebar
