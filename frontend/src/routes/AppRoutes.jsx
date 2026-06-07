import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'

import Login            from '../pages/Login'
import Signup           from '../pages/Signup'
import Home             from '../pages/Home'
import Chat             from '../pages/Chat'
import GroupChat        from '../pages/GroupChat'
import Profile          from '../pages/Profile'
import Settings         from '../pages/Settings'
import NotFound         from '../pages/NotFound'
import UserInfo         from '../pages/UserInfo'
import GroupInfo        from '../pages/GroupInfo'
import FindPeople       from '../pages/FindPeople'
import MessageRequests  from '../pages/MessageRequests'
import CreateGroup      from '../pages/CreateGroup'
import GroupInvitations from '../pages/GroupInvitations'

function AppRoutes() {
  return (
    <Routes>
      <Route path='/login'  element={<Login />} />
      <Route path='/signup' element={<Signup />} />

      <Route element={<ProtectedRoute />}>
        <Route path='/'                        element={<Home />} />
        <Route path='/chat/:roomId'            element={<Chat />} />
        <Route path='/group/:roomId'           element={<GroupChat />} />
        <Route path='/profile'                 element={<Profile />} />
        <Route path='/settings'               element={<Settings />} />
        <Route path='/user/:userId'           element={<UserInfo />} />
        <Route path='/group/:roomId/info'     element={<GroupInfo />} />
        <Route path='/find-people'            element={<FindPeople />} />
        <Route path='/requests'               element={<MessageRequests />} />
        <Route path='/create-group'           element={<CreateGroup />} />
        <Route path='/group-invitations'      element={<GroupInvitations />} />
      </Route>

      <Route path='*' element={<NotFound />} />
    </Routes>
  )
}

export default AppRoutes