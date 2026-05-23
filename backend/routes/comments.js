const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

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
	const { comment_text } = req.body
	if (!comment_text || !comment_text.trim()) {
		return res.status(400).json({ error: 'Текст комментария обязателен' })
	}

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
