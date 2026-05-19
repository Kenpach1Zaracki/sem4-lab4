import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import { sendRealEmail } from '../emailService'
import { useToast } from '../ToastContext'

const FormPage = () => {
	const navigate = useNavigate()
	const { showToast } = useToast()
	const [form, setForm] = useState({
		type: '',
		location: '',
		severity: 'Низкий',
		status: 'Открыт',
		assignedTo: '',
	})
	const [error, setError] = useState(null)

	const handleChange = e =>
		setForm({ ...form, [e.target.name]: e.target.value })

	const handleSubmit = e => {
		e.preventDefault()

		api
			.post('/api/incidents', form)
			.then(res => {
				sendRealEmail('CREATE', {
					...form,
					description: 'Зафиксирована новая угроза безопасности',
				}).catch(console.error)

				showToast('Инцидент успешно зарегистрирован!', 'success')
				navigate('/')
			})
			.catch(err => {
				const serverError = err.response?.data?.error
				setError(serverError ? `Ответ базы: ${serverError}` : 'Ошибка при создании')
				
				// Если это не 403 (которая уже отловилась глобально)
				if (err.response?.status !== 403) {
					showToast(`Ошибка: ${serverError}`, 'error')
				}
			})
	}

	return (
		<div className='page'>
			<Link to='/' className='back-link'>
				ОТМЕНА
			</Link>

			<div className='form-page-title'>
				РЕГИСТРАЦИЯ <span>ИНЦИДЕНТА</span>
			</div>
			<div className='form-divider'></div>

			<div className='form-card'>
				{error && <div className='server-error'>{error}</div>}

				<form onSubmit={handleSubmit}>
					<div className='form-row'>
						<div className='form-group'>
							<label className='form-label'>Тип инцидента</label>
							<input
								className='form-input'
								type='text'
								name='type'
								placeholder='Например: Утечка газа'
								onChange={handleChange}
								required
							/>
						</div>

						<div className='form-group'>
							<label className='form-label'>Уровень угрозы</label>
							<select
								className='form-select'
								name='severity'
								value={form.severity}
								onChange={handleChange}
							>
								<option value='Низкий'>НИЗКИЙ</option>
								<option value='Средний'>СРЕДНИЙ</option>
								<option value='Высокий'>ВЫСОКИЙ</option>
								<option value='Критический'>КРИТИЧЕСКИЙ</option>
							</select>
						</div>
					</div>

					<div className='form-group'>
						<label className='form-label'>Локация / Источник</label>
						<input
							className='form-input'
							type='text'
							name='location'
							placeholder='Например: Цех №3'
							onChange={handleChange}
							required
						/>
					</div>

					<div className='form-row'>
						<div className='form-group'>
							<label className='form-label'>Назначить агента (Email)</label>
							<input
								className='form-input'
								type='email'
								name='assignedTo'
								placeholder='investigator@plant.ru'
								onChange={handleChange}
							/>
						</div>

						<div className='form-group'>
							<label className='form-label'>Начальный статус</label>
							<select
								className='form-select'
								name='status'
								value={form.status}
								onChange={handleChange}
							>
								<option value='Открыт'>ОТКРЫТ</option>
								<option value='В работе'>В РАБОТЕ</option>
								<option value='Закрыт'>ЗАКРЫТ</option>
							</select>
						</div>
					</div>

					<div className='form-actions'>
						<button type='submit' className='btn btn-primary'>
							ЗАРЕГИСТРИРОВАТЬ
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

export default FormPage
