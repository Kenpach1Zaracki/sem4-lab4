const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')

dotenv.config()

const app = express()

// ─── MIDDLEWARE ───
app.use(cors())
app.use(express.json())

// Подключаем базу
require('./db')

// ─── ROUTES (МАРШРУТЫ) ───
app.use('/api/auth', require('./routes/auth'))
app.use('/api/incidents', require('./routes/incidents'))
app.use('/api/admin', require('./routes/admin'))

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
