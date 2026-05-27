const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Аналитика и дашборд
 */

/**
 * @swagger
 * /api/analytics/summary:
 *   get:
 *     summary: Получить сводную статистику для дашборда
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Сводка инцидентов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_incidents:
 *                   type: integer
 *                 suspicious_incidents:
 *                   type: integer
 *                 critical_incidents:
 *                   type: integer
 *                 active_incidents:
 *                   type: integer
 *                 average_risk_score:
 *                   type: integer
 *                 risk_distribution:
 *                   type: array
 *                 top_types:
 *                   type: array
 *                 top_locations:
 *                   type: array
 *       401:
 *         description: Требуется аутентификация
 */
router.get('/summary', async (req, res) => {
	try {
		const [
			totalResult,
			suspiciousResult,
			criticalResult,
			activeResult,
			avgRiskResult,
			riskDistResult,
			topTypesResult,
			topLocationsResult,
		] = await Promise.all([
			pool.query('SELECT COUNT(*) as count FROM incidents'),
			pool.query(
				'SELECT COUNT(*) as count FROM incidents WHERE is_suspicious = true',
			),
			pool.query(
				"SELECT COUNT(*) as count FROM incidents WHERE risk_level = 'critical'",
			),
			pool.query(
				"SELECT COUNT(*) as count FROM incidents WHERE status != 'Закрыт'",
			),
			pool.query('SELECT AVG(risk_score) as avg FROM incidents'),
			pool.query(
				'SELECT risk_level, COUNT(*) as count FROM incidents GROUP BY risk_level ORDER BY count DESC',
			),
			pool.query(
				'SELECT type, COUNT(*) as count FROM incidents GROUP BY type ORDER BY count DESC LIMIT 5',
			),
			pool.query(
				'SELECT location, COUNT(*) as count FROM incidents GROUP BY location ORDER BY count DESC LIMIT 5',
			),
		])

		res.json({
			total_incidents: parseInt(totalResult.rows[0].count),
			suspicious_incidents: parseInt(suspiciousResult.rows[0].count),
			critical_incidents: parseInt(criticalResult.rows[0].count),
			active_incidents: parseInt(activeResult.rows[0].count),
			average_risk_score: Math.round(
				parseFloat(avgRiskResult.rows[0].avg || 0),
			),
			risk_distribution: riskDistResult.rows,
			top_types: topTypesResult.rows,
			top_locations: topLocationsResult.rows,
		})
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

/**
 * @swagger
 * /api/analytics/risk-distribution:
 *   get:
 *     summary: Распределение инцидентов по уровням риска
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Массив объектов risk_level + count
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   risk_level:
 *                     type: string
 *                   count:
 *                     type: string
 */
router.get('/risk-distribution', async (req, res) => {
	try {
		const result = await pool.query(
			'SELECT risk_level, COUNT(*) as count FROM incidents GROUP BY risk_level ORDER BY count DESC',
		)
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

/**
 * @swagger
 * /api/analytics/timeline:
 *   get:
 *     summary: Активность за последние 24 часа (почасовая разбивка)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Почасовые данные с количеством инцидентов
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   hour:
 *                     type: string
 *                   count:
 *                     type: string
 *                   suspicious_count:
 *                     type: string
 */
router.get('/timeline', async (req, res) => {
	try {
		const result = await pool.query(`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as count,
        COUNT(CASE WHEN is_suspicious = true THEN 1 END) as suspicious_count
      FROM incidents 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour ASC
    `)
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

module.exports = router
