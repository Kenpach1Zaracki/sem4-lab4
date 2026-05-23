import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../ToastContext'

const Dataset = () => {
	const [file, setFile] = useState(null)
	const [loading, setLoading] = useState(false)
	const [result, setResult] = useState(null)
	const { showToast } = useToast()

	const handleImport = () => {
		if (!file) return
		setLoading(true)
		const formData = new FormData()
		formData.append('file', file)

		api
			.post('/api/dataset/import', formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			})
			.then(res => {
				setResult(res.data)
				showToast(`Импортировано: ${res.data.imported} инцидентов`, 'success')
			})
			.catch(err =>
				showToast(err.response?.data?.error || 'Ошибка импорта', 'error'),
			)
			.finally(() => setLoading(false))
	}

	const handleDownloadSample = () => {
		api.get('/api/dataset/sample', { responseType: 'blob' }).then(res => {
			const url = window.URL.createObjectURL(new Blob([res.data]))
			const link = document.createElement('a')
			link.href = url
			link.setAttribute('download', 'sample_incidents.csv')
			document.body.appendChild(link)
			link.click()
		})
	}

	return (
		<div className='page'>
			<Link to='/' className='back-link'>
				ТЕРМИНАЛ
			</Link>
			<div className='form-page-title'>
				ИМПОРТ <span>CSV</span>
			</div>
			<div className='form-divider'></div>

			<div className='form-card' style={{ padding: '30px' }}>
				<div className='form-label' style={{ marginBottom: '16px' }}>
					ЗАГРУЗИТЕ CSV-ФАЙЛ С ИНЦИДЕНТАМИ
				</div>

				<button
					onClick={handleDownloadSample}
					className='btn btn-ghost'
					style={{ marginBottom: '20px' }}
				>
					СКАЧАТЬ ПРИМЕР CSV
				</button>

				<div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
					<input
						type='file'
						accept='.csv'
						className='form-input'
						style={{ flex: 1 }}
						onChange={e => setFile(e.target.files[0])}
					/>
					<button
						className='btn btn-primary'
						onClick={handleImport}
						disabled={!file || loading}
					>
						{loading ? 'ИМПОРТ...' : 'ЗАГРУЗИТЬ'}
					</button>
				</div>

				{file && (
					<div
						style={{
							fontFamily: 'var(--font-mono)',
							fontSize: '11px',
							color: 'var(--text-muted)',
							marginTop: '10px',
						}}
					>
						Выбран файл: {file.name}
					</div>
				)}

				{result && (
					<div
						className='form-card'
						style={{
							marginTop: '20px',
							padding: '20px',
							background: 'var(--bg)',
						}}
					>
						<div
							style={{
								fontFamily: 'var(--font-head)',
								color: 'var(--accent)',
								fontSize: '18px',
							}}
						>
							ИМПОРТИРОВАНО: {result.imported} ИНЦИДЕНТОВ
						</div>
						{result.errors && result.errors.length > 0 && (
							<div
								style={{
									marginTop: '10px',
									color: 'var(--danger)',
									fontFamily: 'var(--font-mono)',
									fontSize: '11px',
								}}
							>
								Ошибки: {result.errors.join(', ')}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

export default Dataset
