import { ref, reactive } from 'vue'

// Toast 状态
const toastState = reactive({
  visible: false,
  message: '',
  type: 'info',
  duration: 3000
})

// Confirm 状态
const confirmState = reactive({
  visible: false,
  title: '确认操作',
  message: '',
  type: 'primary',
  resolve: null
})

// Prompt 状态
const promptState = reactive({
  visible: false,
  title: '请输入',
  defaultValue: '',
  placeholder: '',
  resolve: null
})

// 显示 Toast
export const showToast = (message, type = 'info', duration = 3000) => {
  toastState.message = message
  toastState.type = type
  toastState.duration = duration
  toastState.visible = true
}

// 关闭 Toast
export const hideToast = () => {
  toastState.visible = false
}

// 显示确认弹窗
export const showConfirm = (message, title = '确认操作', type = 'primary') => {
  return new Promise((resolve) => {
    confirmState.message = message
    confirmState.title = title
    confirmState.type = type
    confirmState.visible = true
    confirmState.resolve = resolve
  })
}

// 确认
export const onConfirmConfirm = () => {
  if (confirmState.resolve) {
    confirmState.resolve(true)
  }
  confirmState.visible = false
  confirmState.resolve = null
}

// 取消确认
export const onCancelConfirm = () => {
  if (confirmState.resolve) {
    confirmState.resolve(false)
  }
  confirmState.visible = false
  confirmState.resolve = null
}

// 显示输入弹窗
export const showPrompt = (title = '请输入', defaultValue = '', placeholder = '') => {
  return new Promise((resolve) => {
    promptState.title = title
    promptState.defaultValue = defaultValue
    promptState.placeholder = placeholder
    promptState.visible = true
    promptState.resolve = resolve
  })
}

// 确认输入
export const onConfirmPrompt = (value) => {
  if (promptState.resolve) {
    promptState.resolve(value)
  }
  promptState.visible = false
  promptState.resolve = null
}

// 取消输入
export const onCancelPrompt = () => {
  if (promptState.resolve) {
    promptState.resolve(null)
  }
  promptState.visible = false
  promptState.resolve = null
}

// 导出状态供组件使用
export const useDialog = () => {
  return {
    toastState,
    confirmState,
    promptState,
    showToast,
    hideToast,
    showConfirm,
    onConfirmConfirm,
    onCancelConfirm,
    showPrompt,
    onConfirmPrompt,
    onCancelPrompt
  }
}
