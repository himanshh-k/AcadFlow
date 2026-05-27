import axios from 'axios'

// Always use the explicit backend URL to avoid Vite proxy mismatches for root endpoints (like /login)
const BASE_URL = 'http://127.0.0.1:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('acadflow_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function generateTimetable(payload) {
  const { data } = await api.post('/api/v1/generate', payload)
  return data
}

export async function exportExcel({ schedule, num_days, num_periods }) {
  const res = await api.post(
    '/api/v1/export/excel',
    { schedule, num_days, num_periods },
    { responseType: 'blob' },
  )
  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'AcadFlow_Timetable_Formatted.xlsx'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export async function scheduleExtra(body) {
  const { data } = await api.post('/api/v1/schedule-extra', body)
  return data
}

export async function rescheduleDynamic(body) {
  const { data } = await api.post('/api/v1/reschedule-dynamic', body)
  return data
}

export function getErrorMessage(err) {
  if (err.response?.data?.detail) {
    const d = err.response.data.detail
    return typeof d === 'string' ? d : JSON.stringify(d)
  }
  return err.message || 'Request failed'
}
