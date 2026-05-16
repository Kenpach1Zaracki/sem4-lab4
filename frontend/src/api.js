import axios from 'axios'

// Если мы на Render, берем ссылку из переменной, иначе localhost
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'

export const api = axios.create({
	baseURL: API_URL,
})

api.interceptors.request.use(config => {
	const token = localStorage.getItem('token')
	if (token) {
		config.headers.Authorization = `Bearer ${token}`
	}
	return config
})

// Если токен истёк — разлогиниваем пользователя
api.interceptors.response.use(
	response => response,
	error => {
		if (error.response?.status === 401) {
			localStorage.removeItem('token')
			localStorage.removeItem('currentUser')
			window.location.href = '/login'
		}
		return Promise.reject(error)
	},
)
