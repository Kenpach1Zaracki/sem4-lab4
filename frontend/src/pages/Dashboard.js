import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const Timeline = () => {
	const [timeline, setTimeline] = useState([])

	useEffect(() => {
		api
			.get('/api/analytics/timeline')
			.then(res => setTimeline(res.data))
			.catch(console.error)
	}, [])

	const maxCount = Math.max(...timeline.map(t => parseInt(t.count)), 1)

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'flex-end',
				gap: '8px',
				height: '150px',
				paddingTop: '10px',
			}}
		>
			{timeline.length === 0 ? (
				<div className='empty-state' style={{ width: '100%' }}>
					Нет данных за 24 часа
				</div>
			) : (
				timeline.map((item, i) => (
					<div
						key={i}
						style={{
							flex: 1,
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							height: '100%',
						}}
					>
						<div
							style={{
								width: '100%',
								height: `${(parseInt(item.count) / maxCount) * 100}%`,
								background:
									parseInt(item.suspicious_count) > 0
										? 'var(--danger)'
										: 'var(--accent)',
								border: '1px solid var(--border)',
								minHeight: '4px',
								transition: 'height 0.3s ease',
							}}
							title={`${item.count} событий, ${item.suspicious_count} подозрительных`}
						></div>
						<div
							style={{
								fontFamily: 'var(--font-mono)',
								fontSize: '8px',
								color: 'var(--text-muted)',
								marginTop: '4px',
								transform: 'rotate(-45deg)',
								whiteSpace: 'nowrap',
							}}
						>
							{new Date(item.hour).getHours()}:00
						</div>
					</div>
				))
			)}
		</div>
	)
}

const Dashboard = () => {
	const [data, setData] = useState(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		api
			.get('/api/analytics/summary')
			.then(res => setData(res.data))
			.catch(console.error)
			.finally(() => setLoading(false))
	}, [])

	if (loading)
		return (
			<div className='page'>
				<div className='loading'>ЗАГРУЗКА АНАЛИТИКИ...</div>
			</div>
		)
	if (!data)
		return (
			<div className='page'>
				<div className='server-error'>Ошибка загрузки данных</div>
			</div>
		)

	const riskColors = {
		low: 'var(--accent)',
		medium: 'var(--warning)',
		high: '#ff6b35',
		critical: 'var(--danger)',
	}

	const riskLabels = {
		low: 'НИЗКИЙ',
		medium: 'СРЕДНИЙ',
		high: 'ВЫСОКИЙ',
		critical: 'КРИТИЧЕСКИЙ',
	}

	const maxRiskCount = Math.max(
		...(data.risk_distribution || []).map(r => parseInt(r.count)),
		1,
	)

	return (
		<div className='page'>
			<Link to='/' className='back-link'>
				ТЕРМИНАЛ
			</Link>

			<div className='form-page-title'>
				ЦЕНТР <span>АНАЛИТИКИ</span>
			</div>
			<div className='form-divider'></div>

			{/* 4 КАРТОЧКИ */}
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(4, 1fr)',
					gap: '16px',
					marginBottom: '30px',
				}}
			>
				{[
					{
						label: 'ВСЕГО ИНЦИДЕНТОВ',
						value: data.total_incidents,
						color: 'var(--text-primary)',
					},
					{
						label: 'ПОДОЗРИТЕЛЬНЫХ',
						value: data.suspicious_incidents,
						color: 'var(--warning)',
					},
					{
						label: 'КРИТИЧЕСКИХ',
						value: data.critical_incidents,
						color: 'var(--danger)',
					},
					{
						label: 'АКТИВНЫХ',
						value: data.active_incidents,
						color: 'var(--accent)',
					},
				].map(card => (
					<div
						key={card.label}
						className='form-card'
						style={{ padding: '20px', textAlign: 'center' }}
					>
						<div className='form-label'>{card.label}</div>
						<div
							style={{
								fontFamily: 'var(--font-head)',
								fontSize: '42px',
								color: card.color,
								marginTop: '8px',
							}}
						>
							{card.value}
						</div>
					</div>
				))}
			</div>

			{/* СРЕДНИЙ РИСК */}
			<div
				className='form-card'
				style={{ padding: '20px', marginBottom: '24px', textAlign: 'center' }}
			>
				<div className='form-label'>СРЕДНИЙ УРОВЕНЬ РИСКА</div>
				<div
					style={{
						fontFamily: 'var(--font-head)',
						fontSize: '56px',
						color:
							data.average_risk_score >= 50 ? 'var(--danger)' : 'var(--accent)',
						marginTop: '8px',
					}}
				>
					{data.average_risk_score}/100
				</div>
			</div>

			{/* РАСПРЕДЕЛЕНИЕ + ТОП-5 */}
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: '16px',
					marginBottom: '30px',
				}}
			>
				<div className='form-card' style={{ padding: '24px' }}>
					<div className='form-label' style={{ marginBottom: '16px' }}>
						РАСПРЕДЕЛЕНИЕ РИСКОВ
					</div>
					{(data.risk_distribution || []).length === 0 ? (
						<div className='empty-state'>Нет данных</div>
					) : (
						(data.risk_distribution || []).map(item => (
							<div key={item.risk_level} style={{ marginBottom: '12px' }}>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										fontFamily: 'var(--font-mono)',
										fontSize: '11px',
										marginBottom: '4px',
									}}
								>
									<span style={{ color: riskColors[item.risk_level] }}>
										{riskLabels[item.risk_level] || item.risk_level}
									</span>
									<span style={{ color: 'var(--text-muted)' }}>
										{item.count}
									</span>
								</div>
								<div
									style={{
										background: 'var(--bg)',
										height: '8px',
										border: '1px solid var(--border)',
									}}
								>
									<div
										style={{
											background:
												riskColors[item.risk_level] || 'var(--text-muted)',
											height: '100%',
											width: `${(parseInt(item.count) / maxRiskCount) * 100}%`,
										}}
									></div>
								</div>
							</div>
						))
					)}
				</div>

				<div className='form-card' style={{ padding: '24px' }}>
					<div className='form-label' style={{ marginBottom: '16px' }}>
						ТОП-5 ТИПОВ
					</div>
					{(data.top_types || []).length === 0 ? (
						<div className='empty-state'>Нет данных</div>
					) : (
						(data.top_types || []).map((item, i) => (
							<div
								key={item.type}
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									padding: '10px 0',
									borderBottom: '1px dashed var(--border)',
									fontFamily: 'var(--font-mono)',
									fontSize: '12px',
								}}
							>
								<span style={{ color: 'var(--text-primary)' }}>
									<span style={{ color: 'var(--accent)', marginRight: '8px' }}>
										0{i + 1}
									</span>
									{item.type}
								</span>
								<span style={{ color: 'var(--text-muted)' }}>
									{item.count} шт.
								</span>
							</div>
						))
					)}
				</div>
			</div>

			{/* ТОП-5 ЛОКАЦИЙ */}
			<div className='form-card' style={{ padding: '24px' }}>
				<div className='form-label' style={{ marginBottom: '16px' }}>
					ТОП-5 ЛОКАЦИЙ
				</div>
				{(data.top_locations || []).length === 0 ? (
					<div className='empty-state'>Нет данных</div>
				) : (
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(5, 1fr)',
							gap: '12px',
						}}
					>
						{(data.top_locations || []).map(item => (
							<div
								key={item.location}
								style={{
									background: 'var(--bg)',
									border: '1px solid var(--border)',
									padding: '16px',
									textAlign: 'center',
								}}
							>
								<div
									style={{
										fontFamily: 'var(--font-head)',
										fontSize: '28px',
										color: 'var(--accent)',
									}}
								>
									{item.count}
								</div>
								<div
									style={{
										fontFamily: 'var(--font-mono)',
										fontSize: '10px',
										color: 'var(--text-secondary)',
										marginTop: '6px',
									}}
								>
									{item.location}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
			{/* ТАЙМЛАЙН */}
			<div className='form-card' style={{ padding: '24px', marginTop: '24px' }}>
				<div className='form-label' style={{ marginBottom: '16px' }}>
					АКТИВНОСТЬ ЗА 24 ЧАСА
				</div>
				<Timeline />
			</div>
		</div>
	)
}

export default Dashboard
