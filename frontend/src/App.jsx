import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import Toast from './components/Toast'
import MediaPreview from './components/MediaPreview'
import { SocketProvider } from './context/SocketContext'
import { ThemeProvider } from './context/ThemeContext'

function App() {
  return (
    <SocketProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Toast />
          <MediaPreview />
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </SocketProvider>
  )
}

export default App