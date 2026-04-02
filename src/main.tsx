import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { ToastContainer } from 'react-toastify'
import { store } from './store/store'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
      <ToastContainer position="top-right" autoClose={3000} />
    </Provider>
  </StrictMode>,
)
