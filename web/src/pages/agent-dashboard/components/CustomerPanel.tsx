import { useState } from 'react';

const customerData: Record<string, {
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  browser: string;
  location: string;
  visits: number;
  tags: string[];
  notes: string;
  history: { date: string; action: string }[];
}> = {
  '1': {
    name: '张小明',
    email: 'zhangxm@example.com',
    phone: '138****1234',
    company: '创想科技有限公司',
    source: '官网首页',
    browser: 'Chrome / macOS',
    location: '北京',
    visits: 12,
    tags: ['潜在客户', '产品咨询'],
    notes: '对产品定价比较敏感，需要提供详细的对比方案',
    history: [
      { date: '2026-05-17', action: '咨询产品定价' },
      { date: '2026-05-15', action: '浏览API文档' },
      { date: '2026-05-10', action: '首次访问官网' },
    ],
  },
  '2': {
    name: '李婉清',
    email: 'liwq@example.com',
    phone: '139****5678',
    company: '云端网络',
    source: '产品详情页',
    browser: 'Safari / iOS',
    location: '上海',
    visits: 5,
    tags: ['已付款', '开通中'],
    notes: '已完成付款，等待系统开通。需跟进开通进度',
    history: [
      { date: '2026-05-17', action: '完成付款' },
      { date: '2026-05-16', action: '申请产品演示' },
      { date: '2026-05-14', action: '注册账号' },
    ],
  },
};

const allTags = ['潜在客户', '高意向', '产品咨询', '技术问题', '售后', 'VIP客户', '已付款', '开通中'];

export default function CustomerPanel({ sessionId }: { sessionId: string }) {
  const customer = customerData[sessionId];
  const [noteText, setNoteText] = useState(customer?.notes || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(customer?.tags || []);

  if (!customer) {
    return (
      <div className="w-72 bg-white border-l border-slate-100 p-6">
        <p className="text-sm text-slate-400">选择一个会话查看客户信息</p>
      </div>
    );
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="w-72 bg-white border-l border-slate-100 flex flex-col h-full overflow-y-auto">
      {/* Profile */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-brand-600 font-semibold">{customer.name[0]}</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{customer.name}</div>
            <div className="text-xs text-slate-400">{customer.company}</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <i className="ri-mail-line text-slate-400" />
            {customer.email}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <i className="ri-phone-line text-slate-400" />
            {customer.phone}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <i className="ri-map-pin-line text-slate-400" />
            {customer.location}
          </div>
        </div>
      </div>

      {/* Device Info */}
      <div className="p-5 border-b border-slate-100">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">访问信息</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">来源页面</span>
            <span className="text-slate-700">{customer.source}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">浏览器</span>
            <span className="text-slate-700">{customer.browser}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">访问次数</span>
            <span className="text-slate-700">{customer.visits}次</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="p-5 border-b border-slate-100">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">客户标签</h4>
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-2.5 py-1 text-[11px] rounded-full transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="p-5 border-b border-slate-100">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">备注</h4>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="w-full h-20 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 outline-none resize-none focus:border-brand-300 transition-colors"
          placeholder="添加备注..."
        />
      </div>

      {/* History */}
      <div className="p-5">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">操作记录</h4>
        <div className="space-y-3">
          {customer.history.map((item, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-700">{item.action}</div>
                <div className="text-[11px] text-slate-400">{item.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}