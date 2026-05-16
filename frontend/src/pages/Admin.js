import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const Admin = () => {
	const [users, setUsers] = useState([])
	const [logs, setLogs] = useState([])

	useEffect(() => {
		api
			.get('/api/admin/users')
			.then(res => setUsers(res.data))
			.catch(console.error)
		api
			.get('/api/admin/logs')
			.then(res => setLogs(res.data))
			.catch(console.error)
	}, [])

	const handleRoleChange = (id, newRole) => {
		if (window.confirm(`Подтвердите смену уровня доступа на ${newRole}`)) {
			api
				.put(`/api/admin/users/${id}/role`, { role: newRole })
				.then(() =>
					setUsers(users.map(u => (u.id === id ? { ...u, role: newRole } : u))),
				)
				.catch(err => alert('Ошибка при смене роли'))
		}
	}

	return (
		<div className='page'>
			<Link to='/' className='back-link'>
				ТЕРМИНАЛ
			</Link>

			<div className='form-page-title'>
				СИСТЕМА <span>УПРАВЛЕНИЯ</span>
			</div>
			<div className='form-divider'></div>

			<div className='form-row'>
				{/* ЛЕВАЯ КОЛОНКА: АГЕНТЫ */}
				<div className='form-card' style={{ padding: '24px' }}>
					<div className='form-label'>СПИСОК АГЕНТОВ</div>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '8px',
							marginTop: '16px',
						}}
					>
						{users.map(u => (
							<div
								key={u.id}
								style={{
									background: 'var(--bg)',
									border: '1px solid var(--border)',
									padding: '12px',
									borderRadius: '2px',
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
								}}
							>
								<div>
									<div
										style={{ fontWeight: '600', color: 'var(--text-primary)' }}
									>
										{u.name}
									</div>
									<div
										style={{
											fontFamily: 'var(--font-mono)',
											fontSize: '10px',
											color: 'var(--text-muted)',
										}}
									>
										{u.email}
									</div>
								</div>
								<select
									className='form-select'
									style={{
										width: '140px',
										padding: '6px 10px',
										fontSize: '11px',
										fontFamily: 'var(--font-mono)',
										textTransform: 'uppercase',
									}}
									value={u.role}
									onChange={e => handleRoleChange(u.id, e.target.value)}
								>
									<option value='user'>USER</option>
									<option value='investigator'>INVESTIGATOR</option>
									<option value='admin'>ADMIN</option>
								</select>
							</div>
						))}
					</div>
				</div>

				{/* ПРАВАЯ КОЛОНКА: ЛОГИ */}
				<div
					className='form-card'
					style={{
						padding: '24px',
						display: 'flex',
						flexDirection: 'column',
						maxHeight: '600px',
					}}
				>
					<div className='form-label'>ЖУРНАЛ БЕЗОПАСНОСТИ</div>
					<div
						style={{
							overflowY: 'auto',
							marginTop: '16px',
							paddingRight: '8px',
							fontFamily: 'var(--font-mono)',
							fontSize: '11px',
						}}
					>
						{logs.length === 0 ? (
							<div className='empty-state'>ЖУРНАЛ ПУСТ</div>
						) : (
							logs.map(log => (
								<div
									key={log.id}
									style={{
										borderBottom: '1px dashed var(--border)',
										paddingBottom: '12px',
										marginBottom: '12px',
									}}
								>
									<div
										style={{ color: 'var(--text-muted)', marginBottom: '4px' }}
									>
										[{new Date(log.created_at).toLocaleString()}]
									</div>
									<div style={{ color: 'var(--success)' }}>
										<span style={{ color: 'var(--accent)' }}>
											{log.created_by || 'SYSTEM'}
										</span>{' '}
										// ИНЦИДЕНТ #{log.incident_id}
									</div>
									<div
										style={{ color: 'var(--text-secondary)', marginTop: '2px' }}
									>
										СТАТУС: {log.old_status || 'ОТКРЫТ'} ➔{' '}
										<span style={{ color: '#fff' }}>{log.new_status}</span>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

export default Admin
