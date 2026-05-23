import Dashboard from './pages/Dashboard'
import React, { useEffect } from 'react'
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
import { ToastProvider, useToast } from './ToastContext'
import { setGlobalToast } from './api'
import Dataset from './pages/Dataset'

// Компонент-охранник
const PrivateRoute = ({ children, allowedRoles }) => {
	if (!isLoggedIn()) return <Navigate to='/login' />

	const user = getUser()
	if (allowedRoles && !allowedRoles.includes(user.role)) {
		return <Navigate to='/' />
	}

	return children
}

// Инициализация Toast-перехватчика для Axios
const InitToast = () => {
	const { showToast } = useToast()
	useEffect(() => {
		setGlobalToast(showToast)
	}, [showToast])
	return null
}

const App = () => {
	return (
		<ToastProvider>
			<InitToast />
			<Router>
				<Routes>
					<Route path='/login' element={<Login />} />
					<Route path='/register' element={<Register />} />
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
					<Route
						path='/create'
						element={
							<PrivateRoute allowedRoles={['admin', 'investigator']}>
								<FormPage />
							</PrivateRoute>
						}
					/>
					<Route
						path='/admin'
						element={
							<PrivateRoute allowedRoles={['admin']}>
								<Admin />
							</PrivateRoute>
						}
					/>
					<Route
						path='/dashboard'
						element={
							<PrivateRoute>
								<Dashboard />
							</PrivateRoute>
						}
					/>
					<Route
						path='/dataset'
						element={
							<PrivateRoute allowedRoles={['admin', 'investigator']}>
								<Dataset />
							</PrivateRoute>
						}
					/>
				</Routes>
			</Router>
		</ToastProvider>
	)
}

export default App
