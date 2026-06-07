export const generateAvatar = (name = '') => {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const colors = [
    '#7c6ef7', '#e96ef7', '#6eb5f7',
    '#f7a06e', '#6ef7a0', '#f76e6e',
    '#f7e06e', '#6ef7f0'
  ]

  const colorIndex = name
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length

  const canvas = document.createElement('canvas')
  canvas.width = 40
  canvas.height = 40
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = colors[colorIndex]
  ctx.beginPath()
  ctx.arc(20, 20, 20, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 14px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, 20, 20)

  return canvas.toDataURL()
}