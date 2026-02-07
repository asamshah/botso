// Consistent tag color mapping based on tag name
// This ensures the same tag always gets the same color across the app

const TAG_COLORS = [
  'var(--tag-blue)',        // light cyan
  'var(--tag-periwinkle)',  // light periwinkle
  'var(--tag-lavender)',    // light lavender
  'var(--tag-pink)',        // light pink
  'var(--tag-rose)',        // light rose
  'var(--tag-peach)',       // light peach
  'var(--tag-yellow)',      // light yellow
  'var(--tag-mint)',        // light mint
  'var(--tag-coral)',       // light coral
  'var(--tag-sky)',         // light sky blue
  'var(--tag-lilac)',       // light lilac
  'var(--tag-lime)',        // light lime
]

const COLOR_CLASSES = ['blue', 'periwinkle', 'lavender', 'pink', 'rose', 'peach', 'yellow', 'mint', 'coral', 'sky', 'lilac', 'lime']

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = hash * 169 + str.charCodeAt(i)
  }
  return Math.abs(hash) % COLOR_CLASSES.length
}

export function getTagColor(tagName) {
  const index = hashString(tagName.toLowerCase())
  return TAG_COLORS[index]
}

export function getTagColorClass(tagName) {
  const index = hashString(tagName.toLowerCase())
  return COLOR_CLASSES[index]
}

export { TAG_COLORS }
