import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import { store } from './store/store'
import { queryClient } from './lib/query-client'
import './index.css'
import App from './App'
import { installErrorReporting } from './utils/error-reporter'
import 'react-toastify/dist/ReactToastify.css'

// Console errors to the admin Logs.
installErrorReporting()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <App />
        <ToastContainer 
          position="top-right" 
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          theme="light"
          toastClassName="premium-toast"
        />
      </Provider>
    </QueryClientProvider>
  </StrictMode>,
)
