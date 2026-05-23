const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware, requireRole } = require('../middleware/auth')
const { calculateRisk } = require('../utils/riskCalculator')
const multer = require('multer')
const csv = require('csv-parse')
const upload = multer({ storage: multer.memoryStorage() })

router.use(authMiddleware)

// POST /api/dataset/import — импорт CSV
router.post(
	'/import',
	requireRole('admin', 'investigator'),
	upload.single('file'),
	async (req, res) => {
		if (!req.file) {
			return res.status(400).json({ error: 'Файл не загружен' })
		}

		try {
			const content = req.file.buffer.toString('utf-8')
			const rows = content.split('\n').filter(line => line.trim())

			// Пропускаем заголовок
			const header = rows[0].toLowerCase()
			if (
				!header.includes('type') ||
				!header.includes('location') ||
				!header.includes('severity')
			) {
				return res.status(400).json({
					error:
						'CSV должен содержать колонки: type, location, severity, status, assignedTo',
				})
			}

			let imported = 0
			const errors = []

			for (let i = 1; i < rows.length; i++) {
				const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
				if (cols.length < 3) continue

				const [type, location, severity, status = 'Открыт', assignedTo = ''] =
					cols

				try {
					const risk = calculateRisk({ type, location, severity })
					await pool.query(
						`INSERT INTO incidents (type, location, severity, status, "assignedTo", created_by, 
           risk_score, risk_level, detection_reason, is_suspicious, analyzed_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
						[
							type,
							location,
							severity,
							status,
							assignedTo,
							req.user.email,
							risk.risk_score,
							risk.risk_level,
							risk.detection_reason,
							risk.is_suspicious,
							risk.analyzed_at,
						],
					)
					imported++
				} catch (e) {
					errors.push(`Строка ${i}: ${e.message}`)
				}
			}

			await pool.query(
				'INSERT INTO logs (action, user_email) VALUES ($1, $2)',
				[
					`[IMPORT] ${req.user.email} импортировал ${imported} инцидентов из CSV`,
					req.user.email,
				],
			)

			res.json({ imported, errors })
		} catch (err) {
			res.status(500).json({ error: err.message })
		}
	},
)

// GET /api/dataset/export — экспорт всех инцидентов в CSV
router.get('/export', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM incidents ORDER BY id DESC')

		const header =
			'id,type,location,severity,status,assignedTo,risk_score,risk_level,is_suspicious,created_at\n'
		const rows = result.rows
			.map(
				inc =>
					`"${inc.id}","${inc.type}","${inc.location}","${inc.severity}","${inc.status}","${inc.assignedTo || ''}","${inc.risk_score}","${inc.risk_level}","${inc.is_suspicious}","${inc.created_at}"`,
			)
			.join('\n')

		res.setHeader('Content-Type', 'text/csv')
		res.setHeader(
			'Content-Disposition',
			'attachment; filename="incidents_export.csv"',
		)
		res.send(header + rows)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

// GET /api/dataset/sample — скачать пример CSV
router.get('/sample', async (req, res) => {
	const sample = `type,location,severity,status,assignedTo
Утечка данных,Серверная,Критический,Открыт,investigator@plant.ru
Нарушение ТБ,Цех №1,Средний,Открыт,
Отказ оборудования,Склад ГСМ,Высокий,В работе,engineer@plant.ru
Несанкционированный доступ,Серверная,Критический,Открыт,
Ошибка персонала,Цех №3,Низкий,Закрыт,`

	res.setHeader('Content-Type', 'text/csv')
	res.setHeader(
		'Content-Disposition',
		'attachment; filename="sample_incidents.csv"',
	)
	res.send(sample)
})

module.exports = router
