const request = require('supertest')
const express = require('express')
const jwt = require('jsonwebtoken')

jest.mock('../db', () => ({
	query: jest.fn(),
	connect: jest.fn(() => Promise.resolve()),
}))

const pool = require('../db')

const app = express()
app.use(express.json())

const authRoutes = require('../routes/auth')
const incidentRoutes = require('../routes/incidents')
const analyticsRoutes = require('../routes/analytics')
const correlationRoutes = require('../routes/correlation')
const datasetRoutes = require('../routes/dataset')

app.use('/api/auth', authRoutes)
app.use('/api/incidents', incidentRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/correlation', correlationRoutes)
app.use('/api/dataset', datasetRoutes)

process.env.JWT_SECRET = 'test_secret_key_12345'

const generateToken = (role = 'admin', email = 'test@test.com') => {
	return jwt.sign(
		{ id: 1, email, role, name: 'Test User' },
		process.env.JWT_SECRET,
		{ expiresIn: '1h' },
	)
}

describe('БЕЗОПАСНОСТЬ', () => {
	test('401 — запрос без токена отклоняется', async () => {
		const res = await request(app).get('/api/incidents')
		expect(res.status).toBe(401)
	})

	test('401 — неверный формат токена отклоняется', async () => {
		const res = await request(app)
			.get('/api/incidents')
			.set('Authorization', 'InvalidToken')
		expect(res.status).toBe(401)
	})

	test('200 — с валидным токеном доступ разрешён', async () => {
		pool.query.mockResolvedValueOnce({ rows: [] })
		const res = await request(app)
			.get('/api/incidents')
			.set('Authorization', `Bearer ${generateToken('admin')}`)
		expect(res.status).toBe(200)
	})

	test('400 — создание инцидента без обязательных полей', async () => {
		const res = await request(app)
			.post('/api/incidents')
			.set('Authorization', `Bearer ${generateToken('admin')}`)
			.send({ type: '', location: '', severity: '' })
		expect(res.status).toBe(400)
		expect(res.body.error).toContain('обязательны')
	})

	test('400 — вход без email и пароля', async () => {
		const res = await request(app)
			.post('/api/auth/login')
			.send({ email: '', password: '' })
		expect(res.status).toBe(400)
	})

	test('401 — неверные учетные данные', async () => {
		pool.query.mockResolvedValueOnce({ rows: [] })
		const res = await request(app)
			.post('/api/auth/login')
			.send({ email: 'fake@test.com', password: 'wrong' })
		expect(res.status).toBe(401)
	})

	test('400 — 2FA без кода', async () => {
		const res = await request(app)
			.post('/api/auth/verify-2fa')
			.send({ email: 'test@test.com', code: '' })
		expect(res.status).toBe(400)
	})
})

describe('ФУНКЦИОНАЛЬНОСТЬ', () => {
	test('GET /api/analytics/summary — возвращает сводку', async () => {
		pool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] })
		pool.query.mockResolvedValueOnce({ rows: [{ count: '3' }] })
		pool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] })
		pool.query.mockResolvedValueOnce({ rows: [{ count: '4' }] })
		pool.query.mockResolvedValueOnce({ rows: [{ avg: '45.5' }] })
		pool.query.mockResolvedValueOnce({
			rows: [{ risk_level: 'high', count: '3' }],
		})
		pool.query.mockResolvedValueOnce({ rows: [{ type: 'Утечка', count: '2' }] })
		pool.query.mockResolvedValueOnce({
			rows: [{ location: 'Цех №1', count: '3' }],
		})

		const res = await request(app)
			.get('/api/analytics/summary')
			.set('Authorization', `Bearer ${generateToken('admin')}`)
		expect(res.status).toBe(200)
		expect(res.body).toHaveProperty('total_incidents')
	})

	test('GET /api/correlation/alerts — список алертов', async () => {
		pool.query.mockResolvedValueOnce({ rows: [] })
		const res = await request(app)
			.get('/api/correlation/alerts')
			.set('Authorization', `Bearer ${generateToken('admin')}`)
		expect(res.status).toBe(200)
	})

	test('GET /api/dataset/sample — скачивание примера CSV', async () => {
		const res = await request(app)
			.get('/api/dataset/sample')
			.set('Authorization', `Bearer ${generateToken('admin')}`)
		expect(res.status).toBe(200)
		expect(res.headers['content-type']).toContain('csv')
	})
})

describe('РОЛЕВАЯ МОДЕЛЬ', () => {
	test('403 — user не может создавать инциденты', async () => {
		const res = await request(app)
			.post('/api/incidents')
			.set('Authorization', `Bearer ${generateToken('user')}`)
			.send({ type: 'Test', location: 'Test', severity: 'Низкий' })
		expect(res.status).toBe(403)
	})

	test('200 — investigator может создавать инциденты', async () => {
		pool.query.mockResolvedValueOnce({
			rows: [
				{
					id: 1,
					type: 'Test',
					risk_score: 25,
					risk_level: 'medium',
					detection_reason: 'test',
					is_suspicious: false,
					analyzed_at: new Date().toISOString(),
				},
			],
		})
		const res = await request(app)
			.post('/api/incidents')
			.set('Authorization', `Bearer ${generateToken('investigator')}`)
			.send({ type: 'Test', location: 'Цех №1', severity: 'Низкий' })
		expect(res.status).toBe(200)
	})
})
