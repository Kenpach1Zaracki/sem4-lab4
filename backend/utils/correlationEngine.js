/**
 * Correlation Engine для SafeTrack
 * Группирует связанные инциденты в correlation alerts
 */

const pool = require('../db')

async function correlateIncident(incident) {
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

	// Ищем похожие инциденты за последний час
	const related = await pool.query(
		`
    SELECT * FROM incidents 
    WHERE id != $1 
    AND created_at > $2
    AND (
      type = $3 
      OR location = $4 
      OR "assignedTo" = $5
    )
    ORDER BY created_at DESC
  `,
		[
			incident.id,
			oneHourAgo,
			incident.type,
			incident.location,
			incident.assignedTo,
		],
	)

	if (related.rows.length === 0) return null

	// Считаем общий риск
	const allIncidents = [incident, ...related.rows]
	const avgRisk = Math.round(
		allIncidents.reduce((sum, inc) => sum + (inc.risk_score || 0), 0) /
			allIncidents.length,
	)
	const maxRisk = Math.max(...allIncidents.map(inc => inc.risk_score || 0))

	let riskLevel = 'low'
	if (maxRisk >= 75) riskLevel = 'critical'
	else if (maxRisk >= 50) riskLevel = 'high'
	else if (maxRisk >= 25) riskLevel = 'medium'

	const title = `Группа инцидентов: ${incident.type} (${allIncidents.length} шт.)`
	const description = `Обнаружена группа из ${allIncidents.length} связанных инцидентов типа "${incident.type}" в локации "${incident.location}". Средний риск: ${avgRisk}/100.`

	// Проверяем, есть ли уже alert для этой группы
	const existingAlert = await pool.query(
		`
    SELECT * FROM correlation_alerts 
    WHERE title = $1 AND status IN ('new', 'in_progress')
  `,
		[title],
	)

	let alert
	if (existingAlert.rows.length > 0) {
		alert = existingAlert.rows[0]
		await pool.query(
			`
      UPDATE correlation_alerts 
      SET incident_count = $1, risk_score = $2, risk_level = $3, last_seen = NOW()
      WHERE id = $4
    `,
			[allIncidents.length, maxRisk, riskLevel, alert.id],
		)
	} else {
		const newAlert = await pool.query(
			`
      INSERT INTO correlation_alerts (title, description, risk_score, risk_level, status, incident_count, first_seen, last_seen)
      VALUES ($1, $2, $3, $4, 'new', $5, $6, NOW())
      RETURNING *
    `,
			[
				title,
				description,
				maxRisk,
				riskLevel,
				allIncidents.length,
				incident.created_at,
			],
		)
		alert = newAlert.rows[0]
	}

	// Привязываем все инциденты к алерту
	for (const inc of allIncidents) {
		await pool.query(
			`
      INSERT INTO correlation_alert_incidents (alert_id, incident_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `,
			[alert.id, inc.id],
		)
	}

	return alert
}

module.exports = { correlateIncident }
