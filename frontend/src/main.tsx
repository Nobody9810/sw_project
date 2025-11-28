import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initTheme } from './utils/themeUtils'

// 在应用启动前初始化主题
initTheme()

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Failed to find the root element')
}

ReactDOM.createRoot(rootElement).render(
  <App />
)

