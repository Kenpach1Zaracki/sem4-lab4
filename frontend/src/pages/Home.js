import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { getUser, removeUser } from '../auth'

const Home = () => {
	const [incidents, setIncidents] = useState([])
	const [error, setError] = useState(null)

	const user = getUser()
	const navigate = useNavigate()

	useEffect(() => {
		api
			.get('/api/incidents')
			.then(res => setIncidents(res.data))
			.catch(err => setError('Не удалось загрузить данные из БД'))
	}, [])

	const handleLogout = () => {
		removeUser()
		navigate('/login')
	}

	// Привязываем уровни угрозы к твоим классам (low, mid, high)
	const getSeverityClass = sev => {
		if (sev === 'Высокий' || sev === 'Критический') return 'high'
		if (sev === 'Средний') return 'mid'
		return 'low'
	}

	// Привязываем статусы (reviewing, investigating, resolved)
	const getStatusClass = status => {
		if (status === 'Закрыт') return 'resolved'
		if (status === 'В работе') return 'investigating'
		return 'reviewing'
	}

	return (
		<div className='page'>
			<header className='header'>
				<div className='header-left'>
					<h1>
						SAFE<span>TRACK</span>
					</h1>
					<div className='subtitle'>Терминал мониторинга инцидентов</div>
				</div>
				<div className='header-right'>
					<div className='user-badge'>
						<span className='user-name'>{user.name}</span>
						<span className={`role-tag ${user.role}`}>{user.role}</span>
					</div>
					<div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
						{user.role === 'admin' && (
							<Link to='/admin' className='btn btn-ghost'>
								АДМИНКА
							</Link>
						)}
						<button onClick={handleLogout} className='btn btn-logout'>
							ВЫХОД
						</button>
					</div>
				</div>
			</header>

			<main>
				{error && <div className='server-error'>{error}</div>}

				<div className='toolbar'>
					<div className='toolbar-left'>
						БД ИНЦИДЕНТОВ // ЗАПИСЕЙ: {incidents.length}
					</div>
					{user.role !== 'user' && (
						<Link to='/create' className='btn btn-primary'>
							+ НОВЫЙ ИНЦИДЕНТ
						</Link>
					)}
				</div>

				<div className='incident-list'>
					{incidents.length === 0 ? (
						<div className='empty-state'>Нет активных инцидентов</div>
					) : (
						incidents.map(inc => (
							<div
								key={inc.id}
								className='incident-item'
								onClick={() => navigate(`/incident/${inc.id}`)}
							>
								<div
									className={`severity-bar ${getSeverityClass(inc.severity)}`}
								></div>

								<div className='incident-main'>
									<div className='incident-type'>{inc.type}</div>
									<div className='incident-meta'>
										<span className='meta-tag'>
											{new Date(inc.date).toLocaleDateString()}
										</span>
										<span className='meta-tag'>{inc.location}</span>
									</div>
								</div>

								<div className='incident-actions'>
									<span
										className={`status-badge ${getStatusClass(inc.status)}`}
									>
										{inc.status}
									</span>
								</div>
							</div>
						))
					)}
				</div>
			</main>
		</div>
	)
}

export default Home
