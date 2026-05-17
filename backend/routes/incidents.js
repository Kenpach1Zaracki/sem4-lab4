const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

router.get('/', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM incidents ORDER BY id DESC')
		res.json(result.rows)
	} catch (err) {
		console.error('ОШИБКА В GET /incidents:', err.message)
		res.status(500).json({ error: err.message })
	}
})

router.post('/', async (req, res) => {
	if (req.user.role === 'user')
		return res.status(403).json({ error: 'Нет прав' })

	const { type, location, severity, status, assignedTo } = req.body
	try {
		const result = await pool.query(
			'INSERT INTO incidents (type, location, severity, status, "assignedTo") VALUES ($1, $2, $3, $4, $5) RETURNING *',
			[type, location, severity, status, assignedTo],
		)
		res.json(result.rows[0])
	} catch (err) {
		console.error('ОШИБКА В POST /incidents:', err.message)
		res.status(500).json({ error: err.message })
	}
})

router.put('/:id', async (req, res) => {
	const { type, location, severity, status, assignedTo } = req.body
	try {
		const check = await pool.query('SELECT * FROM incidents WHERE id = $1', [
			req.params.id,
		])
		if (check.rows.length === 0)
			return res
				.status(404)
				.json({ error: `Инцидент с ID ${req.params.id} не найден в БД` })

		const incident = check.rows[0]
		if (req.user.role === 'user')
			return res.status(403).json({ error: 'Нет прав' })

		// Обрабатываем как assignedTo так и assigned_to (в зависимости от базы)
		const currentAssignee = incident.assignedTo || incident.assigned_to
		if (
			req.user.role === 'investigator' &&
			currentAssignee !== req.user.email
		) {
			return res.status(403).json({ error: 'Вы не назначены на этот инцидент' })
		}

		let query =
			'UPDATE incidents SET type=$1, location=$2, severity=$3, status=$4'
		let params = [type, location, severity, status]

		// Если колонка assignedTo существует
		if (incident.hasOwnProperty('assignedTo')) {
			query += ', "assignedTo"=$5 WHERE id=$6 RETURNING *'
			params.push(assignedTo, req.params.id)
		} else {
			query += ' WHERE id=$5 RETURNING *'
			params.push(req.params.id)
		}

		const result = await pool.query(query, params)
		res.json(result.rows[0])
	} catch (err) {
		console.error('ОШИБКА В PUT /incidents/:id:', err.message)
		res.status(500).json({ error: `Ошибка БД: ${err.message}` })
	}
})

router.delete('/:id', async (req, res) => {
	try {
		await pool.query('DELETE FROM incidents WHERE id = $1', [req.params.id])
		res.json({ message: 'Удалено' })
	} catch (err) {
		console.error('ОШИБКА В DELETE:', err.message)
		res.status(500).json({ error: err.message })
	}
})

module.exports = router
