import api from '../config/api.config'

export const uploadFile = async (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
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