const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const dotenv = require('dotenv')
const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const rateLimit = require('express-rate-limit')

dotenv.config()

const app = express()

// ─── ПРОСТОЙ ТЕСТОВЫЙ РОУТ (без авторизации, ДО всех middleware) ───
app.get('/api/health', (req, res) => {
	res.json({
		status: 'ok',
		message: 'Сервер работает! Risk Calculator активен.',
	})
})

// ─── SWAGGER НАСТРОЙКИ (АВТОМАТИЧЕСКАЯ ДОКУМЕНТАЦИЯ API) ───
const swaggerOptions = {
	swaggerDefinition: {
		openapi: '3.0.0',
		info: {
			title: 'SafeTrack API',
			version: '1.0.0',
			description: 'API для системы мониторинга и расследования инцидентов ИБ',
		},
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
				},
			},
		},
		security: [{ bearerAuth: [] }],
	},
	apis: ['./routes/*.js'],
}
const swaggerDocs = swaggerJsDoc(swaggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))

// ─── MIDDLEWARE (БЕЗОПАСНОСТЬ) ───
app.use(helmet())
app.use(helmet.xssFilter())
app.use(helmet.hidePoweredBy())
app.use(cors())
app.use(express.json()) // ← ДОЛЖНО БЫТЬ ПЕРЕД РОУТАМИ

// Подключаем базу
require('./db')

// ─── RATE LIMITING ДЛЯ ЛОГИНА ───
const loginLimiter = rateLimit({
	windowMs: 1 * 60 * 1000,
	max: 5,
	message: { error: 'Слишком много попыток входа. Попробуйте через минуту.' },
	standardHeaders: true,
	legacyHeaders: false,
})

// ─── ROUTES (МАРШРУТЫ) ───
const authRoutes = require('./routes/auth')

app.use('/api/auth', (req, res, next) => {
	if (req.path === '/login' && req.method === 'POST') {
		return loginLimiter(req, res, next)
	}
	next()
})
app.use('/api/auth', authRoutes)

app.use('/api/incidents', require('./routes/incidents'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/analytics', require('./routes/analytics'))
app.use('/api/correlation', require('./routes/correlation'))
app.use('/api/dataset', require('./routes/dataset'))
app.use('/api', require('./routes/comments'))

// ─── ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК ───
app.use((err, req, res, next) => {
	console.error(err.message)
	res.status(500).json({ error: 'Внутренняя ошибка сервера' })
})

// ─── СТАРТ СЕРВЕРА ───
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
	console.log(`🚀 Сервер запущен на порту ${PORT}`)
})
