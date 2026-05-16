// Сохранить токен и пользователя после логина
export const saveUser = (user, token) => {
	localStorage.setItem('currentUser', JSON.stringify(user))
	localStorage.setItem('token', token)
}

// Получить текущего пользователя
export const getUser = () => {
	const user = localStorage.getItem('currentUser')
	return user ? JSON.parse(user) : null
}

// Удалить пользователя и токен (выход)
export const removeUser = () => {
	localStorage.removeItem('currentUser')
	localStorage.removeItem('token')
}

// Проверить, залогинен ли пользователь
export const isLoggedIn = () => {
	return localStorage.getItem('token') !== null
}
