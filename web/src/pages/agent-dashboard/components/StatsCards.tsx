import type { DashboardStats } from '@/lib/customerApi';

export default function StatsCards({ stats: realStats }: { stats?: DashboardStats }) {
  const stats = [
    { label: '在线坐席', value: String(realStats?.online_agents ?? 0), change: '+0', icon: 'ri-customer-service-2-line', lightColor: 'bg-brand-50 text-brand-600' },
    { label: '待处理', value: String(realStats?.waiting_sessions ?? 0), change: '+0', icon: 'ri-time-line', lightColor: 'bg-amber-50 text-amber-600' },
    { label: '服务中', value: String(realStats?.serving_sessions ?? 0), change: '+0', icon: 'ri-chat-3-line', lightColor: 'bg-emerald-50 text-emerald-600' },
    { label: '今日消息', value: String(realStats?.today_messages ?? 0), change: '+0', icon: 'ri-message-3-line', lightColor: 'bg-sky-50 text-sky-600' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-xl border border-slate-100 p-5 shadow-soft hover:shadow-card transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl ${stat.lightColor} flex items-center justify-center`}>
              <i className={`${stat.icon} text-lg`} />
            </div>
            <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-emerald-600' : 'text-amber-600'} bg-slate-50 px-2 py-0.5 rounded-full`}>
              {stat.change}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
          <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
