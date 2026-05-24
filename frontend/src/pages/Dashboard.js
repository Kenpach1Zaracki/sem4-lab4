/* eslint-disable react-hooks/exhaustive-deps */

import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { getUser } from '../auth'

const Timeline = () => {
	const [timeline, setTimeline] = useState([])

	useEffect(() => {
		api
			.get('/api/analytics/timeline')
			.then(res => setTimeline(res.data))
			.catch(() => {})
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

// Компонент круговой диаграммы
const RiskPieChart = ({ data }) => {
	const canvasRef = useRef(null)
	const total = data.reduce((sum, item) => sum + parseInt(item.count), 0) || 1

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		const w = canvas.width
		const h = canvas.height
		const cx = w / 2
		const cy = h / 2
		const r = Math.min(cx, cy) - 4

		ctx.clearRect(0, 0, w, h)

		const colors = {
			low: '#00ffcc',
			medium: '#ffb800',
			high: '#ff6b35',
			critical: '#ff3b3b',
		}

		let startAngle = -Math.PI / 2
		data.forEach(item => {
			const slice = (parseInt(item.count) / total) * Math.PI * 2
			ctx.beginPath()
			ctx.moveTo(cx, cy)
			ctx.arc(cx, cy, r, startAngle, startAngle + slice)
			ctx.closePath()
			ctx.fillStyle = colors[item.risk_level] || '#555'
			ctx.fill()
			ctx.strokeStyle = '#111'
			ctx.lineWidth = 2
			ctx.stroke()
			startAngle += slice
		})

		// Внутренний круг (пончик)
		ctx.beginPath()
		ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2)
		ctx.fillStyle = '#0a0a0a'
		ctx.fill()

		// Текст в центре
		ctx.fillStyle = '#fff'
		ctx.font = 'bold 18px Orbitron'
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText(total, cx, cy)
	}, [data, total])

	return (
		<canvas
			ref={canvasRef}
			width='160'
			height='160'
			style={{ width: '160px', height: '160px' }}
		/>
	)
}

const Dashboard = () => {
	const [data, setData] = useState(null)
	const [loading, setLoading] = useState(true)
	const [logs, setLogs] = useState([])
	const user = getUser()

	useEffect(() => {
		api
			.get('/api/analytics/summary')
			.then(res => setData(res.data))
			.catch(() => {})
			.finally(() => setLoading(false))
	}, [])

	useEffect(() => {
		if (user.role === 'admin') {
			api
				.get('/api/admin/logs')
				.then(res => setLogs(res.data.slice(0, 5)))
				.catch(() => {})
		}
	}, [user.role])

	const handleExport = () => {
		api
			.get('/api/dataset/export', { responseType: 'blob' })
			.then(res => {
				const url = window.URL.createObjectURL(new Blob([res.data]))
				const link = document.createElement('a')
				link.href = url
				link.setAttribute('download', 'incidents_export.csv')
				document.body.appendChild(link)
				link.click()
				document.body.removeChild(link)
				window.URL.revokeObjectURL(url)
			})
			.catch(() => {})
	}

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

	return (
		<div className='page'>
			<Link to='/' className='back-link'>
				ТЕРМИНАЛ
			</Link>

			<button
				onClick={handleExport}
				className='btn btn-primary'
				style={{ float: 'right', marginTop: '-10px' }}
			>
				ЭКСПОРТ CSV
			</button>

			<div className='form-page-title'>
				ЦЕНТР <span>АНАЛИТИКИ</span>
			</div>
			<div className='form-divider'></div>

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
						<div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
							<RiskPieChart data={data.risk_distribution} />
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: '10px',
								}}
							>
								{(data.risk_distribution || []).map(item => (
									<div
										key={item.risk_level}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '8px',
										}}
									>
										<div
											style={{
												width: '14px',
												height: '14px',
												background:
													riskColors[item.risk_level] || 'var(--text-muted)',
												border: '1px solid var(--border)',
											}}
										></div>
										<span
											style={{
												fontFamily: 'var(--font-mono)',
												fontSize: '12px',
												color: 'var(--text-primary)',
											}}
										>
											{riskLabels[item.risk_level] || item.risk_level}:{' '}
											{item.count}
										</span>
									</div>
								))}
							</div>
						</div>
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
										{String(i + 1).padStart(2, '0')}
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

			<div className='form-card' style={{ padding: '24px', marginTop: '24px' }}>
				<div className='form-label' style={{ marginBottom: '16px' }}>
					АКТИВНОСТЬ ЗА 24 ЧАСА
				</div>
				<Timeline />
			</div>

			{user.role === 'admin' && (
				<div
					className='form-card'
					style={{ padding: '24px', marginTop: '24px' }}
				>
					<div className='form-label' style={{ marginBottom: '16px' }}>
						ПОСЛЕДНИЕ ДЕЙСТВИЯ
					</div>
					{logs.length === 0 ? (
						<div className='empty-state'>Нет записей</div>
					) : (
						logs.map(log => (
							<div
								key={log.id}
								style={{
									borderBottom: '1px dashed var(--border)',
									padding: '8px 0',
									fontFamily: 'var(--font-mono)',
									fontSize: '11px',
								}}
							>
								<span style={{ color: 'var(--text-muted)' }}>
									[{new Date(log.created_at).toLocaleString()}]
								</span>
								<span style={{ color: 'var(--accent)', marginLeft: '8px' }}>
									{log.action}
								</span>
							</div>
						))
					)}
				</div>
			)}
		</div>
	)
}

export default Dashboard
