import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import { saveUser } from '../auth'
import emailjs from '@emailjs/browser'

const Login = () => {
	const navigate = useNavigate()
	const [step, setStep] = useState('login')
	const [form, setForm] = useState({ email: '', password: '' })
	const [code, setCode] = useState('')
	const [error, setError] = useState(null)
	const [loading, setLoading] = useState(false)

	const handleChange = e =>
		setForm({ ...form, [e.target.name]: e.target.value })

	const handleLogin = e => {
		e.preventDefault()
		setError(null)
		setLoading(true)
		api
			.post('/api/auth/login', form)
			.then(response => {
				if (response.data.require2FA) {
					// Отправляем код через EmailJS из браузера
					emailjs
						.send('service_xp6vwpo', 'template_1ya2woi', {
							code: response.data.code,
							to_email: response.data.email,
						})
						.then(() => {
							setStep('2fa')
						})
						.catch(err => {
							console.error('EmailJS error:', err)
							setError('Ошибка отправки кода')
						})
				}
			})
			.catch(err =>
				setError(err.response?.data?.error || 'Неверные учетные данные'),
			)
			.finally(() => setLoading(false))
	}

	const handleVerify2FA = e => {
		e.preventDefault()
		setError(null)
		setLoading(true)
		api
			.post('/api/auth/verify-2fa', { email: form.email, code })
			.then(response => {
				saveUser(response.data.user, response.data.token)
				navigate('/')
			})
			.catch(err => setError(err.response?.data?.error || 'Неверный код'))
			.finally(() => setLoading(false))
	}

	return (
		<div className='auth-page'>
			<div className='auth-card'>
				<div className='auth-logo'>
					SAFE<span>TRACK</span>
				</div>
				<div className='auth-subtitle'>
					{step === 'login'
						? 'Идентификация персонала'
						: 'Двухфакторная аутентификация'}
				</div>
				{error && <div className='server-error'>{error}</div>}

				{step === 'login' ? (
					<form onSubmit={handleLogin}>
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
							disabled={loading}
						>
							{loading ? 'ПРОВЕРКА...' : 'АВТОРИЗАЦИЯ'}
						</button>
					</form>
				) : (
					<form onSubmit={handleVerify2FA}>
						<div
							style={{
								fontFamily: 'var(--font-mono)',
								fontSize: '12px',
								color: 'var(--text-secondary)',
								marginBottom: '16px',
								textAlign: 'center',
							}}
						>
							Код отправлен на <strong>{form.email}</strong>
						</div>
						<div className='form-group'>
							<label className='form-label'>Код из письма</label>
							<input
								className='form-input'
								type='text'
								value={code}
								onChange={e => setCode(e.target.value)}
								placeholder='000000'
								maxLength={6}
								required
								autoFocus
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
							disabled={loading}
						>
							{loading ? 'ПРОВЕРКА...' : 'ПОДТВЕРДИТЬ'}
						</button>
						<button
							type='button'
							className='btn btn-ghost'
							style={{ width: '100%', marginTop: '8px' }}
							onClick={() => setStep('login')}
						>
							НАЗАД
						</button>
					</form>
				)}

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
