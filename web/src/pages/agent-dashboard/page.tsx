import { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import StatsCards from './components/StatsCards';
import SessionList from './components/SessionList';
import ChatArea from './components/ChatArea';
import CustomerPanel from './components/CustomerPanel';

export default function AgentDashboard() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [activeSession, setActiveSession] = useState('1');

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <Sidebar active={activeNav} onChange={setActiveNav} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-800">
              {activeNav === 'dashboard' && '工作台概览'}
              {activeNav === 'sessions' && '会话管理'}
              {activeNav === 'customers' && '客户管理'}
              {activeNav === 'analytics' && '数据分析'}
              {activeNav === 'settings' && '系统设置'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
              <i className="ri-search-line text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="全局搜索..."
                className="bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 w-40"
              />
            </div>

            <button className="relative w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
              <i className="ri-notification-3-line" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-100">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-brand-600 text-sm font-medium">座</span>
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium text-slate-700">客服小王</div>
                <div className="text-[11px] text-emerald-500">在线</div>
              </div>
            </div>

            <Link
              to="/"
              className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
            >
              <i className="ri-home-line" />
            </Link>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {activeNav === 'dashboard' && (
            <div className="h-full overflow-y-auto p-6">
              <StatsCards />

              {/* Recent sessions preview */}
              <div className="mt-6 bg-white rounded-xl border border-slate-100 shadow-soft overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">最近会话</h3>
                  <button
                    onClick={() => setActiveNav('sessions')}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    查看全部
                  </button>
                </div>
                <div className="divide-y divide-slate-50">
                  {[
                    { name: '张小明', msg: '请问专业版包含哪些功能？', time: '2分钟前', status: 'active' },
                    { name: '李婉清', msg: '我已经付款了，什么时候可以开通？', time: '5分钟前', status: 'active' },
                    { name: '王建国', msg: '系统提示连接失败', time: '12分钟前', status: 'waiting' },
                    { name: '陈思思', msg: '好的，谢谢您的解答！', time: '30分钟前', status: 'closed' },
                  ].map((item) => (
                    <div key={item.name} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-slate-600">{item.name[0]}</span>
                        </div>
                        <div>
                          <div className="text-sm text-slate-800">{item.name}</div>
                          <div className="text-xs text-slate-400">{item.msg}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          item.status === 'active' ? 'bg-emerald-400' : item.status === 'waiting' ? 'bg-amber-400' : 'bg-slate-300'
                        }`} />
                        <span className="text-xs text-slate-400">{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance chart placeholder */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">今日会话趋势</h3>
                  <div className="h-40 flex items-end gap-2">
                    {[35, 52, 45, 60, 75, 68, 85, 72, 90, 65, 55, 70].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-md bg-brand-100 hover:bg-brand-200 transition-colors"
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[10px] text-slate-400">{i + 8}时</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">满意度分布</h3>
                  <div className="space-y-3">
                    {[
                      { label: '非常满意 (5星)', count: 86, total: 120, color: 'bg-emerald-500' },
                      { label: '满意 (4星)', count: 24, total: 120, color: 'bg-brand-500' },
                      { label: '一般 (3星)', count: 7, total: 120, color: 'bg-amber-400' },
                      { label: '不满意 (1-2星)', count: 3, total: 120, color: 'bg-red-400' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">{item.label}</span>
                          <span className="text-slate-500">{item.count}人</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full transition-all`}
                            style={{ width: `${(item.count / item.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeNav === 'sessions' && (
            <div className="h-full flex">
              <SessionList activeId={activeSession} onSelect={setActiveSession} />
              <ChatArea sessionId={activeSession} />
              <CustomerPanel sessionId={activeSession} />
            </div>
          )}

          {activeNav === 'customers' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="bg-white rounded-xl border border-slate-100 shadow-soft">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">客户列表</h3>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                    <i className="ri-search-line text-slate-400 text-sm" />
                    <input
                      type="text"
                      placeholder="搜索客户..."
                      className="bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 w-48"
                    />
                  </div>
                </div>
                <div className="divide-y divide-slate-50">
                  {[
                    { name: '张小明', company: '创想科技有限公司', lastVisit: '2分钟前', status: '在线', tags: ['潜在客户'] },
                    { name: '李婉清', company: '云端网络', lastVisit: '5分钟前', status: '在线', tags: ['已付款'] },
                    { name: '王建国', company: '智慧物联', lastVisit: '12分钟前', status: '离线', tags: ['技术问题'] },
                    { name: '陈思思', company: '优选电商', lastVisit: '30分钟前', status: '离线', tags: ['售后'] },
                    { name: '刘大伟', company: '未来教育', lastVisit: '1小时前', status: '在线', tags: ['高意向'] },
                    { name: '赵雪梅', company: '数字传媒', lastVisit: '2小时前', status: '离线', tags: ['售后'] },
                  ].map((c) => (
                    <div key={c.name} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-600">{c.name[0]}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800">{c.name}</div>
                          <div className="text-xs text-slate-400">{c.company}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {c.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] rounded-full">{tag}</span>
                          ))}
                        </div>
                        <span className={`text-xs ${c.status === '在线' ? 'text-emerald-500' : 'text-slate-400'}`}>{c.status}</span>
                        <span className="text-xs text-slate-400">{c.lastVisit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeNav === 'analytics' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  { label: '总会话数', value: '1,284', change: '+12%', icon: 'ri-chat-3-line', color: 'text-brand-500' },
                  { label: '平均响应时间', value: '42s', change: '-8s', icon: 'ri-time-line', color: 'text-emerald-500' },
                  { label: '解决率', value: '92.5%', change: '+3.2%', icon: 'ri-checkbox-circle-line', color: 'text-sky-500' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
                    <div className="flex items-center justify-between mb-3">
                      <i className={`${stat.icon} ${stat.color} text-xl`} />
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{stat.change}</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
                    <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">热门咨询话题</h3>
                  <div className="space-y-3">
                    {[
                      { topic: '产品定价咨询', count: 156, pct: 78 },
                      { topic: '技术支持', count: 98, pct: 52 },
                      { topic: '账户问题', count: 72, pct: 38 },
                      { topic: '功能建议', count: 45, pct: 24 },
                      { topic: '合作洽谈', count: 23, pct: 12 },
                    ].map((item) => (
                      <div key={item.topic} className="flex items-center gap-3">
                        <span className="text-xs text-slate-600 w-28 truncate">{item.topic}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-400 rounded-full" style={{ width: `${item.pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-10 text-right">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">客服表现排行</h3>
                  <div className="space-y-3">
                    {[
                      { name: '客服小王', sessions: 128, rating: 4.9, rank: 1 },
                      { name: '客服小李', sessions: 115, rating: 4.8, rank: 2 },
                      { name: '客服小张', sessions: 96, rating: 4.7, rank: 3 },
                      { name: '客服小陈', sessions: 89, rating: 4.6, rank: 4 },
                    ].map((agent) => (
                      <div key={agent.name} className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          agent.rank === 1 ? 'bg-amber-100 text-amber-600' : agent.rank === 2 ? 'bg-slate-100 text-slate-600' : agent.rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                        }`}>{agent.rank}</span>
                        <span className="text-sm text-slate-700 flex-1">{agent.name}</span>
                        <span className="text-xs text-slate-500">{agent.sessions}会话</span>
                        <span className="text-xs font-medium text-amber-500">{agent.rating}★</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeNav === 'settings' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-2xl space-y-5">
                <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">账号设置</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5">显示名称</label>
                      <input
                        type="text"
                        defaultValue="客服小王"
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 outline-none focus:border-brand-300 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5">状态消息</label>
                      <input
                        type="text"
                        defaultValue="在线中，很高兴为您服务"
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 outline-none focus:border-brand-300 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">通知偏好</h3>
                  <div className="space-y-3">
                    {[
                      { label: '新消息声音提醒', on: true },
                      { label: '桌面推送通知', on: true },
                      { label: '会话转接提醒', on: true },
                      { label: '每日数据报告', on: false },
                    ].map((item) => (
                      <ToggleRow key={item.label} label={item.label} defaultOn={item.on} />
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">自动回复设置</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5">欢迎语</label>
                      <textarea
                        defaultValue="您好！我是客服小王，请问有什么可以帮您？"
                        className="w-full h-16 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 outline-none resize-none focus:border-brand-300 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5">离线自动回复</label>
                      <textarea
                        defaultValue="当前为非工作时间，您的留言将在上班后第一时间处理。"
                        className="w-full h-16 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 outline-none resize-none focus:border-brand-300 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ToggleRow({ label, defaultOn }: { label: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        onClick={() => setOn(!on)}
        className={`w-10 h-5 rounded-full transition-colors relative ${on ? 'bg-brand-500' : 'bg-slate-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-soft transition-transform ${on ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
}