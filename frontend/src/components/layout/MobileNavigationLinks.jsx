import { Link } from '@/lib/navigation'
import { navItems, isNavigationActive } from '@/lib/siteNavigation'

export default function MobileNavigationLinks({ pathname, onNavigate }) {
  return <ul className="grid grid-cols-2 gap-x-2 gap-y-1">{navItems.map(item => {
    const active = isNavigationActive(pathname, item.path)
    return <li key={item.path} className={item.path === '/' ? 'col-span-2' : undefined}>
      <Link href={item.path} onClick={onNavigate} aria-current={active ? 'page' : undefined}
        className={`flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500 ${active ? 'bg-green-50 font-semibold text-green-700 dark:bg-sage-900/30 dark:text-sage-400' : 'text-gray-700 hover:bg-gray-50 dark:text-night-200 dark:hover:bg-night-700'}`}>
        {item.label}
      </Link>
    </li>
  })}</ul>
}
