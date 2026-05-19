import React, { createContext, useContext, useState } from 'react'

const ToastContext = createContext()

export const useToast = () => useContext(ToastContext)

export const ToastProvider = ({ children }) => {
	const [toasts, setToasts] = useState([])

	const showToast = (message, type = 'success') => {
		const id = Date.now()
		setToasts(prev => [...prev, { id, message, type }])

		setTimeout(() => {
			setToasts(prev => prev.filter(toast => toast.id !== id))
		}, 4000)
	}

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			<div className='toast-container'>
				{toasts.map(toast => (
					<div key={toast.id} className={`toast toast-${toast.type}`}>
						{toast.message}
					</div>
				))}
			</div>
		</ToastContext.Provider>
	)
}
