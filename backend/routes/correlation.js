const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware, requireRole } = require('../middleware/auth')

router.use(authMiddleware)

// GET /api/correlation/alerts
router.get('/alerts', async (req, res) => {
	try {
		const result = await pool.query(
			'SELECT * FROM correlation_alerts ORDER BY created_at DESC',
		)
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

// PUT /api/correlation/alerts/:id
router.put(
	'/alerts/:id',
	requireRole('admin', 'investigator'),
	async (req, res) => {
		const { status } = req.body
		try {
			await pool.query(
				'UPDATE correlation_alerts SET status = $1 WHERE id = $2',
				[status, req.params.id],
			)
			res.json({ message: 'Статус обновлён' })
		} catch (err) {
			res.status(500).json({ error: err.message })
		}
	},
)

// DELETE /api/correlation/alerts/:id
router.delete('/alerts/:id', requireRole('admin'), async (req, res) => {
	try {
		// Сначала удаляем связи алерта с инцидентами
		await pool.query(
			'DELETE FROM correlation_alert_incidents WHERE alert_id = $1',
			[req.params.id],
		)
		// Затем удаляем сам алерт
		await pool.query('DELETE FROM correlation_alerts WHERE id = $1', [
			req.params.id,
		])
		res.json({ message: 'Алерт удалён' })
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

module.exports = router
