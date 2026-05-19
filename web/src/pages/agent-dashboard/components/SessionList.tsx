import { useMemo, useState } from 'react';
import { getSessionCustomerAvatar, getSessionCustomerName, SessionItem } from '@/lib/customerApi';

type Filter = 'all' | 'serving' | 'waiting';

export default function SessionList({
  activeId,
  sessions,
  unreadBySession = {},
  onSelect,
  onRefresh,
}: {
  activeId: string;
  sessions: SessionItem[];
  unreadBySession?: Record<string, number>;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      const statusMatched = filter === 'all' || session.status === filter;
      const searchText = `${getSessionCustomerName(session)} ${session.user_id}`.toLowerCase();
      const keywordMatched = !keyword.trim() || searchText.includes(keyword.trim().toLowerCase());
      return statusMatched && keywordMatched;
    });
  }, [sessions, filter, keyword]);

  return (
    <div className="w-72 bg-white border-r border-slate-100 flex flex-col min-h-0">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-800">会话列表</h2>
          <button onClick={onRefresh} className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center">
            <i className="ri-refresh-line" />
          </button>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {([
            { key: 'all', label: '全部' },
            { key: 'serving', label: '服务中' },
            { key: 'waiting', label: '待接入' },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`relative flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
              {f.key === 'waiting' && waitingUnread(unreadBySession, sessions) > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] leading-4">
                  {waitingUnread(unreadBySession, sessions)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
          <i className="ri-search-line text-slate-400 text-sm" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索会话..."
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-slate-400">暂无会话</div>
        )}
        {filtered.map((session) => {
          const unread = unreadBySession[session.id] || 0;
          const customerName = getSessionCustomerName(session);
          const avatar = getSessionCustomerAvatar(session);
          return (
            <button
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={`w-full flex items-start gap-3 px-4 py-3 transition-colors text-left ${
                activeId === session.id ? 'bg-brand-50 border-l-2 border-brand-500' : 'hover:bg-slate-50 border-l-2 border-transparent'
              }`}
            >
              <div className="relative flex-shrink-0">
                {avatar ? (
                  <img src={avatar} alt={customerName} className="w-10 h-10 rounded-full object-cover bg-slate-100" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="text-xs font-medium text-slate-600">{customerName.slice(0, 1).toUpperCase()}</span>
                  </div>
                )}
                {session.customer_online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                )}
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold leading-[18px] text-center shadow-soft">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-slate-800 truncate">{customerName}</span>
                  <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">{formatTime(session.last_msg_time || session.updated_at)}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{statusText(session.status)} · {session.channel_id || 'web'}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {session.status === 'waiting' && (
                    <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-medium rounded-full">待接入</span>
                  )}
                  {unread > 0 && <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[10px] rounded-full">新消息</span>}
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-full">seq {session.last_seq || 0}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function waitingUnread(unreadBySession: Record<string, number>, sessions: SessionItem[]) {
  return sessions
    .filter((session) => session.status === 'waiting')
    .reduce((sum, session) => sum + (unreadBySession[session.id] || 0), 0);
}

function statusText(status: string) {
  if (status === 'waiting') return '排队中';
  if (status === 'serving') return '服务中';
  if (status === 'closed') return '已结束';
  return status || '未知';
}

function formatTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
