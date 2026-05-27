const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Комментарии к расследованию инцидентов
 */

// Защита: санитизация от XSS
const sanitize = text => {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#x27;')
}

// Защита: ограничение длины
const MAX_COMMENT_LENGTH = 1000

/**
 * @swagger
 * /api/incidents/{id}/comments:
 *   get:
 *     summary: Получить комментарии к инциденту
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID инцидента
 *     responses:
 *       200:
 *         description: Список комментариев
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   incident_id:
 *                     type: integer
 *                   author_email:
 *                     type: string
 *                   comment_text:
 *                     type: string
 *                   created_at:
 *                     type: string
 *       401:
 *         description: Требуется аутентификация
 *       404:
 *         description: Инцидент не найден
 *
 *   post:
 *     summary: Добавить комментарий к инциденту (admin, investigator)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID инцидента
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comment_text
 *             properties:
 *               comment_text:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Текст комментария (проходит XSS-санитизацию)
 *     responses:
 *       201:
 *         description: Комментарий добавлен
 *       400:
 *         description: Текст комментария обязателен или превышает лимит
 *       401:
 *         description: Требуется аутентификация
 *       403:
 *         description: Недостаточно прав (user не может комментировать, investigator только назначенные инциденты)
 *       404:
 *         description: Инцидент не найден
 */
router.get('/incidents/:id/comments', async (req, res) => {
	try {
		const result = await pool.query(
			'SELECT * FROM investigation_comments WHERE incident_id = $1 ORDER BY created_at ASC',
			[req.params.id],
		)
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

router.post('/incidents/:id/comments', async (req, res) => {
	let { comment_text } = req.body

	if (!comment_text || !comment_text.trim()) {
		return res.status(400).json({ error: 'Текст комментария обязателен' })
	}

	if (comment_text.length > MAX_COMMENT_LENGTH) {
		return res.status(400).json({
			error: `Максимальная длина комментария: ${MAX_COMMENT_LENGTH} символов`,
		})
	}

	try {
		const incident = await pool.query('SELECT * FROM incidents WHERE id = $1', [
			req.params.id,
		])
		if (incident.rows.length === 0) {
			return res.status(404).json({ error: 'Инцидент не найден' })
		}

		const inc = incident.rows[0]

		if (req.user.role === 'investigator' && inc.assignedTo !== req.user.email) {
			return res.status(403).json({ error: 'Вы не назначены на этот инцидент' })
		}

		if (req.user.role === 'user') {
			return res.status(403).json({ error: 'Недостаточно прав' })
		}

		comment_text = sanitize(comment_text.trim())

		const result = await pool.query(
			'INSERT INTO investigation_comments (incident_id, author_email, comment_text) VALUES ($1, $2, $3) RETURNING *',
			[req.params.id, req.user.email, comment_text],
		)

		await pool.query('INSERT INTO logs (action, user_email) VALUES ($1, $2)', [
			`[COMMENT] ${req.user.email} добавил комментарий к инциденту #${req.params.id}`,
			req.user.email,
		])

		res.status(201).json(result.rows[0])
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

module.exports = router
