import React from 'react'

const ConfirmModal = ({
	isOpen,
	title = 'Подтверждение',
	message,
	confirmText = 'Подтвердить',
	cancelText = 'Отмена',
	onConfirm,
	onCancel,
	danger = false,
}) => {
	if (!isOpen) return null

	return (
		<div className='modal-overlay' onMouseDown={onCancel}>
			<div className='modal' onMouseDown={e => e.stopPropagation()}>
				<div className='modal-header'>
					<div className='modal-title'>{title}</div>
				</div>

				{message && <div className='modal-body'>{message}</div>}

				<div className='modal-actions'>
					<button className='btn btn-ghost' onClick={onCancel}>
						{cancelText}
					</button>

					<button
						className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
						onClick={onConfirm}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	)
}

export default ConfirmModal
