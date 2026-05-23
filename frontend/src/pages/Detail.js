import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { getUser } from '../auth'
import { useToast } from '../ToastContext'
import ConfirmModal from '../components/ConfirmModal'

const Detail = () => {
	const { id } = useParams()
	const navigate = useNavigate()
	const user = getUser()
	const { showToast } = useToast()

	const [incident, setIncident] = useState(null)
	const [error, setError] = useState(null)
	const [isEditing, setIsEditing] = useState(false)
	const [formData, setFormData] = useState({})
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

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

	const handleDeleteClick = () => {
		setIsDeleteModalOpen(true)
	}

	const confirmDelete = () => {
		setIsDeleteModalOpen(false)

		api
			.delete(`/api/incidents/${id}`)
			.then(() => {
				showToast('Инцидент успешно удален', 'success')
				navigate('/')
			})
			.catch(err => {
				if (err.response?.status !== 403) {
					showToast(err.response?.data?.error || 'Ошибка при удалении', 'error')
				}
			})
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
					showToast(
						err.response?.data?.error || 'Ошибка при сохранении',
						'error',
					)
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
						<button onClick={handleDeleteClick} className='btn btn-danger'>
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

						{/* НОВЫЕ ПОЛЯ ДЛЯ РЕДАКТИРОВАНИЯ */}
						<div
							className='form-divider'
							style={{ margin: '12px 0 24px' }}
						></div>

						<div className='form-row'>
							<div className='form-group'>
								<label className='form-label'>Уровень риска</label>
								<select
									className='form-select'
									value={formData.risk_level || ''}
									onChange={e =>
										setFormData({ ...formData, risk_level: e.target.value })
									}
								>
									<option value=''>Не рассчитан</option>
									<option value='low'>Низкий</option>
									<option value='medium'>Средний</option>
									<option value='high'>Высокий</option>
									<option value='critical'>Критический</option>
								</select>
							</div>
							<div className='form-group'>
								<label className='form-label'>Оценка риска (0-100)</label>
								<input
									type='number'
									min='0'
									max='100'
									className='form-input'
									value={formData.risk_score || 0}
									onChange={e =>
										setFormData({
											...formData,
											risk_score: parseInt(e.target.value) || 0,
										})
									}
								/>
							</div>
						</div>

						<div className='form-row'>
							<div className='form-group'>
								<label className='form-label'>Подозрительный</label>
								<select
									className='form-select'
									value={formData.is_suspicious ? 'yes' : 'no'}
									onChange={e =>
										setFormData({
											...formData,
											is_suspicious: e.target.value === 'yes',
										})
									}
								>
									<option value='no'>Нет</option>
									<option value='yes'>Да</option>
								</select>
							</div>
						</div>

						<div className='form-group'>
							<label className='form-label'>Причина обнаружения</label>
							<textarea
								className='form-input'
								rows='3'
								value={formData.detection_reason || ''}
								onChange={e =>
									setFormData({ ...formData, detection_reason: e.target.value })
								}
								placeholder='Опишите, как был обнаружен инцидент...'
							/>
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

						{/* НОВЫЙ БЛОК - УРОВЕНЬ РИСКА И ПОДОЗРИТЕЛЬНЫЙ */}
						<div
							className='form-divider'
							style={{ margin: '12px 0 24px' }}
						></div>
						<div className='form-row'>
							<div className='form-group'>
								<div className='form-label'>УРОВЕНЬ РИСКА</div>
								<div
									style={{
										fontSize: '18px',
										fontWeight: '600',
										color:
											incident.risk_level === 'critical'
												? 'var(--danger)'
												: incident.risk_level === 'high'
													? '#ff6b35'
													: incident.risk_level === 'medium'
														? 'var(--warning)'
														: 'var(--accent)',
									}}
								>
									{incident.risk_level
										? incident.risk_level.toUpperCase()
										: 'НЕ РАССЧИТАН'}{' '}
									({incident.risk_score || 0}/100)
								</div>
							</div>
							<div className='form-group'>
								<div className='form-label'>ПОДОЗРИТЕЛЬНЫЙ</div>
								<div
									style={{
										fontSize: '18px',
										color: incident.is_suspicious
											? 'var(--danger)'
											: 'var(--accent)',
									}}
								>
									{incident.is_suspicious ? '⚠️ ДА' : '✅ НЕТ'}
								</div>
							</div>
						</div>

						<div className='form-group' style={{ marginTop: '16px' }}>
							<div className='form-label'>ПРИЧИНА ОБНАРУЖЕНИЯ</div>
							<div
								style={{
									background: 'var(--bg)',
									border: '1px solid var(--border)',
									padding: '12px 16px',
									fontFamily: 'var(--font-mono)',
									fontSize: '12px',
									color: 'var(--text-secondary)',
									lineHeight: '1.6',
								}}
							>
								{incident.detection_reason ||
									'Риск не рассчитан. Отредактируйте инцидент для пересчёта.'}
							</div>
						</div>
					</>
				)}
			</div>
			<ConfirmModal
				isOpen={isDeleteModalOpen}
				title='Удаление инцидента'
				message={`Точно удалить инцидент #${incident.id}? Это действие необратимо.`}
				confirmText='Удалить'
				cancelText='Отмена'
				danger={true}
				onCancel={() => setIsDeleteModalOpen(false)}
				onConfirm={confirmDelete}
			/>
		</div>
	)
}

export default Detail
