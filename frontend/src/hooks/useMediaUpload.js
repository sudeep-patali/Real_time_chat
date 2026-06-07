import { useState } from 'react'
import { uploadFile } from '../services/mediaService'
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE, MEDIA_TYPE_MAP } from '../utils/constants'

export function useMediaUpload() {
  const [file,        setFile]        = useState(null)
  const [progress,    setProgress]    = useState(0)
  const [uploadedUrl, setUploadedUrl] = useState(null)
  const [mediaType,   setMediaType]   = useState(null)   // 'image' | 'video' | 'document'
  const [fileName,    setFileName]    = useState(null)
  const [mimeType,    setMimeType]    = useState(null)
  const [error,       setError]       = useState(null)
  const [uploading,   setUploading]   = useState(false)

  const selectFile = async (selectedFile) => {
    setError(null)
    setUploadedUrl(null)
    setProgress(0)
    setMediaType(null)

    if (!SUPPORTED_FILE_TYPES.includes(selectedFile.type)) {
      setError('File type not supported.')
      return
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`)
      return
    }

    setFile(selectedFile)
    setUploading(true)

    try {
      const res        = await uploadFile(selectedFile, p => setProgress(p))
      const { url, mediaType: mType, fileName: fName, mimeType: mime } = res.data
      setUploadedUrl(url)
      setMediaType(mType || MEDIA_TYPE_MAP[selectedFile.type] || 'document')
      setFileName(fName || selectedFile.name)
      setMimeType(mime  || selectedFile.type)
    } catch (err) {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const reset = () => {
    setFile(null); setProgress(0); setUploadedUrl(null)
    setMediaType(null); setFileName(null); setMimeType(null)
    setError(null); setUploading(false)
  }

  return { file, progress, uploadedUrl, mediaType, fileName, mimeType, error, uploading, selectFile, reset }
}