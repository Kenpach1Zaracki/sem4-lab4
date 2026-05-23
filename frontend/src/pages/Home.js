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

	const getSeverityClass = sev => {
		if (sev === 'Высокий' || sev === 'Критический') return 'high'
		if (sev === 'Средний') return 'mid'
		return 'low'
	}

	const getStatusClass = status => {
		if (status === 'Закрыт') return 'resolved'
		if (status === 'В работе') return 'investigating'
		return 'reviewing'
	}

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
						<Link to='/dashboard' className='btn btn-ghost'>
							ДАШБОРД
						</Link>
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

				<div className='toolbar' style={{ display: 'block' }}>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
						}}
					>
						<div className='toolbar-left'>
							БД ИНЦИДЕНТОВ // ЗАПИСЕЙ: {filteredIncidents.length}
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
