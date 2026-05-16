import React from 'react'
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Detail from './pages/Detail'
import FormPage from './pages/Form'
import Admin from './pages/Admin'
import { isLoggedIn, getUser } from './auth'

// Компонент-охранник для защиты роутов
const PrivateRoute = ({ children, allowedRoles }) => {
	if (!isLoggedIn()) {
		return <Navigate to='/login' /> // Если нет токена - на логин
	}

	const user = getUser()
	// Если у роута есть ограничения по ролям, и роли юзера там нет - на главную
	if (allowedRoles && !allowedRoles.includes(user.role)) {
		return <Navigate to='/' />
	}

	return children
}

const App = () => {
	return (
		<Router>
			<Routes>
				<Route path='/login' element={<Login />} />
				<Route path='/register' element={<Register />} />

				{/* Доступно всем авторизованным */}
				<Route
					path='/'
					element={
						<PrivateRoute>
							<Home />
						</PrivateRoute>
					}
				/>
				<Route
					path='/incident/:id'
					element={
						<PrivateRoute>
							<Detail />
						</PrivateRoute>
					}
				/>

				{/* Доступно только Админам и Расследователям */}
				<Route
					path='/create'
					element={
						<PrivateRoute allowedRoles={['admin', 'investigator']}>
							<FormPage />
						</PrivateRoute>
					}
				/>

				{/* Доступно ТОЛЬКО Админу */}
				<Route
					path='/admin'
					element={
						<PrivateRoute allowedRoles={['admin']}>
							<Admin />
						</PrivateRoute>
					}
				/>
			</Routes>
		</Router>
	)
}

export default App
