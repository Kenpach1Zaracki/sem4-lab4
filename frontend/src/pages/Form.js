import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import { sendRealEmail } from '../emailService'

const FormPage = () => {
	const navigate = useNavigate()
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

		console.log('ШАГ 1: Кнопка нажата. Отправляем инцидент в базу...')

		api
			.post('/api/incidents', form)
			.then(res => {
				console.log(
					'ШАГ 2: База данных сохранила инцидент! Вызываем EmailJS...',
				)

				// Вызываем отправку письма (и ждем результат)
				sendRealEmail('CREATE', {
					...form,
					description: 'Зафиксирована новая угроза безопасности',
				}).then(result => {
					console.log('ШАГ 3: Результат от EmailJS:', result)
				})

				// Возвращаемся на главную страницу
				navigate('/')
			})
			.catch(err => {
				console.error('ОШИБКА БД ПОЛНАЯ:', err.response?.data)
				const serverError = err.response?.data?.error
				setError(
					serverError ? `Ответ базы: ${serverError}` : 'Ошибка при создании',
				)
				alert(`Точная ошибка от базы: ${serverError}`) // Добавил алерт, чтобы точно не пропустить
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
