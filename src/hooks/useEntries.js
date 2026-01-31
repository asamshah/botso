import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'

export function useEntries(selectedDate) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)

    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    const { data, error: fetchError } = await supabase
      .from('entries')
      .select('*')
      .eq('date', dateStr)
      .order('time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setEntries(data || [])
    }
    setLoading(false)
  }, [selectedDate])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const addEntry = async (entryData) => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      return false
    }

    const { error: insertError } = await supabase
      .from('entries')
      .insert({
        ...entryData,
        date: format(selectedDate, 'yyyy-MM-dd'),
        user_id: user.id
      })

    if (insertError) {
      setError(insertError.message)
      return false
    }

    await fetchEntries()
    return true
  }

  const updateEntry = async (id, updates) => {
    const { error: updateError } = await supabase
      .from('entries')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      return false
    }

    await fetchEntries()
    return true
  }

  const deleteEntry = async (id) => {
    const { error: deleteError } = await supabase
      .from('entries')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    await fetchEntries()
    return true
  }

  const toggleComplete = async (id, currentState) => {
    return updateEntry(id, { is_completed: !currentState })
  }

  return {
    entries,
    loading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    toggleComplete,
    refetch: fetchEntries
  }
}

export function useActivityData(year) {
  const [activityData, setActivityData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActivityData() {
      setLoading(true)

      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`

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
      setLoading(false)
    }

    fetchActivityData()
  }, [year])

  return { activityData, loading }
}
