import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import EntryInput from '../EntryInput/EntryInput'
import { getTagColorClass } from '../../lib/tagColors'
import './EntryItem.css'

// Parse content into ordered blocks of text and URLs
function parseContentBlocks(text) {
  if (!text) return []

  try {
    const lines = text.split('\n')
    const blocks = []
    let currentTextLines = []

    const flushText = () => {
      if (currentTextLines.length > 0) {
        const textContent = currentTextLines.join('\n').trim()
        if (textContent) {
          blocks.push({ type: 'text', content: textContent })
        }
        currentTextLines = []
      }
    }

    lines.forEach(line => {
      // Check if line contains markdown link - treat as text
      if (line.includes('](')) {
        currentTextLines.push(line)
        return
      }

      // Check if line is just a URL
      const urlMatch = line.trim().match(/^(https?:\/\/[^\s]+)$/)
      if (urlMatch) {
        flushText()
        blocks.push({ type: 'url', content: urlMatch[1] })
        return
      }

      // Check if line has text with URL - separate them
      const urlRegex = /(https?:\/\/[^\s]+)/g
      const urls = line.match(urlRegex)
      if (urls) {
        const textPart = line.replace(urlRegex, '').trim()
        if (textPart) {
          currentTextLines.push(textPart)
        }
        flushText()
        urls.forEach(url => {
          blocks.push({ type: 'url', content: url })
        })
      } else {
        currentTextLines.push(line)
      }
    })

    flushText()
    return blocks
  } catch {
    return [{ type: 'text', content: text }]
  }
}

function LinkPreview({ url }) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function fetchPreview() {
      try {
        const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
        const data = await response.json()

        if (!isMounted) return

        if (data && data.status === 'success' && data.data) {
          setPreview({
            title: data.data.title || '',
            description: data.data.description || '',
            image: data.data.image?.url || null,
            logo: data.data.logo?.url || null,
            publisher: data.data.publisher || ''
          })
        } else {
          setError(true)
        }
      } catch (e) {
        if (isMounted) setError(true)
      }
      if (isMounted) setLoading(false)
    }

    fetchPreview()

    return () => {
      isMounted = false
    }
  }, [url])

  if (loading) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="link-preview loading">
        <div className="link-preview-content">
          <span className="link-url">{url}</span>
        </div>
      </a>
    )
  }

  if (error || !preview) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="link-preview simple">
        <div className="link-icon">🔗</div>
        <div className="link-preview-content">
          <span className="link-url">{url}</span>
        </div>
      </a>
    )
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="link-preview">
      {preview.image && (
        <div className="link-preview-image">
          <img src={preview.image} alt="" />
        </div>
      )}
      <div className="link-preview-content">
        {preview.title && <h4 className="link-title">{preview.title}</h4>}
        {preview.description && <p className="link-description">{preview.description}</p>}
        <span className="link-domain">
          {preview.logo && <img src={preview.logo} alt="" className="link-logo" />}
          {(() => {
            try {
              return new URL(url).hostname
            } catch {
              return url
            }
          })()}
        </span>
      </div>
    </a>
  )
}

function EntryItem({ entry, onDelete, onUpdate, onPostClick, hideActions }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [completedTodos, setCompletedTodos] = useState(() => {
    // Load completed state from entry or initialize empty
    try {
      const stored = entry.completed_todos
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const articleRef = useRef(null)

  const handleDragStart = (e) => {
    e.dataTransfer.setData('entryId', entry.id)
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const toggleTodo = async (index, e) => {
    e.stopPropagation()
    const newCompleted = completedTodos.includes(index)
      ? completedTodos.filter(i => i !== index)
      : [...completedTodos, index]

    setCompletedTodos(newCompleted)

    // Save to database
    const { supabase } = await import('../../lib/supabase')
    await supabase
      .from('entries')
      .update({ completed_todos: JSON.stringify(newCompleted) })
      .eq('id', entry.id)
  }

  // Guard against missing entry
  if (!entry || !entry.id) {
    return null
  }

  const { id, title, description, created_at, date, tags, is_reminder, reminder_time } = entry

  let timePosted = ''
  let datePosted = ''
  if (created_at) {
    try {
      timePosted = format(new Date(created_at), 'h:mm a')
    } catch {
      // Invalid date, leave empty
    }
  }
  if (date) {
    try {
      datePosted = format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d')
    } catch {
      // Invalid date, leave empty
    }
  }

  // Parse attachments from description field
  let attachments = []
  if (description) {
    try {
      const parsed = JSON.parse(description)
      // Ensure it's an array
      if (Array.isArray(parsed)) {
        attachments = parsed
      }
    } catch (e) {
      // Not JSON, ignore
    }
  }

  const images = attachments.filter(a => a && a.type === 'image' && a.url)
  const otherFiles = attachments.filter(a => a && a.type !== 'image' && a.url)

  // Parse content into ordered blocks
  const contentBlocks = title ? parseContentBlocks(title) : []

  // Separate todos from text blocks
  const processedBlocks = []
  let allTodos = []

  contentBlocks.forEach(block => {
    if (block.type === 'text') {
      const lines = block.content.split('\n')
      const textLines = []

      lines.forEach(line => {
        if (line.startsWith('○ ')) {
          allTodos.push(line.substring(2))
        } else {
          textLines.push(line)
        }
      })

      const textContent = textLines.join('\n').trim()
      if (textContent) {
        processedBlocks.push({ type: 'text', content: textContent })
      }
    } else {
      processedBlocks.push(block)
    }
  })

  // Get first block for collapsed view
  const firstTextBlock = processedBlocks.find(b => b.type === 'text')
  const firstUrlBlock = processedBlocks.find(b => b.type === 'url')

  const hasMoreContent = processedBlocks.length > 2 ||
    allTodos.length > 0 ||
    images.length > 1 ||
    otherFiles.length > 0

  const displayBlocks = processedBlocks
  const displayImages = images
  const displayTodos = allTodos
  const displayFiles = otherFiles

  if (isEditing) {
    return (
      <article className="post editing">
        <EntryInput
          selectedDate={new Date(date + 'T00:00:00')}
          onEntryAdded={onUpdate}
          initialContent={title}
          initialTags={tags || []}
          initialReminder={is_reminder || false}
          initialReminderTime={reminder_time || null}
          initialAttachments={attachments}
          entryId={id}
          onCancel={() => setIsEditing(false)}
        />
      </article>
    )
  }

  return (
    <article
      ref={articleRef}
      className={`post ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="post-content" onClick={() => {
        setIsExpanded(true)
        if (onPostClick && date) {
          onPostClick(date)
        }
        // Scroll sidebar so this post is at the top
        setTimeout(() => {
          if (articleRef.current) {
            const sidebar = document.querySelector('.right-sidebar')
            if (sidebar) {
              const postTop = articleRef.current.getBoundingClientRect().top
              const sidebarTop = sidebar.getBoundingClientRect().top
              const offset = postTop - sidebarTop + sidebar.scrollTop
              sidebar.scrollTo({ top: offset, behavior: 'smooth' })
            }
          }
        }, 50)
      }}>
        {displayBlocks.map((block, index) => {
          if (block.type === 'text') {
            return (
              <div key={index} className="post-text markdown">
                <ReactMarkdown
                  components={{
                    a: ({ node, ...props }) => (
                      <a {...props} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} />
                    )
                  }}
                >
                  {block.content}
                </ReactMarkdown>
              </div>
            )
          } else if (block.type === 'url') {
            return (
              <div key={index} className="post-links" onClick={e => e.stopPropagation()}>
                <LinkPreview url={block.content} />
              </div>
            )
          }
          return null
        })}

        {displayTodos.length > 0 && (
          <div className="post-text markdown">
            <div className="todo-list" onClick={e => e.stopPropagation()}>
              {displayTodos.map((todo, index) => {
                const isCompleted = completedTodos.includes(index)
                return (
                  <div
                    key={index}
                    className={`todo-item ${isCompleted ? 'completed' : ''}`}
                    onClick={(e) => toggleTodo(index, e)}
                  >
                    <div className={`todo-circle ${isCompleted ? 'checked' : ''}`}>
                      {isCompleted && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    <span className={`todo-text ${isCompleted ? 'crossed' : ''}`}>{todo}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {displayImages.length > 0 && (
        <div className="post-images">
          {displayImages.map((img, index) => (
            <div key={index} className="post-image">
              <img src={img.url} alt={img.name} />
            </div>
          ))}
        </div>
      )}

      {displayFiles.length > 0 && (
        <div className="post-files">
          {displayFiles.map((file, index) => (
            <a key={index} href={file.url} target="_blank" rel="noopener noreferrer" className="post-file">
              <span className="file-icon">
                {file.type === 'video' ? '🎬' : '📎'}
              </span>
              <span className="file-name">{file.name}</span>
            </a>
          ))}
        </div>
      )}


      {tags && tags.length > 0 && (
        <div className="post-tags">
          {tags.map((tag, index) => (
            <span key={index} className={`post-tag tag-${getTagColorClass(tag)}`}>
              <span className="tag-hash">#</span>
              {tag}
            </span>
          ))}
        </div>
      )}

      <footer className="post-footer">
        <span className="post-date-time">
          {is_reminder && (
            <svg className="pin-indicator" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 17v5"/>
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>
            </svg>
          )}
          {reminder_time && (
            <span className="clock-indicator">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {reminder_time}
            </span>
          )}
          {datePosted}{timePosted ? ` at ${timePosted}` : ''}
        </span>
        {!hideActions && (
          <div className="post-actions">
            <button
              className="edit-btn"
              onClick={() => setIsEditing(true)}
              aria-label="Edit post"
            >
              Edit
            </button>
            <button
              className="delete-btn"
              onClick={() => onDelete(id)}
              aria-label="Delete post"
            >
              Delete
            </button>
          </div>
        )}
      </footer>
    </article>
  )
}

export default EntryItem
