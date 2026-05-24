import axios from 'axios'
import React from 'react'
import { createRoot } from 'react-dom/client'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'

export const api = axios.create({
	baseURL: API_URL,
})

// Хак для вызова Toast снаружи React-компонентов
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
		// Ошибка 401 - токен истёк или неверный
		if (error.response?.status === 401) {
			localStorage.removeItem('token')
			localStorage.removeItem('currentUser')
			window.location.href = '/login'
		}

		// 403 — просто не даём доступ, без всплывашек
		// Это ожидаемое поведение для пользователей с ограниченными правами
		// if (error.response?.status === 403) {
		//   Ничего не показываем
		// }

		return Promise.reject(error)
	},
)
