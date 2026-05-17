const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware, requireAdmin } = require('../middleware/auth')

router.use(authMiddleware, requireAdmin)

// Получить список всех пользователей
router.get('/users', async (req, res) => {
	try {
		// Убрали created_at, чтобы не было ошибки БД
		const result = await pool.query(
			'SELECT id, name, email, role FROM users ORDER BY id ASC',
		)
		res.json(result.rows)
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: 'Ошибка при получении пользователей' })
	}
})

// Изменить роль пользователя
router.put('/users/:id/role', async (req, res) => {
	const { role } = req.body
	const userId = req.params.id

	if (!['admin', 'investigator', 'user'].includes(role)) {
		return res.status(400).json({ error: 'Недопустимая роль' })
	}

	try {
		await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId])
		res.json({ message: 'Роль успешно обновлена' })
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: 'Ошибка обновления роли' })
	}
})

// Логи аудита
router.get('/logs', async (req, res) => {
	try {
		const result = await pool.query(
			'SELECT * FROM logs ORDER BY id DESC LIMIT 100',
		)
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: 'Ошибка при получении логов' })
	}
})

module.exports = router
