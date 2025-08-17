import React from 'react'
import './App.scss'
import { Components } from './components'
import MainRoutes from './routes'
import axios from 'axios'
import BarcodeScanner from './pages/code'
import { API } from './api'
import { useNavigate } from 'react-router-dom'

// axios.defaults.baseURL = 'https://aunkarabalta.pythonanywhere.com/clients'
axios.defaults.baseURL = 'http://127.0.0.1:8000/clients'

function App() {
  const nav = useNavigate()
  const path = window.location.pathname

  const isAdmin = JSON.parse(localStorage.getItem('isAdmin')) || false
  const auth = () => {
    if(!isAdmin){
      const code = prompt('Введите код доступа к админке')
      if(code === '4542'){
        localStorage.setItem('isAdmin', true)
        nav('/')
      }else if(code === '1234'){
        localStorage.setItem('isAdmin', false)
        nav('/kassa')
      }
    }
  }
  React.useEffect(() => {
    auth()
  }, [path])

  if(path === '/' || path === '/expenses' || path === '/finances' || path === '/stock' || path === 'codes') {
    auth()
  }

  return (
    <div>
      <Components.Navbar />
      <MainRoutes />
    </div>
  )
}

export default App
