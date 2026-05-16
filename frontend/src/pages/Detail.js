import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { getUser } from '../auth'

const Detail = () => {
	const { id } = useParams()
	const navigate = useNavigate()
	const user = getUser()

	const [incident, setIncident] = useState(null)
	const [error, setError] = useState(null)

	useEffect(() => {
		// Получаем все и находим нужный (для простоты)
		api
			.get('/api/incidents')
			.then(res => {
				const found = res.data.find(inc => inc.id.toString() === id)
				if (found) setIncident(found)
				else setError('Инцидент не найден')
			})
			.catch(() => setError('Ошибка загрузки'))
	}, [id])

	const handleDelete = () => {
		if (window.confirm('Точно удалить эту запись навсегда?')) {
			api
				.delete(`/api/incidents/${id}`)
				.then(() => navigate('/'))
				.catch(() => alert('Ошибка при удалении'))
		}
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
					<div className='subtitle'>ДЕТАЛИЗАЦИЯ ИНЦИДЕНТА</div>
				</div>
				{user.role === 'admin' && (
					<div className='header-right'>
						<button onClick={handleDelete} className='btn btn-danger'>
							УДАЛИТЬ ЗАПИСЬ
						</button>
					</div>
				)}
			</div>

			<div className='form-card'>
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
						<div
							style={{
								fontSize: '18px',
								color: 'var(--accent)',
								fontFamily: 'var(--font-mono)',
							}}
						>
							{incident.severity}
						</div>
					</div>
				</div>

				<div className='form-divider' style={{ margin: '12px 0 24px' }}></div>

				<div className='form-row'>
					<div className='form-group'>
						<div className='form-label'>ВРЕМЯ ФИКСАЦИИ</div>
						<div
							style={{
								fontFamily: 'var(--font-mono)',
								color: 'var(--text-secondary)',
							}}
						>
							{new Date(incident.date).toLocaleString()}
						</div>
					</div>
					<div className='form-group'>
						<div className='form-label'>МЕСТОПОЛОЖЕНИЕ</div>
						<div style={{ color: 'var(--text-primary)' }}>
							{incident.location}
						</div>
					</div>
				</div>

				<div className='form-row'>
					<div className='form-group'>
						<div className='form-label'>ОТВЕТСТВЕННЫЙ АГЕНТ</div>
						<div
							style={{
								fontFamily: 'var(--font-mono)',
								color: incident.assignedTo
									? 'var(--success)'
									: 'var(--text-muted)',
							}}
						>
							{incident.assignedTo || 'НЕ НАЗНАЧЕН'}
						</div>
					</div>
					<div className='form-group'>
						<div className='form-label'>ТЕКУЩИЙ СТАТУС</div>
						<div
							style={{
								display: 'inline-block',
								fontFamily: 'var(--font-mono)',
								border: '1px solid var(--border-bright)',
								padding: '4px 12px',
								color: '#fff',
								background: 'var(--bg)',
							}}
						>
							{incident.status}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default Detail
