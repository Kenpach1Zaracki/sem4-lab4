import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const CorrelationAlerts = () => {
	const [alerts, setAlerts] = useState([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		loadAlerts()
	}, [])

	const loadAlerts = () => {
		api
			.get('/api/correlation/alerts')
			.then(res => setAlerts(res.data))
			.catch(console.error)
			.finally(() => setLoading(false))
	}

	const handleStatus = (id, status) => {
		api
			.put(`/api/correlation/alerts/${id}`, { status })
			.then(() => loadAlerts())
			.catch(console.error)
	}

	const riskColors = {
		low: 'var(--accent)',
		medium: 'var(--warning)',
		high: '#ff6b35',
		critical: 'var(--danger)',
	}

	if (loading)
		return (
			<div className='page'>
				<div className='loading'>ЗАГРУЗКА АЛЕРТОВ...</div>
			</div>
		)

	return (
		<div className='page'>
			<Link to='/' className='back-link'>
				ТЕРМИНАЛ
			</Link>
			<div className='form-page-title'>
				КОРРЕЛЯЦИЯ <span>ИНЦИДЕНТОВ</span>
			</div>
			<div className='form-divider'></div>

			{alerts.length === 0 ? (
				<div
					className='form-card'
					style={{ padding: '40px', textAlign: 'center' }}
				>
					<div
						className='empty-state'
						style={{ border: 'none', fontSize: '14px' }}
					>
						АЛЕРТОВ НЕ ОБНАРУЖЕНО
						<br />
						<span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
							Создайте несколько похожих инцидентов, чтобы увидеть корреляцию
						</span>
					</div>
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
					{alerts.map(alert => (
						<div
							key={alert.id}
							className='form-card'
							style={{ padding: '20px' }}
						>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'flex-start',
									marginBottom: '12px',
								}}
							>
								<div>
									<div
										style={{
											fontFamily: 'var(--font-head)',
											fontSize: '16px',
											color: 'var(--text-primary)',
											marginBottom: '4px',
										}}
									>
										{alert.title}
									</div>
									<div
										style={{
											fontFamily: 'var(--font-mono)',
											fontSize: '11px',
											color: 'var(--text-muted)',
										}}
									>
										{new Date(alert.first_seen).toLocaleString()} →{' '}
										{new Date(alert.last_seen).toLocaleString()}
									</div>
								</div>
								<div
									style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
								>
									<span
										style={{
											fontFamily: 'var(--font-mono)',
											fontSize: '14px',
											fontWeight: 'bold',
											color:
												riskColors[alert.risk_level] || 'var(--text-primary)',
										}}
									>
										{alert.risk_score}/100
									</span>
								</div>
							</div>
							<div
								style={{
									fontFamily: 'var(--font-mono)',
									fontSize: '12px',
									color: 'var(--text-secondary)',
									marginBottom: '12px',
								}}
							>
								{alert.description}
							</div>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
								}}
							>
								<span
									style={{
										fontFamily: 'var(--font-mono)',
										fontSize: '11px',
										color: 'var(--accent)',
									}}
								>
									ИНЦИДЕНТОВ: {alert.incident_count} | СТАТУС: {alert.status}
								</span>
								<div style={{ display: 'flex', gap: '6px' }}>
									{alert.status === 'new' && (
										<button
											className='btn btn-primary'
											style={{ fontSize: '10px', padding: '4px 10px' }}
											onClick={() => handleStatus(alert.id, 'in_progress')}
										>
											В РАБОТУ
										</button>
									)}
									{alert.status !== 'resolved' && (
										<button
											className='btn btn-ghost'
											style={{ fontSize: '10px', padding: '4px 10px' }}
											onClick={() => handleStatus(alert.id, 'resolved')}
										>
											ЗАКРЫТЬ
										</button>
									)}
									<button
										className='btn btn-danger'
										style={{ fontSize: '10px', padding: '4px 10px' }}
										onClick={() => {
											if (window.confirm('Удалить этот алерт?')) {
												api
													.delete(`/api/correlation/alerts/${alert.id}`)
													.then(() => loadAlerts())
													.catch(console.error)
											}
										}}
									>
										УДАЛИТЬ
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

export default CorrelationAlerts
