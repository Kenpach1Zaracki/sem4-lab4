import emailjs from '@emailjs/browser'

// 1. Инициализация твоим Public Key
emailjs.init('6DVOEcdg-NWDwXvv9')

export const sendRealEmail = async (type, data) => {
	const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
	const timestamp = new Date().toLocaleString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})

	let subject = ''
	let message = ''

	switch (type) {
		case 'CREATE':
			subject = `🔔 Новый инцидент: ${data.type}`
			message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
          <h2 style="color: #ff4d00; border-bottom: 2px solid #ff4d00; padding-bottom: 10px;">
            🚨 Создан новый инцидент
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; width: 150px;">Тип:</td><td style="padding: 8px;">${data.type}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Место:</td><td style="padding: 8px;">${data.location}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Тяжесть:</td><td style="padding: 8px;">${data.severity}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Статус:</td><td style="padding: 8px;">${data.status}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Создал:</td><td style="padding: 8px;">${currentUser.name} (${currentUser.email})</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Время:</td><td style="padding: 8px;">${timestamp}</td></tr>
          </table>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            Это автоматическое уведомление от системы SafeTrack
          </p>
        </div>
      `
			break

		case 'DELETE':
			subject = `🗑️ Удалён инцидент #${data.id}: ${data.type}`
			message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
          <h2 style="color: #ff3b3b; border-bottom: 2px solid #ff3b3b; padding-bottom: 10px;">
            ❌ Инцидент удалён
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; width: 150px;">ID:</td><td style="padding: 8px;">#${data.id}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Тип:</td><td style="padding: 8px;">${data.type}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Место:</td><td style="padding: 8px;">${data.location}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Тяжесть:</td><td style="padding: 8px;">${data.severity}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Удалил:</td><td style="padding: 8px;">${currentUser.name} (${currentUser.email})</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Время:</td><td style="padding: 8px;">${timestamp}</td></tr>
          </table>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            Это автоматическое уведомление от системы SafeTrack
          </p>
        </div>
      `
			break

		default:
			console.error('Неизвестный тип письма:', type)
			return { success: false, error: 'Unknown type' }
	}

	try {
		const templateParams = {
			subject: subject,
			message: message,
		}

		// 2. Отправка с твоими Service ID и Template ID
		const response = await emailjs.send(
			'service_xp6vwpo',
			'template_ry39sxa',
			templateParams,
		)

		console.log(`📧 [EMAIL SENT] ${subject}`)
		return { success: true, response }
	} catch (error) {
		console.error('❌ Ошибка отправки email:', error)
		return { success: false, error }
	}
}
