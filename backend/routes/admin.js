const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware, requireAdmin } = require('../middleware/auth')

router.use(authMiddleware, requireAdmin)

router.get('/users', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM users ORDER BY id ASC')
		res.json(result.rows)
	} catch (err) {
		console.error('ОШИБКА В /admin/users:', err.message)
		res.status(500).json({ error: `Ошибка БД: ${err.message}` })
	}
})

router.put('/users/:id/role', async (req, res) => {
	const { role } = req.body
	try {
		await pool.query('UPDATE users SET role = $1 WHERE id = $2', [
			role,
			req.params.id,
		])
		res.json({ message: 'Роль обновлена' })
	} catch (err) {
		console.error('ОШИБКА В /admin/users/role:', err.message)
		res.status(500).json({ error: `Ошибка БД: ${err.message}` })
	}
})

router.get('/logs', async (req, res) => {
	try {
		// Пробуем достать из logs, если не выйдет - из incident_log
		let result
		try {
			result = await pool.query('SELECT * FROM logs ORDER BY id DESC LIMIT 100')
		} catch (e) {
			result = await pool.query(
				'SELECT * FROM incident_log ORDER BY created_at DESC LIMIT 100',
			)
		}
		res.json(result.rows)
	} catch (err) {
		console.error('ОШИБКА В /admin/logs:', err.message)
		res.status(500).json({ error: `Ошибка БД: ${err.message}` })
	}
})

module.exports = router
