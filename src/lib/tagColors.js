// Consistent tag color mapping based on tag name
// This ensures the same tag always gets the same color across the app

const TAG_COLORS = [
  'var(--tag-blue)',    // #929ee8
  'var(--tag-peach)',   // #e0bc9e
  'var(--tag-mint)',    // #6eebc8
  'var(--tag-pink)',    // #d8a0d8
  'var(--tag-yellow)',  // #fbee5d
]

// Simple hash function for consistent color assignment
function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

export function getTagColor(tagName) {
  const index = hashString(tagName.toLowerCase()) % TAG_COLORS.length
  return TAG_COLORS[index]
}

export function getTagColorClass(tagName) {
  const colors = ['blue', 'peach', 'mint', 'pink', 'yellow']
  const index = hashString(tagName.toLowerCase()) % colors.length
  return colors[index]
}

export { TAG_COLORS }
