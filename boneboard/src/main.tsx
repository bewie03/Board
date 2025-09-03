import { createRoot } from 'react-dom/client'
import './index.css'
import './utils/consoleFilter'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <App />
)
