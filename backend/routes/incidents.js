const express = require('express')
const router = express.Router()
const pool = require('../db')
const { authMiddleware } = require('../middleware/auth')
const fs = require('fs')
const path = require('path')

// Функция резервного логирования в файл (Защита ИБ)
const logToFile = (message) => {
	const logPath = path.join(__dirname, '../../audit.log')
	const time = new Date().toISOString()
	const logString = `[${time}] SECURITY AUDIT: ${message}\n`
	fs.appendFile(logPath, logString, (err) => {
		if (err) console.error('Ошибка записи в audit.log', err)
	})
}

router.use(authMiddleware)

router.get('/', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM incidents ORDER BY id DESC')
		res.json(result.rows)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

router.post('/', async (req, res) => {
	if (req.user.role === 'user') return res.status(403).json({ error: 'Нет прав' })
	
	const { type, location, severity, status, assignedTo } = req.body
	try {
		const result = await pool.query(
			'INSERT INTO incidents (type, location, severity, status, "assignedTo") VALUES ($1, $2, $3, $4, $5) RETURNING *',
			[type, location, severity, status, assignedTo]
		)
		const newIncident = result.rows[0]
		
		const logMsg = `Пользователь ${req.user.email} создал инцидент #${newIncident.id} (${type})`
		await pool.query('INSERT INTO logs (action) VALUES ($1)', [logMsg])
		logToFile(logMsg) // Пишем в текстовый файл
		
		res.json(newIncident)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

router.put('/:id', async (req, res) => {
	const { type, location, severity, status, assignedTo } = req.body
	try {
		const check = await pool.query('SELECT * FROM incidents WHERE id = $1', [req.params.id])
		if (check.rows.length === 0) return res.status(404).json({ error: 'Не найден' })
		
		const incident = check.rows[0]
		if (req.user.role === 'user') return res.status(403).json({ error: 'Нет прав' })
		
		if (req.user.role === 'investigator' && incident.assignedTo !== req.user.email) {
			return res.status(403).json({ error: 'Вы не назначены на этот инцидент' })
		}

		const result = await pool.query(
			'UPDATE incidents SET type=$1, location=$2, severity=$3, status=$4, "assignedTo"=$5 WHERE id=$6 RETURNING *',
			[type, location, severity, status, assignedTo, req.params.id]
		)
		
		const logMsg = `Пользователь ${req.user.email} отредактировал инцидент #${req.params.id}`
		await pool.query('INSERT INTO logs (action) VALUES ($1)', [logMsg])
		logToFile(logMsg) // Пишем в текстовый файл

		res.json(result.rows[0])
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

router.delete('/:id', async (req, res) => {
	try {
		await pool.query('DELETE FROM incidents WHERE id = $1', [req.params.id])
		const logMsg = `Пользователь ${req.user.email} удалил инцидент #${req.params.id}`
		await pool.query('INSERT INTO logs (action) VALUES ($1)', [logMsg])
		logToFile(logMsg) // Пишем в текстовый файл
		
		res.json({ message: 'Удалено' })
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

module.exports = router
