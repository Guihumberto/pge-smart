// src/services/http.js
import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api',
  timeout: 10000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    if (status === 401) {
      // Redireciona sem importar o router — evita dependência circular
      localStorage.removeItem('access_token')
      window.location.href = '/auth/login'
    }

    const message = error.response?.data?.error ?? error.message
    return Promise.reject(new Error(message))
  }
)

export default http