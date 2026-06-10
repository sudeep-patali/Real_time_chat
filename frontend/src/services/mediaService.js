import api from '../config/api.config'

export const uploadFile = async (file, onProgress, uploadSource = null, roomId = null) => {
  const formData = new FormData()
  formData.append('file', file)
  if (uploadSource) formData.append('uploadSource', uploadSource)
  if (roomId)       formData.append('roomId', roomId)
  return api.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      const percent = Math.round((e.loaded * 100) / e.total)
      onProgress?.(percent)
    }
  })
}

export const getRoomMedia = (roomId) =>
  api.get(`/media/rooms/${roomId}/media`)