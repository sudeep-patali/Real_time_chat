import { useState } from 'react'
import { uploadFile } from '../services/mediaService'
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '../utils/constants'

export function useMediaUpload() {
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [uploadedUrl, setUploadedUrl] = useState(null)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)

  const selectFile = async (selectedFile) => {
    setError(null)
    setUploadedUrl(null)
    setProgress(0)

    // Validate type
    if (!SUPPORTED_FILE_TYPES.includes(selectedFile.type)) {
      setError('File type not supported. Use JPEG, PNG, GIF or PDF.')
      return
    }

    // Validate size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    setFile(selectedFile)
    setUploading(true)

    try {
      const res = await uploadFile(selectedFile, (p) => setProgress(p))
      setUploadedUrl(res.data.url)
    } catch (err) {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setProgress(0)
    setUploadedUrl(null)
    setError(null)
    setUploading(false)
  }

  return {
    file,
    progress,
    uploadedUrl,
    error,
    uploading,
    selectFile,
    reset
  }
}