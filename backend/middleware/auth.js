const jwt = require('jsonwebtoken')

// Проверка токена
const authMiddleware = (req, res, next) => {
	const authHeader = req.headers['authorization']

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res
			.status(401)
			.json({ error: 'Токен не предоставлен или неверный формат' })
	}

	const token = authHeader.split(' ')[1]

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET)
		req.user = decoded // Сохраняем данные пользователя из токена
		next() // Пропускаем дальше
	} catch (err) {
		return res.status(401).json({ error: 'Токен недействителен или истёк' })
	}
}

// Проверка роли: только админ
const requireAdmin = (req, res, next) => {
	if (req.user.role !== 'admin') {
		return res
			.status(403)
			.json({ error: 'Доступ запрещён: требуются права администратора' })
	}
	next()
}

module.exports = { authMiddleware, requireAdmin }
