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

	// Состояния для комментариев
	const [comments, setComments] = useState([])
	const [newComment, setNewComment] = useState('')
	const [loadingComments, setLoadingComments] = useState(false)

	// Состояние для истории изменений
	const [history, setHistory] = useState([])

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

	// Загрузка комментариев
	useEffect(() => {
		api
			.get(`/api/incidents/${id}/comments`)
			.then(res => setComments(res.data))
			.catch(console.error)
	}, [id])

	// Загрузка истории изменений
	useEffect(() => {
		api
			.get('/api/admin/logs')
			.then(res => {
				const incidentHistory = res.data
					.filter(log => log.action && log.action.includes(`#${id}`))
					.slice(0, 10)
				setHistory(incidentHistory)
			})
			.catch(console.error)
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

	// Отправка комментария
	const handleAddComment = () => {
		if (!newComment.trim()) return
		setLoadingComments(true)
		api
			.post(`/api/incidents/${id}/comments`, { comment_text: newComment })
			.then(res => {
				setComments([...comments, res.data])
				setNewComment('')
			})
			.catch(err => showToast(err.response?.data?.error || 'Ошибка', 'error'))
			.finally(() => setLoadingComments(false))
	}

	// Функция скачивания отчета
	const handleDownloadReport = () => {
		if (!incident) return

		const report = `
========================================
   SAFETRACK — ОТЧЁТ ПО ИНЦИДЕНТУ #${incident.id}
========================================

Тип:              ${incident.type}
Локация:          ${incident.location}
Уровень угрозы:   ${incident.severity}
Статус:           ${incident.status}
Назначен:         ${incident.assignedTo || 'Не назначен'}

--- РИСК-АНАЛИЗ ---
Уровень риска:    ${incident.risk_level ? incident.risk_level.toUpperCase() : 'N/A'} (${incident.risk_score || 0}/100)
Подозрительный:   ${incident.is_suspicious ? 'ДА' : 'НЕТ'}
Причина:          ${incident.detection_reason || 'N/A'}

--- КОММЕНТАРИИ ---
${comments.length > 0 ? comments.map(c => `[${new Date(c.created_at).toLocaleString()}] ${c.author_email}: ${c.comment_text}`).join('\n') : 'Комментариев нет'}

--- ИСТОРИЯ ИЗМЕНЕНИЙ ---
${history.length > 0 ? history.map(h => `[${new Date(h.created_at).toLocaleString()}] ${h.action}`).join('\n') : 'История пуста'}

Дата создания:    ${new Date(incident.created_at).toLocaleString()}
Отчёт сгенерирован: ${new Date().toLocaleString()}
========================================
`

		const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
		const url = window.URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = `incident_${incident.id}_report.txt`
		link.click()
		window.URL.revokeObjectURL(url)
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
				<div className='header-right' style={{ display: 'flex', gap: '10px' }}>
					<button onClick={handleDownloadReport} className='btn btn-ghost'>
						ОТЧЁТ
					</button>
					{canEdit && (
						<>
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
						</>
					)}
				</div>
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

						{/* БЛОК КОММЕНТАРИЕВ */}
						<div
							className='form-divider'
							style={{ margin: '30px 0 24px' }}
						></div>
						<div className='form-card' style={{ padding: '24px' }}>
							<div className='form-label' style={{ marginBottom: '16px' }}>
								КОММЕНТАРИИ РАССЛЕДОВАНИЯ
							</div>

							{comments.length === 0 ? (
								<div className='empty-state' style={{ marginBottom: '16px' }}>
									Комментариев пока нет
								</div>
							) : (
								<div
									style={{
										marginBottom: '16px',
										display: 'flex',
										flexDirection: 'column',
										gap: '10px',
									}}
								>
									{comments.map(c => (
										<div
											key={c.id}
											style={{
												background: 'var(--bg)',
												border: '1px solid var(--border)',
												padding: '12px',
											}}
										>
											<div
												style={{
													display: 'flex',
													justifyContent: 'space-between',
													marginBottom: '6px',
												}}
											>
												<span
													style={{
														fontFamily: 'var(--font-mono)',
														fontSize: '10px',
														color: 'var(--accent)',
													}}
												>
													{c.author_email}
												</span>
												<span
													style={{
														fontFamily: 'var(--font-mono)',
														fontSize: '10px',
														color: 'var(--text-muted)',
													}}
												>
													{new Date(c.created_at).toLocaleString()}
												</span>
											</div>
											<div
												style={{
													fontSize: '14px',
													color: 'var(--text-primary)',
													lineHeight: '1.5',
												}}
											>
												{c.comment_text}
											</div>
										</div>
									))}
								</div>
							)}

							<div style={{ display: 'flex', gap: '10px' }}>
								<input
									className='form-input'
									style={{ flex: 1 }}
									placeholder='Добавить комментарий...'
									value={newComment}
									onChange={e => setNewComment(e.target.value)}
									onKeyDown={e => {
										if (e.key === 'Enter') handleAddComment()
									}}
								/>
								<button
									className='btn btn-primary'
									onClick={handleAddComment}
									disabled={loadingComments}
								>
									{loadingComments ? '...' : 'ОТПРАВИТЬ'}
								</button>
							</div>
						</div>

						{/* БЛОК ИСТОРИИ ИЗМЕНЕНИЙ */}
						<div
							className='form-divider'
							style={{ margin: '30px 0 24px' }}
						></div>
						<div className='form-card' style={{ padding: '24px' }}>
							<div className='form-label' style={{ marginBottom: '16px' }}>
								ИСТОРИЯ ИЗМЕНЕНИЙ
							</div>
							{history.length === 0 ? (
								<div className='empty-state'>История пока пуста</div>
							) : (
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '10px',
									}}
								>
									{history.map((log, i) => (
										<div
											key={log.id || i}
											style={{
												display: 'flex',
												gap: '12px',
												padding: '10px 0',
												borderBottom: '1px dashed var(--border)',
												fontFamily: 'var(--font-mono)',
												fontSize: '11px',
											}}
										>
											<div
												style={{
													color: 'var(--text-muted)',
													minWidth: '140px',
												}}
											>
												{new Date(log.created_at).toLocaleString()}
											</div>
											<div style={{ color: 'var(--accent)', flex: 1 }}>
												{log.action}
											</div>
										</div>
									))}
								</div>
							)}
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
