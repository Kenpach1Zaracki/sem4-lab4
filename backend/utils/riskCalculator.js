/**
 * Risk Calculator для SafeTrack
 * Автоматически рассчитывает risk_score (0-100), risk_level и detection_reason
 */

const SEVERITY_WEIGHTS = {
	Низкий: 10,
	Средний: 25,
	Высокий: 50,
	Критический: 70,
}

const CATEGORY_WEIGHTS = {
	'Утечка данных': 40,
	'Несанкционированный доступ': 45,
	'Вредоносное ПО': 35,
	'Физическое проникновение': 40,
	'Отказ оборудования': 30,
	'Нарушение ТБ': 20,
	'Ошибка персонала': 10,
}

const LOCATION_WEIGHTS = {
	Серверная: 15,
	'Склад ГСМ': 15,
	Лаборатория: 10,
	'Цех №1': 5,
	'Цех №3': 5,
}

function getRiskLevel(score) {
	if (score >= 75) return 'critical'
	if (score >= 50) return 'high'
	if (score >= 25) return 'medium'
	return 'low'
}

function getRiskLevelLabel(level) {
	const labels = {
		low: 'Низкий',
		medium: 'Средний',
		high: 'Высокий',
		critical: 'Критический',
	}
	return labels[level] || level
}

function calculateRisk(incident) {
	const { type, location, severity } = incident
	let score = 0
	const reasons = []

	const severityWeight = SEVERITY_WEIGHTS[severity] || 0
	if (severityWeight > 0) {
		score += severityWeight
		reasons.push(
			`${severity.toLowerCase()} уровень критичности (+${severityWeight})`,
		)
	}

	const categoryWeight = CATEGORY_WEIGHTS[type] || 10
	score += categoryWeight
	reasons.push(`тип "${type}" (+${categoryWeight})`)

	const locationWeight = LOCATION_WEIGHTS[location] || 0
	if (locationWeight > 0) {
		score += locationWeight
		reasons.push(`локация "${location}" (+${locationWeight})`)
	}

	score = Math.min(score, 100)
	const riskLevel = getRiskLevel(score)
	const isSuspicious = score >= 50

	let detectionReason
	if (isSuspicious) {
		detectionReason =
			`⚠️ Подозрительный инцидент (${score}/100): ` + reasons.join('; ') + '.'
	} else {
		detectionReason =
			`✅ Низкий риск (${score}/100): ` + reasons.join('; ') + '.'
	}

	return {
		risk_score: score,
		risk_level: riskLevel,
		risk_level_label: getRiskLevelLabel(riskLevel),
		detection_reason: detectionReason,
		is_suspicious: isSuspicious,
		analyzed_at: new Date().toISOString(),
	}
}

module.exports = { calculateRisk }
