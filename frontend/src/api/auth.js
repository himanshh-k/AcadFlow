import { api } from './client'

export async function loginUser(username, password) {
  const formData = new URLSearchParams()
  formData.append('username', username)
  formData.append('password', password)
  
  const { data } = await api.post('/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  return data
}

export async function getActiveTimetable() {
  const { data } = await api.get('/active_timetable')
  return data
}

export async function exportTeacherExcel({ schedule, num_days, num_periods, teacher }) {
  const res = await api.post(
    `/export_teacher?teacher=${encodeURIComponent(teacher)}`,
    { schedule, num_days, num_periods },
    { responseType: 'blob' },
  )
  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${teacher}_schedule.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
