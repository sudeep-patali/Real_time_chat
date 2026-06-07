import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import Toast from './components/Toast'
import MediaPreview from './components/MediaPreview'
import { SocketProvider } from './context/SocketContext'
import { ThemeProvider } from './context/ThemeContext'
import { AppearanceProvider } from './context/AppearanceContext'

function App() {
  return (
    <SocketProvider>
      <ThemeProvider>
        <AppearanceProvider>
          <BrowserRouter>
            <Toast />
            <MediaPreview />
            <AppRoutes />
          </BrowserRouter>
        </AppearanceProvider>
      </ThemeProvider>
    </SocketProvider>
  )
}

export default App