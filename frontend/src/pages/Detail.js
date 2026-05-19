import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { getUser } from '../auth'
import { useToast } from '../ToastContext'

const Detail = () => {
	const { id } = useParams()
	const navigate = useNavigate()
	const user = getUser()
	const { showToast } = useToast()

	const [incident, setIncident] = useState(null)
	const [error, setError] = useState(null)
	const [isEditing, setIsEditing] = useState(false)
	const [formData, setFormData] = useState({})

	useEffect(() => {
		api
			.get('/api/incidents')
			.then(res => {
				const found = res.data.find(inc => inc.id.toString() === id)
				if (found) {
					setIncident(found)
					setFormData(found)
				} else setError('Инцидент не найден')
			})
			.catch(() => setError('Ошибка загрузки'))
	}, [id])

	// Проверка, может ли текущий пользователь редактировать
	const canEdit =
		user.role === 'admin' ||
		(user.role === 'investigator' && incident?.assignedTo === user.email)

	const handleDelete = () => {
		if (window.confirm('Точно удалить эту запись?')) {
			api
				.delete(`/api/incidents/${id}`)
				.then(() => {
					showToast('Инцидент успешно удален', 'success')
					navigate('/')
				})
				.catch(err => {
					// 403 отлавливается глобально, но можем добавить фоллбэк
					if (err.response?.status !== 403) {
						showToast(err.response?.data?.error || 'Ошибка при удалении', 'error')
					}
				})
		}
	}

	const handleSave = () => {
		api
			.put(`/api/incidents/${id}`, formData)
			.then(res => {
				setIncident(res.data)
				setIsEditing(false)
				showToast('Изменения сохранены', 'success')
			})
			.catch(err => {
				if (err.response?.status !== 403) {
					showToast(err.response?.data?.error || 'Ошибка при сохранении', 'error')
				}
			})
	}

	if (error)
		return (
			<div className='page'>
				<div className='server-error'>{error}</div>
				<Link to='/' className='back-link'>
					НАЗАД
				</Link>
			</div>
		)
	if (!incident)
		return (
			<div className='page'>
				<div className='loading'>Получение данных...</div>
			</div>
		)

	return (
		<div className='page'>
			<Link to='/' className='back-link'>
				ТЕРМИНАЛ
			</Link>

			<div className='header' style={{ marginBottom: '24px' }}>
				<div className='header-left'>
					<h1>
						ДОСЬЕ <span>#{incident.id}</span>
					</h1>
				</div>
				{canEdit && (
					<div
						className='header-right'
						style={{ display: 'flex', gap: '10px' }}
					>
						{isEditing ? (
							<button onClick={handleSave} className='btn btn-primary'>
								СОХРАНИТЬ
							</button>
						) : (
							<button
								onClick={() => setIsEditing(true)}
								className='btn btn-primary'
							>
								РЕДАКТИРОВАТЬ
							</button>
						)}
						<button onClick={handleDelete} className='btn btn-danger'>
							УДАЛИТЬ
						</button>
					</div>
				)}
			</div>

			<div className='form-card'>
				{isEditing ? (
					<>
						<div className='form-row'>
							<div className='form-group'>
								<label className='form-label'>Тип угрозы</label>
								<input
									className='form-input'
									value={formData.type || ''}
									onChange={e =>
										setFormData({ ...formData, type: e.target.value })
									}
								/>
							</div>
							<div className='form-group'>
								<label className='form-label'>Уровень</label>
								<select
									className='form-select'
									value={formData.severity || ''}
									onChange={e =>
										setFormData({ ...formData, severity: e.target.value })
									}
								>
									<option>Низкий</option>
									<option>Средний</option>
									<option>Высокий</option>
									<option>Критический</option>
								</select>
							</div>
						</div>
						<div className='form-row'>
							<div className='form-group'>
								<label className='form-label'>Статус</label>
								<select
									className='form-select'
									value={formData.status || ''}
									onChange={e =>
										setFormData({ ...formData, status: e.target.value })
									}
								>
									<option>Открыт</option>
									<option>В работе</option>
									<option>Закрыт</option>
								</select>
							</div>
							<div className='form-group'>
								<label className='form-label'>Агент (Email)</label>
								<input
									className='form-input'
									value={formData.assignedTo || ''}
									onChange={e =>
										setFormData({ ...formData, assignedTo: e.target.value })
									}
								/>
							</div>
						</div>
					</>
				) : (
					<>
						<div className='form-row'>
							<div className='form-group'>
								<div className='form-label'>ТИП УГРОЗЫ</div>
								<div
									style={{
										fontSize: '18px',
										fontWeight: '500',
										color: 'var(--text-primary)',
									}}
								>
									{incident.type}
								</div>
							</div>
							<div className='form-group'>
								<div className='form-label'>УРОВЕНЬ</div>
								<div style={{ fontSize: '18px', color: 'var(--accent)' }}>
									{incident.severity}
								</div>
							</div>
						</div>
						<div
							className='form-divider'
							style={{ margin: '12px 0 24px' }}
						></div>
						<div className='form-row'>
							<div className='form-group'>
								<div className='form-label'>СТАТУС</div>
								<div style={{ color: 'var(--text-secondary)' }}>
									{incident.status}
								</div>
							</div>
							<div className='form-group'>
								<div className='form-label'>НАЗНАЧЕННЫЙ АГЕНТ</div>
								<div style={{ color: 'var(--text-secondary)' }}>
									{incident.assignedTo || 'Не назначен'}
								</div>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	)
}

export default Detail
