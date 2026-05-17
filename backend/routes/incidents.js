const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

// 1. ПОЛУЧИТЬ ВСЕ (GET)
router.get('/', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM incidents ORDER BY id DESC')
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: 'Ошибка БД' })
	}
})

// 2. СОЗДАТЬ (POST)
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
		res.status(500).json({ error: 'Ошибка БД' })
	}
})

// 3. ОБНОВИТЬ (PUT)
router.put('/:id', async (req, res) => {
	const { type, location, severity, status, assignedTo } = req.body
	try {
		// Проверка прав
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
		res.json(result.rows[0])
	} catch (err) {
		res.status(500).json({ error: 'Ошибка БД' })
	}
})

// 4. УДАЛИТЬ (DELETE)
router.delete('/:id', async (req, res) => {
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
			return res
				.status(403)
				.json({ error: 'Вы не можете удалить чужой инцидент' })
		}

		await pool.query('DELETE FROM incidents WHERE id = $1', [req.params.id])
		res.json({ message: 'Удалено' })
	} catch (err) {
		res.status(500).json({ error: 'Ошибка БД' })
	}
})

module.exports = router
