const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	database: process.env.DB_NAME,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
})

// Проверяем подключение при старте
pool.connect((err, client, release) => {
	if (err) {
		console.error('❌ Ошибка подключения к PostgreSQL:', err.message)
	} else {
		console.log('✅ PostgreSQL подключена успешно')
		release()
	}
})

module.exports = pool
