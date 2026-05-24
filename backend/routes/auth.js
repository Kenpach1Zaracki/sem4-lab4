const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const { authMiddleware } = require('../middleware/auth')
const {
	generateCode,
	send2FACode,
	storeCode,
	verifyCode,
} = require('../services/twoFactorService')

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
		return res
			.status(400)
			.json({ error: 'Заполните все поля (пароль минимум 6 символов)' })
	}

	try {
		const hashedPassword = await bcrypt.hash(password, 10)
		const result = await pool.query(
			`INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'user') RETURNING id, name, email, role`,
			[name, email, hashedPassword],
		)
		const user = result.rows[0]

		await pool.query('INSERT INTO logs (action) VALUES ($1)', [
			`Зарегистрирован новый пользователь: ${email}`,
		])

		const token = jwt.sign(
			{ id: user.id, email: user.email, role: user.role, name: user.name },
			process.env.JWT_SECRET,
			{ expiresIn: '24h' },
		)
		res.status(201).json({ token, user })
	} catch (err) {
		if (err.code === '23505')
			return res.status(400).json({ error: 'Email уже занят' })
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему (шаг 1 - отправка 2FA кода)
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
 *         description: Код подтверждения отправлен на почту
 *       401:
 *         description: Неверный логин или пароль
 */
router.post('/login', async (req, res) => {
	const { email, password } = req.body
	if (!email || !password)
		return res.status(400).json({ error: 'Заполните все поля' })

	try {
		const result = await pool.query('SELECT * FROM users WHERE email = $1', [
			email,
		])
		if (result.rows.length === 0)
			return res.status(401).json({ error: 'Неверные учетные данные' })

		const user = result.rows[0]
		const isMatch = await bcrypt.compare(password, user.password)
		if (!isMatch)
			return res.status(401).json({ error: 'Неверные учетные данные' })

		// Генерируем 2FA код
		const code = generateCode()
		const { password: _, ...userWithoutPassword } = user
		storeCode(email, code, userWithoutPassword)

		// Отправляем код на почту
		const sent = await send2FACode(email, code, user.name)

		if (!sent.success) {
			return res
				.status(500)
				.json({ error: 'Ошибка отправки кода. Попробуйте позже.' })
		}

		res.json({
			require2FA: true,
			email: email,
			message: 'Код подтверждения отправлен на вашу почту',
		})
	} catch (err) {
		console.error('Login error:', err)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

/**
 * @swagger
 * /api/auth/verify-2fa:
 *   post:
 *     summary: Подтверждение 2FA кода (шаг 2)
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
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешная аутентификация, выдан токен
 *       401:
 *         description: Неверный или истекший код
 */
router.post('/verify-2fa', async (req, res) => {
	const { email, code } = req.body

	if (!email || !code) {
		return res.status(400).json({ error: 'Email и код обязательны' })
	}

	const result = verifyCode(email, code)

	if (!result.valid) {
		return res.status(401).json({ error: result.error })
	}

	const token = jwt.sign(
		{
			id: result.user.id,
			email: result.user.email,
			role: result.user.role,
			name: result.user.name,
		},
		process.env.JWT_SECRET,
		{ expiresIn: '24h' },
	)

	await pool.query('INSERT INTO logs (action, user_email) VALUES ($1, $2)', [
		`[2FA] Успешная двухфакторная аутентификация: ${email}`,
		email,
	])

	res.json({ token, user: result.user })
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
		const token = jwt.sign(
			{
				id: req.user.id,
				email: req.user.email,
				role: req.user.role,
				name: req.user.name,
			},
			process.env.JWT_SECRET,
			{ expiresIn: '24h' },
		)
		res.json({ token, user: req.user })
	} catch (err) {
		res.status(500).json({ error: 'Ошибка при обновлении токена' })
	}
})

module.exports = router
