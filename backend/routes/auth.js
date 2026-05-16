const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db')

// Регистрация
router.post('/register', async (req, res) => {
	const { name, email, password } = req.body

	if (!name || !email || !password || password.length < 6) {
		return res
			.status(400)
			.json({ error: 'Заполните все поля (пароль минимум 6 символов)' })
	}

	try {
		// Хешируем пароль
		const hashedPassword = await bcrypt.hash(password, 10)

		// Создаем пользователя (по умолчанию роль user)
		const result = await pool.query(
			`INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, name, email, role`,
			[name, email, hashedPassword],
		)

		const user = result.rows[0]

		// Генерируем токен
		const token = jwt.sign(
			{ id: user.id, email: user.email, role: user.role, name: user.name },
			process.env.JWT_SECRET,
			{ expiresIn: '24h' },
		)

		res.status(201).json({ token, user })
	} catch (err) {
		if (err.code === '23505') {
			// Код ошибки уникальности (email уже есть)
			return res.status(400).json({ error: 'Email уже занят' })
		}
		console.error(err)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// Логин
router.post('/login', async (req, res) => {
	const { email, password } = req.body

	if (!email || !password) {
		return res.status(400).json({ error: 'Заполните все поля' })
	}

	try {
		const result = await pool.query('SELECT * FROM users WHERE email = $1', [
			email,
		])

		if (result.rows.length === 0) {
			return res.status(401).json({ error: 'Неверный email или пароль' })
		}

		const user = result.rows[0]
		const isMatch = await bcrypt.compare(password, user.password)

		if (!isMatch) {
			return res.status(401).json({ error: 'Неверный email или пароль' })
		}

		const token = jwt.sign(
			{ id: user.id, email: user.email, role: user.role, name: user.name },
			process.env.JWT_SECRET,
			{ expiresIn: '24h' },
		)

		const { password: _, ...userWithoutPassword } = user
		res.json({ token, user: userWithoutPassword })
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

module.exports = router
