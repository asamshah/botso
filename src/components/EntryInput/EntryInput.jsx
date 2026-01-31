import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { getTagColorClass } from '../../lib/tagColors'
import './EntryInput.css'

function EntryInput({ selectedDate, onEntryAdded, initialContent = '', initialTags = [], initialReminder = false, initialAttachments = [], entryId = null, onCancel = null }) {
  const [content, setContent] = useState(initialContent)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachments, setAttachments] = useState(() => {
    // Convert existing attachments (with url) to display format
    return initialAttachments.map(a => ({
      type: a.type,
      name: a.name,
      url: a.url, // existing URL
      previewUrl: a.type === 'image' ? a.url : null,
      isExisting: true // flag to know not to re-upload
    }))
  })
  const [tags, setTags] = useState(initialTags)
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [isReminder, setIsReminder] = useState(initialReminder)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const tagInputRef = useRef(null)

  const insertFormatting = (before, after = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)

    let newText
    let newCursorPos

    if (selectedText) {
      // Wrap selected text
      newText = content.substring(0, start) + before + selectedText + after + content.substring(end)
      newCursorPos = start + before.length + selectedText.length + after.length
    } else {
      // Insert at cursor
      newText = content.substring(0, start) + before + after + content.substring(end)
      newCursorPos = start + before.length
    }

    setContent(newText)

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleHeading = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const lineStart = content.lastIndexOf('\n', start - 1) + 1
    const lineEnd = content.indexOf('\n', start)
    const actualLineEnd = lineEnd === -1 ? content.length : lineEnd

    const beforeLine = content.substring(0, lineStart)
    const line = content.substring(lineStart, actualLineEnd)
    const afterLine = content.substring(actualLineEnd)

    let newLine
    if (line.startsWith('## ')) {
      newLine = line.substring(3)
    } else if (line.startsWith('# ')) {
      newLine = '## ' + line.substring(2)
    } else {
      newLine = '# ' + line
    }

    setContent(beforeLine + newLine + afterLine)
  }

  const handleBold = () => {
    insertFormatting('**', '**')
  }

  const handleList = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const lineStart = content.lastIndexOf('\n', start - 1) + 1

    const beforeLine = content.substring(0, lineStart)
    const afterCursor = content.substring(lineStart)

    if (afterCursor.startsWith('- ')) {
      setContent(beforeLine + afterCursor.substring(2))
    } else {
      setContent(beforeLine + '- ' + afterCursor)
    }
  }

  const handleQuote = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const lineStart = content.lastIndexOf('\n', start - 1) + 1

    const beforeLine = content.substring(0, lineStart)
    const afterCursor = content.substring(lineStart)

    if (afterCursor.startsWith('> ')) {
      setContent(beforeLine + afterCursor.substring(2))
    } else {
      setContent(beforeLine + '> ' + afterCursor)
    }
  }

  const handleTodo = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const lineStart = content.lastIndexOf('\n', start - 1) + 1

    const beforeLine = content.substring(0, lineStart)
    const afterCursor = content.substring(lineStart)

    if (afterCursor.startsWith('○ ')) {
      setContent(beforeLine + afterCursor.substring(2))
    } else {
      setContent(beforeLine + '○ ' + afterCursor)
    }

    setTimeout(() => {
      textarea.focus()
    }, 0)
  }

  const handleAttachment = () => {
    fileInputRef.current?.click()
  }

  const handleTagButton = () => {
    setShowTagInput(!showTagInput)
    if (!showTagInput) {
      setTimeout(() => tagInputRef.current?.focus(), 0)
    }
  }

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      addTag(tagInput.trim())
    } else if (e.key === 'Escape') {
      setShowTagInput(false)
      setTagInput('')
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const addTag = (tagName) => {
    if (tagName && !tags.includes(tagName)) {
      setTags([...tags, tagName])
    }
    setTagInput('')
  }

  const removeTag = (index) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    const newAttachments = files.map(file => {
      const attachment = {
        type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file',
        name: file.name,
        file
      }
      if (attachment.type === 'image') {
        attachment.previewUrl = URL.createObjectURL(file)
      }
      return attachment
    })
    setAttachments(prev => [...prev, ...newAttachments])
    e.target.value = ''
  }

  const removeAttachment = (index) => {
    const attachment = attachments[index]
    // Only revoke object URLs for newly added files, not existing URLs
    if (attachment.previewUrl && !attachment.isExisting) {
      URL.revokeObjectURL(attachment.previewUrl)
    }
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  async function uploadFile(file) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `attachments/${fileName}`

    const { data, error } = await supabase.storage
      .from('memento')
      .upload(filePath, file)

    if (error) {
      console.error('Upload error:', error)
      return null
    }

    const { data: urlData } = supabase.storage
      .from('memento')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim() && attachments.length === 0) return

    setIsSubmitting(true)

    // Upload attachments (or keep existing ones)
    const uploadedAttachments = []
    for (const attachment of attachments) {
      if (attachment.isExisting) {
        // Keep existing attachment as-is
        uploadedAttachments.push({
          type: attachment.type,
          name: attachment.name,
          url: attachment.url
        })
      } else if (attachment.file) {
        const url = await uploadFile(attachment.file)
        if (url) {
          uploadedAttachments.push({
            type: attachment.type,
            name: attachment.name,
            url
          })
        }
      }
    }

    const attachmentsJson = uploadedAttachments.length > 0
      ? JSON.stringify(uploadedAttachments)
      : null

    if (entryId) {
      // Update existing entry
      const { error } = await supabase
        .from('entries')
        .update({
          title: content.trim(),
          description: attachmentsJson || undefined,
          tags: tags.length > 0 ? tags : null,
          is_reminder: isReminder
        })
        .eq('id', entryId)

      if (!error) {
        attachments.forEach(a => {
          if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
        })
        onEntryAdded()
        if (onCancel) onCancel()
      } else {
        console.error('Error updating:', error)
      }
    } else {
      // Create new entry
      const { error } = await supabase
        .from('entries')
        .insert({
          date: format(selectedDate, 'yyyy-MM-dd'),
          title: content.trim() || ' ',
          description: attachmentsJson,
          entry_type: 'todo',
          is_completed: false,
          tags: tags.length > 0 ? tags : null,
          is_reminder: isReminder
        })

      if (!error) {
        attachments.forEach(a => {
          if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
        })
        setContent('')
        setAttachments([])
        setTags([])
        setTagInput('')
        setShowTagInput(false)
        setIsReminder(false)
        onEntryAdded()
      } else {
        console.error('Error posting:', error)
      }
    }

    setIsSubmitting(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit(e)
      return
    }
    if (e.key === 'Escape' && onCancel) {
      onCancel()
      return
    }

    // Auto-continue todo circles on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const lineStart = content.lastIndexOf('\n', start - 1) + 1
      const currentLine = content.substring(lineStart, start)

      if (currentLine.startsWith('○ ')) {
        e.preventDefault()
        const beforeCursor = content.substring(0, start)
        const afterCursor = content.substring(start)

        // If line only has the circle (empty todo), remove it instead
        if (currentLine.trim() === '○') {
          setContent(content.substring(0, lineStart) + afterCursor)
          setTimeout(() => {
            textarea.setSelectionRange(lineStart, lineStart)
          }, 0)
        } else {
          const newContent = beforeCursor + '\n○ ' + afterCursor
          setContent(newContent)
          setTimeout(() => {
            const newPos = start + 3 // \n + ○ + space
            textarea.setSelectionRange(newPos, newPos)
          }, 0)
        }
      }
    }
  }

  return (
    <form className="compose-box" onSubmit={handleSubmit}>
      <div className="compose-main">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's happening?"
          className="compose-input"
          disabled={isSubmitting}
        />

        {attachments.length > 0 && (
          <div className="attachments-preview">
            {attachments.map((attachment, index) => (
              <div key={index} className={`attachment-item ${attachment.previewUrl ? 'has-preview' : ''}`}>
                {attachment.previewUrl ? (
                  <div className="image-preview">
                    <img src={attachment.previewUrl} alt={attachment.name} />
                    <button
                      type="button"
                      className="preview-remove"
                      onClick={() => removeAttachment(index)}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="attachment-icon">
                      {attachment.type === 'video' ? '🎬' : '📎'}
                    </span>
                    <span className="attachment-name">{attachment.name}</span>
                    <button
                      type="button"
                      className="attachment-remove"
                      onClick={() => removeAttachment(index)}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {(showTagInput || tags.length > 0) && (
          <div className="tags-section">
            <div className="tags-list">
              {tags.map((tag, index) => (
                <span key={index} className={`compose-tag tag-${getTagColorClass(tag)}`}>
                  <span className="tag-hash">#</span>
                  {tag}
                  <button
                    type="button"
                    className="tag-remove"
                    onClick={() => removeTag(index)}
                  >
                    ×
                  </button>
                </span>
              ))}
              {showTagInput && (
                <input
                  ref={tagInputRef}
                  type="text"
                  className="tag-input"
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  onBlur={() => {
                    if (tagInput.trim()) {
                      addTag(tagInput.trim())
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="compose-footer">
        <div className="compose-actions">
          <button type="button" className="format-btn" title="Heading" onClick={handleHeading}>
            H
          </button>
          <button type="button" className="format-btn" title="Bold" onClick={handleBold}>
            B
          </button>
          <button type="button" className="format-btn" title="List" onClick={handleList}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
          <button type="button" className="format-btn" title="Todo" onClick={handleTodo}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9"/>
            </svg>
          </button>
          <button type="button" className="format-btn" title="Quote" onClick={handleQuote}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <button type="button" className="format-btn" title="Attach file" onClick={handleAttachment}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <button type="button" className={`format-btn ${showTagInput ? 'active' : ''}`} title="Add tag" onClick={handleTagButton}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </button>
          <button type="button" className={`format-btn ${isReminder ? 'active pin-active' : ''}`} title="Pin post" onClick={() => setIsReminder(!isReminder)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 17v5"/>
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        <div className="compose-buttons">
          {onCancel && (
            <button type="button" className="cancel-btn" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="post-btn"
            disabled={(!content.trim() && attachments.length === 0) || isSubmitting}
            aria-label={entryId ? 'Save' : 'Post'}
          >
            {isSubmitting ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="spinning">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

export default EntryInput
