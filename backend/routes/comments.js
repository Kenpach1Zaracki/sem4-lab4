const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

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

// GET /api/incidents/:id/comments — получить комментарии к инциденту
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

// POST /api/incidents/:id/comments — добавить комментарий
router.post('/incidents/:id/comments', async (req, res) => {
	let { comment_text } = req.body

	// Проверка на наличие текста
	if (!comment_text || !comment_text.trim()) {
		return res.status(400).json({ error: 'Текст комментария обязателен' })
	}

	// Защита: обрезаем длину
	if (comment_text.length > MAX_COMMENT_LENGTH) {
		return res.status(400).json({
			error: `Максимальная длина комментария: ${MAX_COMMENT_LENGTH} символов`,
		})
	}

	// Защита: санитизация от XSS
	comment_text = sanitize(comment_text.trim())

	try {
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
