const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware } = require('../middleware/auth')
const fs = require('fs')
const path = require('path')

/**
 * @swagger
 * tags:
 *   name: Incidents
 *   description: Управление инцидентами ИБ (CRUD)
 */

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
 *     summary: Получить список инцидентов
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список инцидентов
 *       401:
 *         description: Нет токена или токен недействителен
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM incidents ORDER BY id DESC')
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

/**
 * @swagger
 * /api/incidents:
 *   post:
 *     summary: Создать новый инцидент (только admin/investigator)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, location, severity, status]
 *             properties:
 *               type:
 *                 type: string
 *               location:
 *                 type: string
 *               severity:
 *                 type: string
 *                 example: "Низкий"
 *               status:
 *                 type: string
 *                 example: "Открыт"
 *               assignedTo:
 *                 type: string
 *                 description: Email назначенного специалиста
 *     responses:
 *       200:
 *         description: Созданный инцидент
 *       401:
 *         description: Нет токена или токен недействителен
 *       403:
 *         description: Недостаточно прав
 *       500:
 *         description: Ошибка сервера
 */
router.post('/', async (req, res) => {
	if (req.user.role === 'user')
		return res.status(403).json({ error: 'Нет прав' })

	const { type, location, severity, status, assignedTo } = req.body
	try {
		const result = await pool.query(
			'INSERT INTO incidents (type, location, severity, status, "assignedTo") VALUES ($1, $2, $3, $4, $5) RETURNING *',
			[type, location, severity, status, assignedTo],
		)
		const newIncident = result.rows[0]

		// Подробный лог
		const logMsg = `[CREATE] Пользователь ${req.user.email} создал инцидент #${newIncident.id} | Тип: ${type} | Уровень: ${severity} | Локация: ${location} | Назначен: ${
			assignedTo || 'НЕ НАЗНАЧЕН'
		}`
		await pool.query('INSERT INTO logs (action) VALUES ($1)', [logMsg])
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
 *     summary: Обновить инцидент (admin или investigator назначенный на инцидент)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               location:
 *                 type: string
 *               severity:
 *                 type: string
 *               status:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Обновлённый инцидент
 *       401:
 *         description: Нет токена или токен недействителен
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Инцидент не найден
 *       500:
 *         description: Ошибка сервера
 */
router.put('/:id', async (req, res) => {
	const { type, location, severity, status, assignedTo } = req.body
	try {
		const check = await pool.query('SELECT * FROM incidents WHERE id = $1', [
			req.params.id,
		])
		if (check.rows.length === 0)
			return res.status(404).json({ error: 'Не найден' })

		const incident = check.rows[0]
		if (req.user.role === 'user')
			return res.status(403).json({ error: 'Нет прав' })

		if (
			req.user.role === 'investigator' &&
			incident.assignedTo !== req.user.email
		) {
			return res.status(403).json({ error: 'Вы не назначены на этот инцидент' })
		}

		const result = await pool.query(
			'UPDATE incidents SET type=$1, location=$2, severity=$3, status=$4, "assignedTo"=$5 WHERE id=$6 RETURNING *',
			[type, location, severity, status, assignedTo, req.params.id],
		)

		// Подробный лог
		const logMsg = `[UPDATE] Пользователь ${req.user.email} обновил инцидент #${req.params.id} | Статус: ${status} | Уровень: ${severity} | Локация: ${location} | Назначен: ${
			assignedTo || 'НЕ НАЗНАЧЕН'
		}`
		await pool.query('INSERT INTO logs (action) VALUES ($1)', [logMsg])
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
 *     summary: Удалить инцидент (доступ должен быть ограничен по ролям)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Инцидент удалён
 *       401:
 *         description: Нет токена или токен недействителен
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Инцидент не найден
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/:id', async (req, res) => {
	try {
		// Сначала получаем данные инцидента, чтобы записать их в лог перед удалением
		const check = await pool.query('SELECT * FROM incidents WHERE id = $1', [
			req.params.id,
		])
		if (check.rows.length === 0)
			return res.status(404).json({ error: 'Не найден' })
		const inc = check.rows[0]

		await pool.query('DELETE FROM incidents WHERE id = $1', [req.params.id])

		// Подробный лог
		const logMsg = `[DELETE] Пользователь ${req.user.email} удалил инцидент #${req.params.id} | Тип: ${inc.type} | Уровень: ${inc.severity} | Локация: ${inc.location}`
		await pool.query('INSERT INTO logs (action) VALUES ($1)', [logMsg])
		logToFile(logMsg)

		res.json({ message: 'Удалено' })
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

module.exports = router
