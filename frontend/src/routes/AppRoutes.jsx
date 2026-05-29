import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'

import Login from '../pages/Login'
import Signup from '../pages/Signup'
import Home from '../pages/Home'
import Chat from '../pages/Chat'
import GroupChat from '../pages/GroupChat'
import Profile from '../pages/Profile'
import Settings from '../pages/Settings'
import NotFound from '../pages/NotFound'
import UserInfo from '../pages/UserInfo'
import GroupInfo from '../pages/GroupInfo'

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path='/login' element={<Login />} />
      <Route path='/signup' element={<Signup />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path='/' element={<Home />} />
        <Route path='/chat/:roomId' element={<Chat />} />
        <Route path='/group/:roomId' element={<GroupChat />} />
        <Route path='/profile' element={<Profile />} />
        <Route path='/settings' element={<Settings />} />

        {/* Info pages — navigated to from chat headers */}
        <Route path='/user/:userId' element={<UserInfo />} />
        <Route path='/group/:roomId/info' element={<GroupInfo />} />
      </Route>

      {/* Fallback */}
      <Route path='*' element={<NotFound />} />
    </Routes>
  )
}

export default AppRoutes