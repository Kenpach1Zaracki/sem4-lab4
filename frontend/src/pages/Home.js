import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const Home = () => {
	const [incidents, setIncidents] = useState([])
	const [error, setError] = useState(null)
	const [role, setRole] = useState('')
	
	// Состояния для фильтров
	const [filterStatus, setFilterStatus] = useState('Все')
	const [filterSeverity, setFilterSeverity] = useState('Все')

	useEffect(() => {
		const token = localStorage.getItem('token')
		if (token) {
			const payload = JSON.parse(atob(token.split('.')[1]))
			setRole(payload.role)
		}

		api.get('/api/incidents')
			.then(res => setIncidents(res.data))
			.catch(err => {
				console.error(err)
				setError('Не удалось загрузить данные из БД')
			})
	}, [])

	const handleLogout = () => {
		localStorage.removeItem('token')
		window.location.reload()
	}

	// Вычисляем статистику для Дашборда
	const totalIncidents = incidents.length;
	const openIncidents = incidents.filter(i => i.status !== 'Закрыт').length;
	const criticalIncidents = incidents.filter(i => i.severity === 'Критический' || i.severity === 'Высокий').length;

	// Фильтруем инциденты перед отображением
	const filteredIncidents = incidents.filter(inc => {
		const matchStatus = filterStatus === 'Все' || inc.status === filterStatus;
		const matchSeverity = filterSeverity === 'Все' || inc.severity === filterSeverity;
		return matchStatus && matchSeverity;
	});

	return (
		<div className='page'>
			<div className='header'>
				<div className='logo'>SAFETRACK</div>
				<div className='header-info'>Терминал мониторинга инцидентов</div>
			</div>

			<div className='controls'>
				<div className='user-badge'>Доступ: {role.toUpperCase()}</div>
				<div style={{ display: 'flex', gap: '10px' }}>
					{role === 'admin' && (
						<Link to='/admin' className='btn btn-warning'>
							АДМИНКА
						</Link>
					)}
					<button onClick={handleLogout} className='btn btn-danger'>
						ВЫХОД
					</button>
				</div>
			</div>

			<div className='main-content'>
				{error ? (
					<div className='server-error'>{error}</div>
				) : (
					<>
						{/* ДАШБОРД (Аналитика) */}
						<div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
							<div className='form-card' style={{ flex: 1, padding: '15px', textAlign: 'center', borderLeft: '4px solid var(--accent)' }}>
								<div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ВСЕГО ЗАПИСЕЙ</div>
								<div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalIncidents}</div>
							</div>
							<div className='form-card' style={{ flex: 1, padding: '15px', textAlign: 'center', borderLeft: '4px solid var(--warning)' }}>
								<div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>АКТИВНЫЕ (В РАБОТЕ)</div>
								<div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning)' }}>{openIncidents}</div>
							</div>
							<div className='form-card' style={{ flex: 1, padding: '15px', textAlign: 'center', borderLeft: '4px solid var(--danger)' }}>
								<div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>КРИТИЧЕСКИЕ УГРОЗЫ</div>
								<div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--danger)' }}>{criticalIncidents}</div>
							</div>
						</div>

						<div className='panel-header'>
							<div className='panel-title'>БД ИНЦИДЕНТОВ</div>
							
							{/* ФИЛЬТРЫ */}
							<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
								<select className='form-select' style={{ width: '150px', padding: '6px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
									<option value='Все'>Все статусы</option>
									<option value='Открыт'>Открыт</option>
									<option value='В работе'>В работе</option>
									<option value='Закрыт'>Закрыт</option>
								</select>
								<select className='form-select' style={{ width: '150px', padding: '6px' }} value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
									<option value='Все'>Все уровни</option>
									<option value='Низкий'>Низкий</option>
									<option value='Средний'>Средний</option>
									<option value='Высокий'>Высокий</option>
									<option value='Критический'>Критический</option>
								</select>

								{(role === 'admin' || role === 'investigator') && (
									<Link to='/create' className='btn btn-primary'>
										+ НОВЫЙ ИНЦИДЕНТ
									</Link>
								)}
							</div>
						</div>

						<div className='table-container'>
							<table className='data-table'>
								<thead>
									<tr>
										<th>ID</th>
										<th>ТИП УГРОЗЫ</th>
										<th>ЛОКАЦИЯ</th>
										<th>УРОВЕНЬ</th>
										<th>СТАТУС</th>
										<th>ОТВЕТСТВЕННЫЙ</th>
										<th>ДЕЙСТВИЯ</th>
									</tr>
								</thead>
								<tbody>
									{filteredIncidents.length === 0 ? (
										<tr>
											<td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Ничего не найдено</td>
										</tr>
									) : (
										filteredIncidents.map(inc => (
											<tr key={inc.id}>
												<td className='mono'>#{inc.id}</td>
												<td>{inc.type}</td>
												<td>{inc.location}</td>
												<td>
													<span className={`badge badge-${
														inc.severity === 'Критический' ? 'danger' :
														inc.severity === 'Высокий' ? 'danger' :
														inc.severity === 'Средний' ? 'warning' : 'success'
													}`}>
														{inc.severity.toUpperCase()}
													</span>
												</td>
												<td className='mono'>{inc.status}</td>
												<td className='mono' style={{ fontSize: '11px' }}>{inc.assignedTo || 'НЕ НАЗНАЧЕН'}</td>
												<td>
													<Link to={`/incident/${inc.id}`} className='btn btn-secondary' style={{ padding: '4px 8px', fontSize: '10px' }}>
														ОТКРЫТЬ
													</Link>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</>
				)}
			</div>
		</div>
	)
}

export default Home
