import { useState } from 'react';

const navItems = [
  { key: 'dashboard', icon: 'ri-dashboard-3-line', label: '概览' },
  { key: 'sessions', icon: 'ri-chat-3-line', label: '会话' },
  { key: 'customers', icon: 'ri-user-search-line', label: '客户' },
  { key: 'analytics', icon: 'ri-bar-chart-2-line', label: '分析' },
  { key: 'settings', icon: 'ri-settings-4-line', label: '设置' },
];

export default function Sidebar({ active, onChange }: { active: string; onChange: (key: string) => void }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col bg-slate-900 text-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
          <i className="ri-chat-smile-3-line text-white" />
        </div>
        {!collapsed && <span className="ml-3 font-semibold text-white">ChatFlow</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              active === item.key
                ? 'bg-brand-500/20 text-brand-400'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className={item.icon} />
            </div>
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-xl text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
        >
          <i className={`ri-${collapsed ? 'arrow-right' : 'arrow-left'}-line`} />
        </button>
      </div>
    </aside>
  );
}