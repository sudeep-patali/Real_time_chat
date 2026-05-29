import api from '../config/api.config'

export const uploadFile = async (file, onProgress) => {
  // Dummy phase — remove and use real call when backend ready
  return new Promise((resolve) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += 20
      onProgress?.(progress)
      if (progress >= 100) {
        clearInterval(interval)
        resolve({
          data: {
            url: 'https://cdn.example.com/uploads/fake-image.jpg'
          }
        })
      }
    }, 400)
  })

  // Real call (uncomment when backend ready):
  // const formData = new FormData()
  // formData.append('file', file)
  // return api.post('/media/upload', formData, {
  //   headers: { 'Content-Type': 'multipart/form-data' },
  //   onUploadProgress: (e) => {
  //     const percent = Math.round((e.loaded * 100) / e.total)
  //     onProgress?.(percent)
  //   }
  // })
}