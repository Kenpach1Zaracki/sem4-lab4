const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware, requireAdmin } = require('../middleware/auth')
const fs = require('fs')
const path = require('path')

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Администрирование (пользователи, журнал действий)
 */

router.use(authMiddleware, requireAdmin)

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Получить список пользователей (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей
 *       401:
 *         description: Нет токена или токен недействителен
 *       403:
 *         description: Недостаточно прав (только admin)
 *       500:
 *         description: Ошибка сервера
 */
router.get('/users', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM users ORDER BY id ASC')
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Изменить роль пользователя (admin)
 *     tags: [Admin]
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
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 example: investigator
 *     responses:
 *       200:
 *         description: Роль обновлена
 *       401:
 *         description: Нет токена или токен недействителен
 *       403:
 *         description: Недостаточно прав (только admin)
 *       500:
 *         description: Ошибка сервера
 */
router.put('/users/:id/role', async (req, res) => {
	const { role } = req.body
	try {
		await pool.query('UPDATE users SET role = $1 WHERE id = $2', [
			role,
			req.params.id,
		])
		await pool.query('INSERT INTO logs (action) VALUES ($1)', [
			`Админ изменил роль пользователю ID ${req.params.id} на ${role}`,
		])
		res.json({ message: 'Роль обновлена' })
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Удалить пользователя (admin)
 *     tags: [Admin]
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
 *         description: Пользователь удалён
 *       400:
 *         description: Нельзя удалить свой собственный аккаунт
 *       401:
 *         description: Нет токена или токен недействителен
 *       403:
 *         description: Недостаточно прав (только admin)
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/users/:id', async (req, res) => {
	try {
		if (parseInt(req.params.id) === req.user.id) {
			return res
				.status(400)
				.json({ error: 'Нельзя удалить свой собственный аккаунт' })
		}

		await pool.query('DELETE FROM users WHERE id = $1', [req.params.id])
		await pool.query('INSERT INTO logs (action) VALUES ($1)', [
			`Админ удалил пользователя с ID ${req.params.id}`,
		])
		res.json({ message: 'Пользователь удален' })
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: Получить последние записи журнала (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список логов (последние 100)
 *       401:
 *         description: Нет токена или токен недействителен
 *       403:
 *         description: Недостаточно прав (только admin)
 *       500:
 *         description: Ошибка сервера
 */
router.get('/logs', async (req, res) => {
	try {
		const result = await pool.query(
			'SELECT * FROM logs ORDER BY id DESC LIMIT 100',
		)
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

/**
 * @swagger
 * /api/admin/audit-log/download:
 *   get:
 *     summary: Скачать audit.log (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Файл audit.log
 *       401:
 *         description: Нет токена или токен недействителен
 *       403:
 *         description: Недостаточно прав (только admin)
 *       404:
 *         description: Файл логов не создан
 *       500:
 *         description: Ошибка сервера
 */
router.get('/audit-log/download', async (req, res) => {
	try {
		const logPath = path.join(__dirname, '../../audit.log')
		if (fs.existsSync(logPath)) {
			res.download(logPath, 'security_audit.log')
		} else {
			res.status(404).json({ error: 'Файл логов пока пуст или не создан' })
		}
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

module.exports = router
