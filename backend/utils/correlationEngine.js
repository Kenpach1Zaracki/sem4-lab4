const pool = require('../db')

async function correlateIncident(incident) {
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

	// Ищем похожие инциденты за последний час (только такой же type + location)
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

	// Если нет похожих — не создаём алерт
	if (related.rows.length === 0) return null

	const allIncidents = [incident, ...related.rows]
	const maxRisk = Math.max(...allIncidents.map(inc => inc.risk_score || 0))

	let riskLevel = 'low'
	if (maxRisk >= 75) riskLevel = 'critical'
	else if (maxRisk >= 50) riskLevel = 'high'
	else if (maxRisk >= 25) riskLevel = 'medium'

	const title = `Массовый инцидент: ${incident.type} в ${incident.location}`

	// Ищем существующий алерт по типу и локации
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
				`Обнаружена группа из ${allIncidents.length} связанных инцидентов типа "${incident.type}" в локации "${incident.location}". Максимальный риск: ${maxRisk}/100.`,
				alert.id,
			],
		)
	} else {
		// Минимум 2 инцидента для создания нового алерта
		if (allIncidents.length < 2) return null

		const newAlert = await pool.query(
			`
      INSERT INTO correlation_alerts (title, description, risk_score, risk_level, status, incident_count, first_seen, last_seen)
      VALUES ($1, $2, $3, $4, 'new', $5, $6, NOW())
      RETURNING *
    `,
			[
				title,
				`Обнаружена группа из ${allIncidents.length} связанных инцидентов типа "${incident.type}" в локации "${incident.location}". Максимальный риск: ${maxRisk}/100.`,
				maxRisk,
				riskLevel,
				allIncidents.length,
				allIncidents[allIncidents.length - 1].created_at,
			],
		)
		alert = newAlert.rows[0]
	}

	// Привязываем инциденты к алерту
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

	// Логируем
	await pool.query('INSERT INTO logs (action, user_email) VALUES ($1, $2)', [
		`[CORRELATION] Создан/обновлён алерт #${alert.id}: "${title}" (${allIncidents.length} инцидентов, риск ${maxRisk}/100)`,
		'system',
	])

	return alert
}

module.exports = { correlateIncident }
