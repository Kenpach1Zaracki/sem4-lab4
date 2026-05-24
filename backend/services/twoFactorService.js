const axios = require('axios')

const PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || '6DVOEcdg-NWDwXvv9'
const SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_xp6vwpo'
const TEMPLATE_2FA = process.env.EMAILJS_TEMPLATE_2FA || 'template_1ya2woi'

const codeStore = new Map()

function generateCode() {
	return String(Math.floor(100000 + Math.random() * 900000))
}

async function send2FACode(email, code) {
	try {
		await axios.post('https://api.emailjs.com/api/v1.0/email/send', {
			service_id: SERVICE_ID,
			template_id: TEMPLATE_2FA,
			user_id: PUBLIC_KEY,
			template_params: {
				code: code,
				to_email: email,
			},
		})
		return { success: true }
	} catch (error) {
		console.error('Ошибка отправки 2FA кода:', error.message)
		return { success: false, error: error.message }
	}
}

function storeCode(email, code, user) {
	codeStore.set(email, {
		code,
		user,
		expires: Date.now() + 5 * 60 * 1000,
	})
}

function verifyCode(email, code) {
	const stored = codeStore.get(email)

	if (!stored) {
		return { valid: false, error: 'Код не найден. Запросите новый.' }
	}

	if (Date.now() > stored.expires) {
		codeStore.delete(email)
		return { valid: false, error: 'Код истёк. Запросите новый.' }
	}

	if (stored.code !== code) {
		return { valid: false, error: 'Неверный код' }
	}

	codeStore.delete(email)
	return { valid: true, user: stored.user }
}

module.exports = { generateCode, send2FACode, storeCode, verifyCode }
