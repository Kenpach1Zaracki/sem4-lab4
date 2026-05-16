const { Pool } = require('pg')

// Если есть DATABASE_URL (на Render), используем его.
// Иначе берем локальные настройки (для твоего компа).
const poolConfig = process.env.DATABASE_URL
	? {
			connectionString: process.env.DATABASE_URL,
			ssl: { rejectUnauthorized: false }, // Обязательно для облачных БД
		}
	: {
			user: 'postgres',
			host: 'localhost',
			database: 'safetrack',
			password: 'твой_пароль_от_локальной_бд', // Замени на свой, если нужно для локалхоста
			port: 5432,
		}

const pool = new Pool(poolConfig)

pool
	.connect()
	.then(() => console.log('✅ Успешно подключено к PostgreSQL'))
	.catch(err =>
		console.error('❌ Ошибка подключения к PostgreSQL:', err.message),
	)

module.exports = pool
