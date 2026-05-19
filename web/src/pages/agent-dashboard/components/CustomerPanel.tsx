import { useEffect, useState } from 'react';
import { getCustomerTags, getSessionCustomerAvatar, getSessionCustomerName, saveCustomerTags, SessionItem } from '@/lib/customerApi';

const customerTagOptions = ['潜在客户', '高意向', '产品咨询', '技术问题', '售后', 'VIP客户', '已付款', '待跟进'];

export default function CustomerPanel({ session }: { session: SessionItem | null }) {
  const [noteText, setNoteText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState('');

  useEffect(() => {
    setNoteText('');
    setSelectedTags([]);
    setTagsError('');
    if (!session?.user_id) return;
    let cancelled = false;
    setTagsLoading(true);
    getCustomerTags(session.user_id, session.app_id || 'default')
      .then((res) => {
        if (!cancelled) setSelectedTags(res.items || []);
      })
      .catch((err) => {
        if (!cancelled) setTagsError(err instanceof Error ? err.message : '标签加载失败');
      })
      .finally(() => {
        if (!cancelled) setTagsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.tenant_id, session?.app_id, session?.user_id]);

  if (!session) {
    return (
      <div className="w-72 h-full max-h-full min-h-0 overflow-y-auto bg-white border-l border-slate-100 p-6">
        <p className="text-sm text-slate-400">选择一个会话查看客户信息</p>
      </div>
    );
  }

  const toggleTag = async (tag: string) => {
    if (!session?.user_id) return;
    const next = selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag];
    const previous = selectedTags;
    setSelectedTags(next);
    setTagsError('');
    try {
      const res = await saveCustomerTags(session.user_id, next, session.app_id || 'default');
      setSelectedTags(res.items || next);
    } catch (err) {
      setSelectedTags(previous);
      setTagsError(err instanceof Error ? err.message : '标签保存失败');
    }
  };
  const customerName = getSessionCustomerName(session);
  const customerAvatar = getSessionCustomerAvatar(session);

  return (
    <div className="w-72 h-full max-h-full min-h-0 bg-white border-l border-slate-100 flex flex-col overflow-y-auto">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          {customerAvatar ? (
            <img src={customerAvatar} alt={customerName} className="w-12 h-12 rounded-full object-cover bg-brand-100" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-brand-600 font-semibold">{customerName.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{customerName}</div>
            <div className="text-xs text-slate-400 truncate">会话 {session.id}</div>
          </div>
        </div>
        <div className="space-y-2">
          <Info icon="ri-chat-3-line" text={session.status === 'waiting' ? '排队中' : '服务中'} />
          <Info icon="ri-customer-service-2-line" text={session.agent_id || '暂未接入'} />
          <Info icon="ri-links-line" text={session.channel_id || 'web'} />
        </div>
      </div>

      <div className="p-5 border-b border-slate-100">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">访问信息</h4>
        <div className="space-y-2">
          <Row label="来源IP" value={session.source_ip || '-'} />
          <Row label="详细来源" value={session.source_location || locationFallback(session.source_ip)} />
          <Row label="登录时间" value={formatDateTime(session.login_time || session.created_at)} />
          <Row label="应用" value={session.app_id || 'default'} />
          <Row label="浏览器" value={formatUserAgent(session.user_agent)} />
        </div>
      </div>

      <div className="p-5 border-b border-slate-100">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">客户标签</h4>
        <div className="flex flex-wrap gap-1.5">
          {customerTagOptions.map((tag) => (
            <button
              key={tag}
              onClick={() => void toggleTag(tag)}
              disabled={tagsLoading}
              className={`px-2.5 py-1 text-[11px] rounded-full transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {tag}
            </button>
          ))}
        </div>
        {tagsError && <div className="mt-2 text-[11px] text-rose-500">{tagsError}</div>}
      </div>

      <div className="p-5 border-b border-slate-100">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">备注</h4>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="w-full h-20 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 outline-none resize-none focus:border-brand-300 transition-colors"
          placeholder="添加备注..."
        />
      </div>

      <div className="p-5">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">会话记录</h4>
        <div className="space-y-3">
          <History action="创建会话" date={formatDateTime(session.created_at)} />
          {session.status === 'serving' && <History action="坐席接入" date={formatDateTime(session.updated_at)} />}
          {session.last_msg_time && <History action="最近消息" date={formatDateTime(session.last_msg_time)} />}
        </div>
      </div>
    </div>
  );
}

function Info({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <i className={`${icon} text-slate-400`} />
      <span className="truncate">{text}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-slate-700 text-right break-all">{value}</span>
    </div>
  );
}

function History({ action, date }: { action: string; date: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
      <div>
        <div className="text-xs text-slate-700">{action}</div>
        <div className="text-[11px] text-slate-400">{date}</div>
      </div>
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', { hour12: false });
}

function formatUserAgent(value?: string) {
  if (!value) return '-';
  if (value.includes('Chrome')) return 'Chrome';
  if (value.includes('Safari')) return 'Safari';
  if (value.includes('Firefox')) return 'Firefox';
  return value.slice(0, 36);
}

function locationFallback(ip?: string) {
  if (!ip) return '-';
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) {
    return '内网IP';
  }
  return ip;
}
