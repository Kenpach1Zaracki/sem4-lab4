const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const dotenv = require('dotenv')
const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const rateLimit = require('express-rate-limit')

dotenv.config()

const app = express()

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
	apis: ['./routes/*.js'], // Парсит комментарии прямо из роутов
}
const swaggerDocs = swaggerJsDoc(swaggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))

// ─── MIDDLEWARE (БЕЗОПАСНОСТЬ) ───
app.use(helmet())
app.use(helmet.xssFilter())
app.use(helmet.hidePoweredBy())
app.use(cors())
app.use(express.json())

// Подключаем базу
require('./db')

// ─── RATE LIMITING ДЛЯ ЛОГИНА ───
// Rate limiting: 5 попыток в минуту
const loginLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 минута
	max: 5, // 5 попыток
	message: { error: 'Слишком много попыток входа. Попробуйте через минуту.' },
	standardHeaders: true,
	legacyHeaders: false,
})

// ─── ROUTES (МАРШРУТЫ) ───
const authRoutes = require('./routes/auth')

// Применяем rate limiting только к POST /login
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
app.use('/api', require('./routes/comments'))
app.use('/api/dataset', require('./routes/dataset'))
app.use('/api/correlation', require('./routes/correlation'))

// ─── ПРОСТОЙ ТЕСТОВЫЙ РОУТ ───
app.get('/api/health', (req, res) => {
	res.json({ status: 'ok', message: 'Сервер работает!' })
})

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
