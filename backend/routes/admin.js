const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware, requireAdmin } = require('../middleware/auth')
const fs = require('fs')
const path = require('path')

router.use(authMiddleware, requireAdmin)

router.get('/users', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM users ORDER BY id ASC')
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

router.put('/users/:id/role', async (req, res) => {
	const { role } = req.body
	try {
		await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id])
		await pool.query('INSERT INTO logs (action) VALUES ($1)', [`Админ изменил роль пользователю ID ${req.params.id} на ${role}`])
		res.json({ message: 'Роль обновлена' })
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

router.delete('/users/:id', async (req, res) => {
	try {
		if (parseInt(req.params.id) === req.user.id) {
			return res.status(400).json({ error: 'Нельзя удалить свой собственный аккаунт' })
		}
		
		await pool.query('DELETE FROM users WHERE id = $1', [req.params.id])
		await pool.query('INSERT INTO logs (action) VALUES ($1)', [`Админ удалил пользователя с ID ${req.params.id}`])
		res.json({ message: 'Пользователь удален' })
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

router.get('/logs', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM logs ORDER BY id DESC LIMIT 100')
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

// НОВЫЙ ЭНДПОИНТ: Скачивание текстового файла с логами
router.get('/audit-log/download', async (req, res) => {
	try {
		const logPath = path.join(__dirname, '../../audit.log')
		if (fs.existsSync(logPath)) {
			// Если файл существует - отдаем его на скачивание
			res.download(logPath, 'security_audit.log')
		} else {
			res.status(404).json({ error: 'Файл логов пока пуст или не создан' })
		}
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

module.exports = router
