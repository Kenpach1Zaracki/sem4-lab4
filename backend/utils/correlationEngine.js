const pool = require('../db')

async function correlateIncident(incident) {
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

	const related = await pool.query(
		`
    SELECT * FROM incidents 
    WHERE id != $1 
    AND created_at > $2
    AND type = $3 
    AND location = $4
    ORDER BY created_at DESC
  `,
		[incident.id, oneHourAgo, incident.type, incident.location],
	)

	if (related.rows.length === 0) return null

	const allIncidents = [incident, ...related.rows]
	const maxRisk = Math.max(...allIncidents.map(inc => inc.risk_score || 0))

	let riskLevel = 'low'
	if (maxRisk >= 75) riskLevel = 'critical'
	else if (maxRisk >= 50) riskLevel = 'high'
	else if (maxRisk >= 25) riskLevel = 'medium'

	const title = `Группа: ${incident.type} (${incident.location})`

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
      SET incident_count = $1, risk_score = $2, risk_level = $3, last_seen = NOW(),
          description = $4
      WHERE id = $5
    `,
			[
				allIncidents.length,
				maxRisk,
				riskLevel,
				`Группа из ${allIncidents.length} инцидентов типа "${incident.type}" в "${incident.location}".`,
				alert.id,
			],
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
				`Группа из ${allIncidents.length} инцидентов типа "${incident.type}" в "${incident.location}".`,
				maxRisk,
				riskLevel,
				allIncidents.length,
				allIncidents[allIncidents.length - 1].created_at,
			],
		)
		alert = newAlert.rows[0]
	}

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

	await pool.query('INSERT INTO logs (action, user_email) VALUES ($1, $2)', [
		`[CORRELATION] Алерт #${alert.id}: "${title}" (${allIncidents.length} инцидентов)`,
		'system',
	])

	return alert
}

module.exports = { correlateIncident }
