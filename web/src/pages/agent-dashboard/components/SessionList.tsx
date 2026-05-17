import { useState } from 'react';

interface Session {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  status: 'active' | 'waiting' | 'closed';
  tag?: string;
}

const sessions: Session[] = [
  { id: '1', name: '张小明', avatar: 'https://readdy.ai/api/search-image?query=professional%20young%20asian%20man%20portrait%20headshot%20clean%20neutral%20background%20high%20quality&width=100&height=100&seq=1&orientation=squarish', lastMessage: '请问专业版包含哪些功能？', time: '2分钟前', unread: 2, status: 'active', tag: '新消息' },
  { id: '2', name: '李婉清', avatar: 'https://readdy.ai/api/search-image?query=professional%20young%20asian%20woman%20portrait%20headshot%20clean%20neutral%20background%20high%20quality&width=100&height=100&seq=2&orientation=squarish', lastMessage: '我已经付款了，什么时候可以开通？', time: '5分钟前', unread: 1, status: 'active' },
  { id: '3', name: '王建国', avatar: 'https://readdy.ai/api/search-image?query=middle%20aged%20asian%20man%20business%20portrait%20headshot%20neutral%20background%20professional&width=100&height=100&seq=3&orientation=squarish', lastMessage: '系统提示连接失败', time: '12分钟前', unread: 0, status: 'waiting', tag: '技术问题' },
  { id: '4', name: '陈思思', avatar: 'https://readdy.ai/api/search-image?query=young%20asian%20woman%20smiling%20portrait%20headshot%20clean%20background%20professional&width=100&height=100&seq=4&orientation=squarish', lastMessage: '好的，谢谢您的解答！', time: '30分钟前', unread: 0, status: 'closed' },
  { id: '5', name: '刘大伟', avatar: 'https://readdy.ai/api/search-image?query=asian%20man%20glasses%20business%20portrait%20headshot%20neutral%20background%20professional&width=100&height=100&seq=5&orientation=squarish', lastMessage: '能否安排一次产品演示？', time: '1小时前', unread: 0, status: 'waiting' },
  { id: '6', name: '赵雪梅', avatar: 'https://readdy.ai/api/search-image?query=professional%20asian%20woman%20mature%20portrait%20headshot%20clean%20background&width=100&height=100&seq=6&orientation=squarish', lastMessage: '发票信息需要修改', time: '2小时前', unread: 0, status: 'active', tag: '售后' },
];

export default function SessionList({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'waiting'>('all');

  const filtered = sessions.filter((s) => filter === 'all' || s.status === filter);

  return (
    <div className="w-72 bg-white border-r border-slate-100 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-3">会话列表</h2>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {([
            { key: 'all', label: '全部' },
            { key: 'active', label: '进行中' },
            { key: 'waiting', label: '待处理' },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
          <i className="ri-search-line text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="搜索会话..."
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={`w-full flex items-start gap-3 px-4 py-3 transition-colors text-left ${
              activeId === session.id ? 'bg-brand-50 border-l-2 border-brand-500' : 'hover:bg-slate-50 border-l-2 border-transparent'
            }`}
          >
            <div className="relative flex-shrink-0">
              <img src={session.avatar} alt={session.name} className="w-10 h-10 rounded-full object-cover bg-slate-100" />
              {session.status === 'active' && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-slate-800 truncate">{session.name}</span>
                <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">{session.time}</span>
              </div>
              <p className="text-xs text-slate-500 truncate">{session.lastMessage}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                {session.unread > 0 && (
                  <span className="px-1.5 py-0.5 bg-brand-500 text-white text-[10px] font-medium rounded-full">{session.unread}</span>
                )}
                {session.tag && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-full">{session.tag}</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}