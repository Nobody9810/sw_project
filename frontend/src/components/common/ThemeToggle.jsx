import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export default function ThemeToggle({ className = '', iconClassName = '', children, title }) {
  const { isDark, toggleTheme } = useTheme()
  const label = isDark ? '切换到浅色模式' : '切换到深色模式'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className}
      aria-label={label}
      title={title === undefined ? label : title}
    >
      {children}
      <span className={iconClassName}>
        <Moon size={18} className="dark:hidden" aria-hidden="true" />
        <Sun size={18} className="hidden dark:block" aria-hidden="true" />
      </span>
    </button>
  )
}
