const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const pool = require('../db')
const { authMiddleware, requireRole } = require('../middleware/auth')
const { calculateRisk } = require('../utils/riskCalculator')
const { correlateIncident } = require('../utils/correlationEngine')
const fs = require('fs')
const path = require('path')

/**
 * @swagger
 * tags:
 *   name: Incidents
 *   description: Управление инцидентами ИБ (CRUD) + Risk Calculator
 */

// Хеширование IP-адреса для безопасности
const hashIp = req => {
	const ip =
		req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
	// Убираем порт, если есть, и берем только первый IP из цепочки
	let cleanIp = ip.split(',')[0].trim()
	if (cleanIp.includes(':')) {
		cleanIp = cleanIp.split(':')[0] // Убираем порт для IPv4
	}
	return crypto
		.createHash('sha256')
		.update(cleanIp)
		.digest('hex')
		.substring(0, 12)
}

// Функция резервного логирования в файл (Защита ИБ)
const logToFile = message => {
	const logPath = path.join(__dirname, '../../audit.log')
	const time = new Date().toISOString()
	const logString = `[${time}] AUDIT: ${message}\n`
	fs.appendFile(logPath, logString, err => {
		if (err) console.error('Ошибка записи в audit.log', err)
	})
}

router.use(authMiddleware)

/**
 * @swagger
 * /api/incidents:
 *   get:
 *     summary: Получить список инцидентов (user видит только свои, investigator - назначенные + свои, admin - все)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список инцидентов
 */
router.get('/', async (req, res) => {
	try {
		let result
		if (req.user.role === 'user') {
			// user видит только созданные им
			result = await pool.query(
				'SELECT * FROM incidents WHERE created_by = $1 ORDER BY id DESC',
				[req.user.email],
			)
		} else if (req.user.role === 'investigator') {
			// investigator видит назначенные на него + созданные им
			result = await pool.query(
				'SELECT * FROM incidents WHERE "assignedTo" = $1 OR created_by = $1 ORDER BY id DESC',
				[req.user.email],
			)
		} else {
			// admin видит все
			result = await pool.query('SELECT * FROM incidents ORDER BY id DESC')
		}
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

/**
 * @swagger
 * /api/incidents:
 *   post:
 *     summary: Создать новый инцидент + авто-расчёт риска
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, location, severity]
 *             properties:
 *               type:
 *                 type: string
 *                 example: "Утечка данных"
 *               location:
 *                 type: string
 *                 example: "Серверная"
 *               severity:
 *                 type: string
 *                 example: "Критический"
 *               status:
 *                 type: string
 *                 example: "Открыт"
 *               assignedTo:
 *                 type: string
 *                 example: "boss@plant.ru"
 *     responses:
 *       200:
 *         description: Созданный инцидент с risk_score
 *       400:
 *         description: Отсутствуют обязательные поля
 *       401:
 *         description: Требуется аутентификация
 *       403:
 *         description: Недостаточно прав
 */
router.post('/', requireRole('admin', 'investigator'), async (req, res) => {
	const { type, location, severity, status, assignedTo } = req.body

	if (!type || !location || !severity) {
		return res
			.status(400)
			.json({ error: 'Поля type, location, severity обязательны' })
	}

	try {
		// RISK CALCULATOR
		const risk = calculateRisk({ type, location, severity })

		const result = await pool.query(
			`INSERT INTO incidents (type, location, severity, status, "assignedTo", created_by, 
			 risk_score, risk_level, detection_reason, is_suspicious, analyzed_at) 
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
			[
				type,
				location,
				severity,
				status || 'Открыт',
				assignedTo,
				req.user.email,
				risk.risk_score,
				risk.risk_level,
				risk.detection_reason,
				risk.is_suspicious,
				risk.analyzed_at,
			],
		)
		const newIncident = result.rows[0]

		// Запускаем корреляцию (не блокируем ответ)
		correlateIncident(newIncident)
			.then(alert => {
				if (alert) console.log(`Correlation alert #${alert.id} updated`)
			})
			.catch(console.error)

		const logMsg = `[CREATE] [IP: ${hashIp(req)}] ${req.user.email} создал инцидент #${newIncident.id} | Тип: ${type} | Уровень: ${severity} | Риск: ${risk.risk_score}/100 (${risk.risk_level}) | Локация: ${location} | Назначен: ${assignedTo || 'НЕ НАЗНАЧЕН'}`
		await pool.query('INSERT INTO logs (action, user_email) VALUES ($1, $2)', [
			logMsg,
			req.user.email,
		])
		logToFile(logMsg)

		res.json(newIncident)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

/**
 * @swagger
 * /api/incidents/{id}:
 *   put:
 *     summary: Обновить инцидент + пересчёт риска
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, location, severity]
 *             properties:
 *               type:
 *                 type: string
 *                 example: "Утечка данных"
 *               location:
 *                 type: string
 *                 example: "Серверная"
 *               severity:
 *                 type: string
 *                 example: "Критический"
 *               status:
 *                 type: string
 *                 example: "В работе"
 *               assignedTo:
 *                 type: string
 *                 example: "investigator@plant.ru"
 *     responses:
 *       200:
 *         description: Обновлённый инцидент
 *       400:
 *         description: Отсутствуют обязательные поля
 *       404:
 *         description: Инцидент не найден
 */
router.put('/:id', requireRole('admin', 'investigator'), async (req, res) => {
	const { type, location, severity, status, assignedTo } = req.body

	if (!type || !location || !severity) {
		return res
			.status(400)
			.json({ error: 'Поля type, location, severity обязательны' })
	}

	try {
		const check = await pool.query('SELECT * FROM incidents WHERE id = $1', [
			req.params.id,
		])
		if (check.rows.length === 0)
			return res.status(404).json({ error: 'Не найден' })

		const incident = check.rows[0]

		if (
			req.user.role === 'investigator' &&
			incident.assignedTo !== req.user.email
		) {
			return res.status(403).json({ error: 'Вы не назначены на этот инцидент' })
		}

		// RISK CALCULATOR
		const risk = calculateRisk({ type, location, severity })

		const result = await pool.query(
			`UPDATE incidents SET type=$1, location=$2, severity=$3, status=$4, "assignedTo"=$5,
			 risk_score=$6, risk_level=$7, detection_reason=$8, is_suspicious=$9, analyzed_at=$10
			 WHERE id=$11 RETURNING *`,
			[
				type,
				location,
				severity,
				status,
				assignedTo,
				risk.risk_score,
				risk.risk_level,
				risk.detection_reason,
				risk.is_suspicious,
				risk.analyzed_at,
				req.params.id,
			],
		)

		const updatedIncident = result.rows[0]

		// Запускаем корреляцию (не блокируем ответ)
		correlateIncident(updatedIncident)
			.then(alert => {
				if (alert) console.log(`Correlation alert #${alert.id} updated`)
			})
			.catch(console.error)

		const logMsg = `[UPDATE] [IP: ${hashIp(req)}] ${req.user.email} обновил инцидент #${req.params.id} | Статус: ${status} | Риск: ${risk.risk_score}/100 (${risk.risk_level}) | Назначен: ${assignedTo || 'НЕ НАЗНАЧЕН'}`
		await pool.query('INSERT INTO logs (action, user_email) VALUES ($1, $2)', [
			logMsg,
			req.user.email,
		])
		logToFile(logMsg)

		res.json(result.rows[0])
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

/**
 * @swagger
 * /api/incidents/{id}:
 *   delete:
 *     summary: Удалить инцидент
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Инцидент удалён
 *       404:
 *         description: Инцидент не найден
 */
router.delete(
	'/:id',
	requireRole('admin', 'investigator'),
	async (req, res) => {
		try {
			const check = await pool.query('SELECT * FROM incidents WHERE id = $1', [
				req.params.id,
			])
			if (check.rows.length === 0)
				return res.status(404).json({ error: 'Не найден' })
			const inc = check.rows[0]

			if (
				req.user.role === 'investigator' &&
				inc.assignedTo !== req.user.email
			) {
				return res
					.status(403)
					.json({ error: 'Вы не назначены на этот инцидент' })
			}

			await pool.query('DELETE FROM incidents WHERE id = $1', [req.params.id])

			const logMsg = `[DELETE] [IP: ${hashIp(req)}] ${req.user.email} удалил инцидент #${req.params.id} | Тип: ${inc.type} | Риск был: ${inc.risk_score || 0}/100`
			await pool.query(
				'INSERT INTO logs (action, user_email) VALUES ($1, $2)',
				[logMsg, req.user.email],
			)
			logToFile(logMsg)

			res.json({ message: 'Удалено' })
		} catch (err) {
			res.status(500).json({ error: err.message })
		}
	},
)

module.exports = router
