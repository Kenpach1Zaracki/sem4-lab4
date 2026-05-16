import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import { saveUser } from '../auth'

const Login = () => {
	const navigate = useNavigate()
	const [form, setForm] = useState({ email: '', password: '' })
	const [error, setError] = useState(null)

	const handleChange = e =>
		setForm({ ...form, [e.target.name]: e.target.value })

	const handleSubmit = e => {
		e.preventDefault()
		setError(null)
		api
			.post('/api/auth/login', form)
			.then(response => {
				saveUser(response.data.user, response.data.token)
				navigate('/')
			})
			.catch(err => setError(err.response?.data?.error || 'Ошибка входа'))
	}

	return (
		<div className='auth-page'>
			<div className='auth-card'>
				<div className='auth-logo'>
					SAFE<span>TRACK</span>
				</div>
				<div className='auth-subtitle'>Идентификация персонала</div>

				{error && <div className='server-error'>{error}</div>}

				<form onSubmit={handleSubmit}>
					<div className='form-group'>
						<label className='form-label'>Email</label>
						<input
							className='form-input'
							type='email'
							name='email'
							onChange={handleChange}
							required
						/>
					</div>
					<div className='form-group'>
						<label className='form-label'>Пароль</label>
						<input
							className='form-input'
							type='password'
							name='password'
							onChange={handleChange}
							required
						/>
					</div>
					<button
						type='submit'
						className='btn btn-primary'
						style={{
							width: '100%',
							justifyContent: 'center',
							marginTop: '16px',
						}}
					>
						АВТОРИЗАЦИЯ
					</button>
				</form>

				<div className='auth-footer'>
					<Link to='/register' className='auth-link'>
						Запрос доступа (Регистрация)
					</Link>
				</div>
			</div>
		</div>
	)
}
export default Login
