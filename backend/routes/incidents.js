const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware, requireAdmin } = require('../middleware/auth')

// Все роуты здесь требуют авторизации (токен)
router.use(authMiddleware)

// 1. ПОЛУЧИТЬ ВСЕ ИНЦИДЕНТЫ (GET)
// Admin видит всё, investigator только свои, user - только сводку (здесь просто все)
router.get('/', async (req, res) => {
	try {
		let query
		let params = []

		if (req.user.role === 'investigator') {
			// Расследователь видит только те инциденты, где он назначен
			query = `
        SELECT i.id, i.date, i.status, i.last_modified, 
               it.danger_level AS severity, it.description AS type, 
               s.description AS location, e.email AS assigned_to
        FROM incidents i
        LEFT JOIN incidenttypes it ON i.type_id = it.id
        LEFT JOIN sources s ON s.incident_id = i.id
        LEFT JOIN employees e ON e.incident_id = i.id
        WHERE e.email = $1
        ORDER BY i.date DESC
      `
			params = [req.user.email]
		} else {
			// Админ и обычный Юзер видят общий список
			query = `
        SELECT i.id, i.date, i.status, i.last_modified, 
               it.danger_level AS severity, it.description AS type, 
               s.description AS location, e.email AS assigned_to
        FROM incidents i
        LEFT JOIN incidenttypes it ON i.type_id = it.id
        LEFT JOIN sources s ON s.incident_id = i.id
        LEFT JOIN employees e ON e.incident_id = i.id
        ORDER BY i.date DESC
      `
		}

		const result = await pool.query(query, params)

		// Форматируем для фронтенда
		const incidents = result.rows.map(row => ({
			id: row.id,
			type: row.type ? row.type.trim() : 'Не указано',
			location: row.location ? row.location.trim() : 'Не указано',
			severity: row.severity ? row.severity.trim() : 'Низкий',
			status: row.status ? row.status.trim() : 'Открыт',
			assignedTo: row.assigned_to ? row.assigned_to.trim() : '',
			date: row.date,
		}))

		res.json(incidents)
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: 'Ошибка получения инцидентов' })
	}
})

// 2. СОЗДАТЬ ИНЦИДЕНТ (POST) - Могут делать Admin или Investigator
router.post('/', async (req, res) => {
	if (req.user.role === 'user') {
		return res
			.status(403)
			.json({ error: 'У вас нет прав на создание инцидента' })
	}

	const { type, location, severity, status, assignedTo } = req.body
	const client = await pool.connect()

	try {
		await client.query('BEGIN') // Начинаем транзакцию

		// Ищем или создаем тип инцидента
		const dangerLevel = severity || 'Низкий'
		let typeRes = await client.query(
			'SELECT id FROM incidenttypes WHERE danger_level = $1',
			[dangerLevel.padEnd(50)],
		)
		let typeId
		if (typeRes.rows.length === 0) {
			const newType = await client.query(
				'INSERT INTO incidenttypes (danger_level, description) VALUES ($1, $2) RETURNING id',
				[dangerLevel, type || 'Новый тип'],
			)
			typeId = newType.rows[0].id
		} else {
			typeId = typeRes.rows[0].id
		}

		// Создаем инцидент
		const incRes = await client.query(
			`INSERT INTO incidents (date, type_id, status) VALUES (NOW(), $1, $2) RETURNING id, date, status`,
			[typeId, status || 'Открыт'],
		)
		const newIncident = incRes.rows[0]

		// Создаем источник (Местоположение)
		await client.query(
			`INSERT INTO sources (source_type, incident_id, description) VALUES ('Система', $1, $2)`,
			[newIncident.id, location || 'Неизвестно'],
		)

		// Назначаем сотрудника
		if (assignedTo) {
			await client.query(
				`INSERT INTO employees (first_name, last_name, position, email, incident_id) 
         VALUES ('Имя', 'Фамилия', 'Расследователь', $1, $2)`,
				[assignedTo, newIncident.id],
			)
		}

		await client.query('COMMIT') // Сохраняем транзакцию
		res.status(201).json({ message: 'Инцидент создан', id: newIncident.id })
	} catch (err) {
		await client.query('ROLLBACK') // Отменяем в случае ошибки
		console.error(err)
		res.status(500).json({ error: 'Ошибка создания инцидента' })
	} finally {
		client.release()
	}
})

// 3. УДАЛИТЬ ИНЦИДЕНТ (DELETE) - Только Admin
router.delete('/:id', requireAdmin, async (req, res) => {
	try {
		// Каскадное удаление уберет связанные записи из sources, employees
		const result = await pool.query(
			'DELETE FROM incidents WHERE id = $1 RETURNING id',
			[req.params.id],
		)

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Инцидент не найден' })
		}

		res.json({ message: 'Инцидент удален' })
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: 'Ошибка при удалении инцидента' })
	}
})

module.exports = router
