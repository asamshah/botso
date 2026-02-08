import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { getTagColor } from '../../lib/tagColors'
import jotsoLogo from '../../assets/jotso.svg'
import './LeftSidebar.css'

const DEFAULT_PROFILE = {
  name: 'Your Name',
  bio: 'Your bio here',
  avatar_url: null
}

function LeftSidebar({ searchQuery, onSearchChange, selectedTags, onTagSelect, refreshKey, onReminderClick, onSignOut }) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [allTags, setAllTags] = useState([])
  const [reminders, setReminders] = useState([])
  const [timeReminders, setTimeReminders] = useState([])
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [editName, setEditName] = useState(profile.name)
  const [editBio, setEditBio] = useState(profile.bio)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const fileInputRef = useRef(null)
  const nameInputRef = useRef(null)
  const bioInputRef = useRef(null)

  useEffect(() => {
    fetchProfile()
    fetchTags()
    fetchReminders()
    fetchTimeReminders()
  }, [refreshKey])

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

  useEffect(() => {
    if (isEditingBio && bioInputRef.current) {
      bioInputRef.current.focus()
      bioInputRef.current.select()
    }
  }, [isEditingBio])

  async function fetchTags() {
    const { data, error } = await supabase
      .from('entries')
      .select('tags')
      .not('tags', 'is', null)

    if (data && !error) {
      const tagSet = new Set()
      data.forEach(entry => {
        if (entry.tags && Array.isArray(entry.tags)) {
          entry.tags.forEach(tag => tagSet.add(tag))
        }
      })
      setAllTags(Array.from(tagSet).sort())
    }
  }

  async function fetchReminders() {
    const { data, error } = await supabase
      .from('entries')
      .select('id, title, date')
      .eq('is_reminder', true)
      .order('date', { ascending: true })

    if (data && !error) {
      setReminders(data)
    }
  }

  async function fetchTimeReminders() {
    const { data, error } = await supabase
      .from('entries')
      .select('id, title, date, reminder_time')
      .not('reminder_time', 'is', null)
      .order('date', { ascending: true })

    if (data && !error) {
      setTimeReminders(data)
    }
  }

  async function fetchProfile() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setProfileLoaded(true)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data && !error) {
        setProfile(data)
        setEditName(data.name)
        setEditBio(data.bio || '')
      } else {
        // Profile should be auto-created by trigger, but create if missing
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ ...DEFAULT_PROFILE, user_id: user.id }])
          .select()
          .single()

        if (newProfile && !createError) {
          setProfile(newProfile)
          setEditName(newProfile.name)
          setEditBio(newProfile.bio || '')
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
    setProfileLoaded(true)
  }

  const saveProfile = async (newProfile) => {
    setProfile(newProfile)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: newProfile.name,
          bio: newProfile.bio,
          avatar_url: newProfile.avatar_url
        })
        .eq('id', profile.id)

      if (error) {
        console.error('Error saving profile:', error)
      }
    } catch (err) {
      console.error('Error saving profile:', err)
    }
  }

  const handleNameClick = () => {
    setEditName(profile.name)
    setIsEditingName(true)
  }

  const handleNameSave = () => {
    if (editName.trim()) {
      saveProfile({ ...profile, name: editName.trim() })
    }
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSave()
    } else if (e.key === 'Escape') {
      setIsEditingName(false)
    }
  }

  const handleBioClick = () => {
    setEditBio(profile.bio || '')
    setIsEditingBio(true)
  }

  const handleBioSave = () => {
    saveProfile({ ...profile, bio: editBio.trim() })
    setIsEditingBio(false)
  }

  const handleBioKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleBioSave()
    } else if (e.key === 'Escape') {
      setIsEditingBio(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${profile.id}-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError)
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      if (urlData?.publicUrl) {
        saveProfile({ ...profile, avatar_url: urlData.publicUrl })
      }
    } catch (err) {
      console.error('Error uploading avatar:', err)
    }

    e.target.value = ''
  }

  return (
    <aside className="left-sidebar">
      <div className="profile-section">
        <img src={jotsoLogo} alt="Jotso" className="sidebar-logo" />
      </div>

      <div className="sidebar-scrollable">
      <div className="search-section">
        <div className="search-input-wrapper">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => onSearchChange('')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="tags-section">
        <h3 className="section-title">Tags</h3>
        {allTags.length === 0 ? (
          <p className="tags-empty">No tags yet</p>
        ) : (
          <div className="tags-list">
            {allTags.map(tag => {
              const color = getTagColor(tag)
              const isSelected = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  className={`tag-button ${isSelected ? 'selected' : ''}`}
                  style={{ '--tag-bg': color }}
                  onClick={() => onTagSelect(tag)}
                >
                  <span className="tag-hash">#</span>
                  {tag}
                  {isSelected && (
                    <svg className="tag-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}
        {selectedTags.length > 0 && (
          <button
            className="clear-tags-btn"
            onClick={() => selectedTags.forEach(tag => onTagSelect(tag))}
          >
            Clear filters
          </button>
        )}
      </div>

      {timeReminders.length > 0 && (
        <div className="reminders-section">
          <h3 className="section-title">Reminders</h3>
          <div className="reminders-list">
            {timeReminders.map(reminder => (
              <button
                key={reminder.id}
                className="reminder-item"
                onClick={() => onReminderClick && onReminderClick(reminder.date)}
              >
                <svg className="reminder-clock-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span className="reminder-title">{reminder.title}</span>
                <span className="reminder-time">{reminder.reminder_time}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {reminders.length > 0 && (
        <div className="pinned-section">
          <h3 className="section-title">Pinned</h3>
          <div className="pinned-list">
            {reminders.map(reminder => (
              <button
                key={reminder.id}
                className="pinned-item"
                onClick={() => onReminderClick && onReminderClick(reminder.date)}
              >
                <svg className="pin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 17v5"/>
                  <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>
                </svg>
                <span className="pinned-title">{reminder.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      </div>

      <div className="sidebar-footer">
        <button className="sign-out-btn" onClick={onSignOut}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.name} className="sign-out-avatar" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          )}
          Sign out
        </button>
      </div>
    </aside>
  )
}

export default LeftSidebar
