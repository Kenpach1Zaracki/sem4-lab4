const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const { authMiddleware } = require('../middleware/auth')

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Аутентификация, авторизация и управление сессиями
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Успешная регистрация, выдан токен
 *       400:
 *         description: Ошибка валидации или email занят
 */
router.post('/register', async (req, res) => {
	const { name, email, password } = req.body
	if (!name || !email || !password || password.length < 6) {
		return res.status(400).json({ error: 'Заполните все поля (пароль минимум 6 символов)' })
	}

	try {
		const hashedPassword = await bcrypt.hash(password, 10)
		const result = await pool.query(
			`INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'user') RETURNING id, name, email, role`,
			[name, email, hashedPassword]
		)
		const user = result.rows[0]
		
		await pool.query('INSERT INTO logs (action) VALUES ($1)', [`Зарегистрирован новый пользователь: ${email}`])

		const token = jwt.sign(
			{ id: user.id, email: user.email, role: user.role, name: user.name },
			process.env.JWT_SECRET,
			{ expiresIn: '24h' }
		)
		res.status(201).json({ token, user })
	} catch (err) {
		if (err.code === '23505') return res.status(400).json({ error: 'Email уже занят' })
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешная авторизация, выдан токен
 *       401:
 *         description: Неверный логин или пароль
 */
router.post('/login', async (req, res) => {
	const { email, password } = req.body
	if (!email || !password) return res.status(400).json({ error: 'Заполните все поля' })

	try {
		const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
		if (result.rows.length === 0) return res.status(401).json({ error: 'Неверный email или пароль' })

		const user = result.rows[0]
		const isMatch = await bcrypt.compare(password, user.password)
		if (!isMatch) return res.status(401).json({ error: 'Неверный email или пароль' })

		const token = jwt.sign(
			{ id: user.id, email: user.email, role: user.role, name: user.name },
			process.env.JWT_SECRET,
			{ expiresIn: '24h' }
		)

		const { password: _, ...userWithoutPassword } = user
		res.json({ token, user: userWithoutPassword })
	} catch (err) {
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

/**
 * @swagger
 * /api/auth/refresh:
 *   get:
 *     summary: Продление сессии (Refresh JWT)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Выдан новый свежий токен на 24 часа
 *       401:
 *         description: Текущий токен недействителен или истек
 */
router.get('/refresh', authMiddleware, async (req, res) => {
	try {
		// Токен пользователя уже проверен мидлварью authMiddleware
		const token = jwt.sign(
			{ id: req.user.id, email: req.user.email, role: req.user.role, name: req.user.name },
			process.env.JWT_SECRET,
			{ expiresIn: '24h' }
		)
		res.json({ token, user: req.user })
	} catch (err) {
		res.status(500).json({ error: 'Ошибка при обновлении токена' })
	}
})

module.exports = router
