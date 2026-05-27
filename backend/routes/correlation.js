const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware, requireRole } = require('../middleware/auth')

router.use(authMiddleware)

/**
 * @swagger
 * tags:
 *   name: Correlation
 *   description: Корреляционные алерты (группировка инцидентов)
 */

/**
 * @swagger
 * /api/correlation/alerts:
 *   get:
 *     summary: Получить список корреляционных алертов
 *     tags: [Correlation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список алертов
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   risk_score:
 *                     type: integer
 *                   risk_level:
 *                     type: string
 *                   status:
 *                     type: string
 *                   incident_count:
 *                     type: integer
 *                   first_seen:
 *                     type: string
 *                   last_seen:
 *                     type: string
 *       401:
 *         description: Требуется аутентификация
 */
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

/**
 * @swagger
 * /api/correlation/alerts/{id}:
 *   put:
 *     summary: Обновить статус алерта (admin, investigator)
 *     tags: [Correlation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID алерта
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [in_progress, resolved]
 *     responses:
 *       200:
 *         description: Статус обновлён
 *       401:
 *         description: Требуется аутентификация
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Алерт не найден
 *
 *   delete:
 *     summary: Удалить алерт (только admin)
 *     tags: [Correlation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID алерта
 *     responses:
 *       200:
 *         description: Алерт удалён
 *       401:
 *         description: Требуется аутентификация
 *       403:
 *         description: Недостаточно прав (требуется admin)
 *       404:
 *         description: Алерт не найден
 */
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

router.delete('/alerts/:id', requireRole('admin'), async (req, res) => {
	try {
		await pool.query(
			'DELETE FROM correlation_alert_incidents WHERE alert_id = $1',
			[req.params.id],
		)
		await pool.query('DELETE FROM correlation_alerts WHERE id = $1', [
			req.params.id,
		])
		res.json({ message: 'Алерт удалён' })
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

module.exports = router
