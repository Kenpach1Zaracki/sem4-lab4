import axios from 'axios'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'

export const api = axios.create({
	baseURL: API_URL,
})

// eslint-disable-next-line no-unused-vars
let globalShowToast = null
export const setGlobalToast = showToast => {
	globalShowToast = showToast
}

api.interceptors.request.use(config => {
	const token = localStorage.getItem('token')
	if (token) {
		config.headers.Authorization = `Bearer ${token}`
	}
	return config
})

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
