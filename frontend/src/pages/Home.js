import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { getUser, removeUser } from '../auth'

const Home = () => {
	const [incidents, setIncidents] = useState([])
	const [error, setError] = useState(null)

	// Состояния для фильтров и пагинации
	const [filterStatus, setFilterStatus] = useState('all')
	const [filterSeverity, setFilterSeverity] = useState('all')
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 5 // Показывать 5 элементов на страницу

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

	// Обновленная функция getSeverityClass с учетом riskLevel
	const getSeverityClass = (sev, riskLevel) => {
		if (riskLevel === 'critical') return 'high'
		if (riskLevel === 'high') return 'mid'
		if (sev === 'Критический' || sev === 'Высокий') return 'high'
		if (sev === 'Средний') return 'mid'
		return 'low'
	}

	const getStatusClass = status => {
		if (status === 'Закрыт') return 'resolved'
		if (status === 'В работе') return 'investigating'
		return 'reviewing'
	}

	// Подсчет статистики для шапки
	const totalIncidents = incidents.length
	const suspiciousCount = incidents.filter(i => i.is_suspicious).length
	const criticalCount = incidents.filter(
		i => i.risk_level === 'critical',
	).length

	// 1. Фильтрация данных
	const filteredIncidents = incidents.filter(inc => {
		const matchStatus = filterStatus === 'all' || inc.status === filterStatus
		const matchSeverity =
			filterSeverity === 'all' || inc.severity === filterSeverity
		return matchStatus && matchSeverity
	})

	// 2. Пагинация данных
	const indexOfLastItem = currentPage * itemsPerPage
	const indexOfFirstItem = indexOfLastItem - itemsPerPage
	const currentItems = filteredIncidents.slice(
		indexOfFirstItem,
		indexOfLastItem,
	)
	const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage)

	// Сброс страницы при изменении фильтров
	useEffect(() => {
		setCurrentPage(1)
	}, [filterStatus, filterSeverity])

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
						{(user.role === 'admin' || user.role === 'investigator') && (
							<Link to='/dashboard' className='btn btn-ghost'>
								ДАШБОРД
							</Link>
						)}
						{(user.role === 'admin' || user.role === 'investigator') && (
							<Link to='/correlation' className='btn btn-ghost'>
								АЛЕРТЫ
							</Link>
						)}
						{user.role === 'admin' && (
							<Link to='/admin' className='btn btn-ghost'>
								АДМИНКА
							</Link>
						)}
						{(user.role === 'admin' || user.role === 'investigator') && (
							<Link to='/dataset' className='btn btn-ghost'>
								ИМПОРТ CSV
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

				<div className='toolbar' style={{ display: 'block' }}>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
						}}
					>
						<div className='toolbar-left'>
							БД ИНЦИДЕНТОВ // ВСЕГО: {totalIncidents} | ПОДОЗРИТЕЛЬНЫХ:{' '}
							{suspiciousCount} | КРИТИЧЕСКИХ: {criticalCount}
						</div>
						{user.role !== 'user' && (
							<Link to='/create' className='btn btn-primary'>
								+ НОВЫЙ ИНЦИДЕНТ
							</Link>
						)}
					</div>

					{/* Блок фильтров */}
					<div className='filters'>
						<select
							className='form-select'
							value={filterStatus}
							onChange={e => setFilterStatus(e.target.value)}
						>
							<option value='all'>Все статусы</option>
							<option value='Открыт'>Открыт</option>
							<option value='В работе'>В работе</option>
							<option value='Закрыт'>Закрыт</option>
						</select>

						<select
							className='form-select'
							value={filterSeverity}
							onChange={e => setFilterSeverity(e.target.value)}
						>
							<option value='all'>Любой уровень</option>
							<option value='Низкий'>Низкий</option>
							<option value='Средний'>Средний</option>
							<option value='Высокий'>Высокий</option>
							<option value='Критический'>Критический</option>
						</select>
					</div>
				</div>

				<div className='incident-list'>
					{currentItems.length === 0 ? (
						<div className='empty-state'>Нет записей по вашему запросу</div>
					) : (
						currentItems.map(inc => (
							<div
								key={inc.id}
								className='incident-item'
								onClick={() => navigate(`/incident/${inc.id}`)}
							>
								{/* Обновленный вызов getSeverityClass с передачей risk_level */}
								<div
									className={`severity-bar ${getSeverityClass(inc.severity, inc.risk_level)}`}
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

								<div
									className='incident-actions'
									style={{
										display: 'flex',
										gap: '6px',
										flexDirection: 'column',
										alignItems: 'flex-end',
									}}
								>
									<span
										className={`status-badge ${getStatusClass(inc.status)}`}
									>
										{inc.status}
									</span>
									{inc.risk_level && (
										<span
											className={`status-badge ${
												inc.risk_level === 'critical'
													? 'reviewing'
													: inc.risk_level === 'high'
														? 'investigating'
														: inc.risk_level === 'medium'
															? 'reviewing'
															: 'resolved'
											}`}
											style={{
												borderColor:
													inc.risk_level === 'critical'
														? 'var(--danger)'
														: inc.risk_level === 'high'
															? '#ff6b35'
															: inc.risk_level === 'medium'
																? 'var(--warning)'
																: 'var(--accent)',
												color:
													inc.risk_level === 'critical'
														? 'var(--danger)'
														: inc.risk_level === 'high'
															? '#ff6b35'
															: inc.risk_level === 'medium'
																? 'var(--warning)'
																: 'var(--accent)',
											}}
										>
											RISK: {inc.risk_score || '?'}
										</span>
									)}
								</div>
							</div>
						))
					)}
				</div>

				{/* Блок пагинации */}
				{totalPages > 1 && (
					<div className='pagination'>
						<button
							className='btn btn-ghost'
							disabled={currentPage === 1}
							onClick={() => setCurrentPage(prev => prev - 1)}
						>
							НАЗАД
						</button>
						<span>
							{' '}
							СТРАНИЦА {currentPage} ИЗ {totalPages}{' '}
						</span>
						<button
							className='btn btn-ghost'
							disabled={currentPage === totalPages}
							onClick={() => setCurrentPage(prev => prev + 1)}
						>
							ВПЕРЕД
						</button>
					</div>
				)}
			</main>
		</div>
	)
}

export default Home
