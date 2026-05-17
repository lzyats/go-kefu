export default function StatsCards() {
  const stats = [
    { label: '在线会话', value: '12', change: '+3', icon: 'ri-chat-3-line', color: 'bg-brand-500', lightColor: 'bg-brand-50 text-brand-600' },
    { label: '待处理', value: '5', change: '-2', icon: 'ri-time-line', color: 'bg-amber-500', lightColor: 'bg-amber-50 text-amber-600' },
    { label: '今日消息', value: '1,284', change: '+12%', icon: 'ri-message-3-line', color: 'bg-sky-500', lightColor: 'bg-sky-50 text-sky-600' },
    { label: '满意度', value: '4.8', change: '+0.2', icon: 'ri-emotion-happy-line', color: 'bg-emerald-500', lightColor: 'bg-emerald-50 text-emerald-600' },
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