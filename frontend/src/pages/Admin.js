import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../ToastContext'

const Admin = () => {
	const [users, setUsers] = useState([])
	const [logs, setLogs] = useState([])
	const { showToast } = useToast()

	useEffect(() => {
		loadData()
	}, [])

	const loadData = () => {
		api
			.get('/api/admin/users')
			.then(res => setUsers(res.data))
			.catch(console.error)
		api
			.get('/api/admin/logs')
			.then(res => setLogs(res.data))
			.catch(console.error)
	}

	const handleRoleChange = (id, newRole) => {
		if (window.confirm(`Подтвердите смену уровня доступа на ${newRole}`)) {
			api
				.put(`/api/admin/users/${id}/role`, { role: newRole })
				.then(() => {
					loadData() // Перезагружаем чтобы логи обновились
				})
				.catch(err => {
					showToast('Ошибка при смене роли', 'error')
				})
		}
	}

	const handleDeleteUser = id => {
		if (window.confirm('ТОЧНО удалить этого пользователя навсегда?')) {
			api
				.delete(`/api/admin/users/${id}`)
				.then(() => loadData())
				.catch(err => {
					showToast(err.response?.data?.error || 'Ошибка при удалении', 'error')
				})
		}
	}

	// Функция для скачивания файла логов
	const handleDownloadLog = async () => {
		try {
			const response = await api.get('/api/admin/audit-log/download', {
				responseType: 'blob',
			})
			// Создаем ссылку на скачивание прямо в браузере
			const url = window.URL.createObjectURL(new Blob([response.data]))
			const link = document.createElement('a')
			link.href = url
			link.setAttribute('download', 'security_audit.log')
			document.body.appendChild(link)
			link.click()
		} catch (err) {
			showToast(
				'Файл логов пока не создан. Отредактируйте или создайте инцидент, чтобы лог сгенерировался.',
				'error',
			)
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
								<div style={{ display: 'flex', gap: '10px' }}>
									<select
										className='form-select'
										style={{
											width: '130px',
											padding: '4px 8px',
											fontSize: '10px',
										}}
										value={u.role}
										onChange={e => handleRoleChange(u.id, e.target.value)}
									>
										<option value='user'>USER</option>
										<option value='investigator'>INVESTIGATOR</option>
										<option value='admin'>ADMIN</option>
									</select>
									<button
										onClick={() => handleDeleteUser(u.id)}
										className='btn btn-danger'
										style={{ padding: '4px 8px', fontSize: '10px' }}
									>
										УДАЛИТЬ
									</button>
								</div>
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
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
						}}
					>
						<div className='form-label'>ЖУРНАЛ БЕЗОПАСНОСТИ</div>

						{/* КНОПКА СКАЧИВАНИЯ */}
						<button
							onClick={handleDownloadLog}
							className='btn btn-primary'
							style={{
								fontSize: '10px',
								padding: '4px 10px',
								fontWeight: 'bold',
							}}
						>
							СКАЧАТЬ .LOG ФАЙЛ
						</button>
					</div>
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
										paddingBottom: '10px',
										marginBottom: '10px',
									}}
								>
									<div
										style={{ color: 'var(--text-muted)', marginBottom: '4px' }}
									>
										[{new Date(log.created_at).toLocaleString()}]
									</div>
									<div style={{ color: 'var(--accent)', marginTop: '2px' }}>
										{log.action}
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
