import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import LeftSidebar from '../../components/LeftSidebar/LeftSidebar'
import Calendar from '../../components/Calendar/Calendar'
import RightSidebar from '../../components/RightSidebar/RightSidebar'

function Journal() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const { signOut } = useAuth()

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    const rightSidebar = document.querySelector('.right-sidebar')
    if (rightSidebar) {
      rightSidebar.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleEntryAdded = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleTagSelect = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleEntryDateChange = async (entryId, newDate) => {
    const { error } = await supabase
      .from('entries')
      .update({ date: newDate })
      .eq('id', entryId)

    if (!error) {
      setRefreshKey(prev => prev + 1)
    } else {
      console.error('Error updating entry date:', error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="app">
      <LeftSidebar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTags={selectedTags}
        onTagSelect={handleTagSelect}
        refreshKey={refreshKey}
        onReminderClick={(date) => setSelectedDate(new Date(date + 'T00:00:00'))}
        onSignOut={handleSignOut}
      />
      <Calendar
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        refreshKey={refreshKey}
        onEntryAdded={handleEntryAdded}
        onEntryDateChange={handleEntryDateChange}
      />
      <RightSidebar
        selectedDate={selectedDate}
        refreshKey={refreshKey}
        onEntryUpdated={handleEntryAdded}
        searchQuery={searchQuery}
        selectedTags={selectedTags}
        onPostClick={(date) => setSelectedDate(new Date(date + 'T00:00:00'))}
      />
    </div>
  )
}

export default Journal
