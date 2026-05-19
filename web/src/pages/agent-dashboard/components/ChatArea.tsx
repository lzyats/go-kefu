import { useEffect, useRef, useState } from 'react';
import { Agent, ChatMessage, getSessionCustomerAvatar, getSessionCustomerName, SessionItem } from '@/lib/customerApi';

const quickReplies = [
  '您好，有什么可以帮您？',
  '请稍等，我为您查询一下。',
  '这个问题我帮您确认后回复。',
  '感谢您的耐心等待。',
];

const emojis = ['😀', '😄', '😂', '😊', '😍', '👍', '🙏', '🎉', '❤️', '🔥'];

export default function ChatArea({
  session,
  messages,
  agent,
  error,
  onAccept,
  onSend,
  onSendImage,
}: {
  session: SessionItem | null;
  messages: ChatMessage[];
  agent: Agent | null;
  error: string;
  onAccept: (session: SessionItem) => Promise<void>;
  onSend: (content: string) => Promise<void>;
  onSendImage: (file: File) => Promise<void>;
}) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const content = input.trim();
    if (!content || !session) return;
    setSending(true);
    try {
      await onSend(content);
      setInput('');
      setShowEmoji(false);
    } finally {
      setSending(false);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !session) return;
    setSending(true);
    try {
      await onSendImage(file);
      setShowEmoji(false);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  if (!session) {
    return (
      <div className="h-full max-h-full flex-1 min-h-0 overflow-hidden flex items-center justify-center bg-white text-sm text-slate-400">
        请选择一个会话
      </div>
    );
  }

  const customerName = getSessionCustomerName(session);
  const customerAvatar = getSessionCustomerAvatar(session);

  return (
    <div className="h-full max-h-full flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
      <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {customerAvatar ? (
            <img src={customerAvatar} alt={customerName} className="w-9 h-9 rounded-full object-cover bg-brand-100" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
              <i className="ri-user-3-line text-brand-600" />
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-slate-800">{customerName}</div>
            <div className="text-xs text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {session.status === 'waiting' ? '待接入' : '服务中'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {session.status === 'waiting' && (
            <button
              onClick={() => void onAccept(session)}
              className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 transition-colors"
            >
              接入会话
            </button>
          )}
          <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
            <i className="ri-more-2-line" />
          </button>
        </div>
      </div>

      <div className="flex-1 basis-0 min-h-0 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/30">
        <div className="text-center">
          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-xs rounded-full">会话开始</span>
        </div>
        {messages.length === 0 && (
          <div className="text-center text-xs text-slate-400 py-8">暂无消息</div>
        )}
        {messages.map((msg) => {
          const isAgent = msg.sender_type === 'agent';
          return (
            <div key={msg.id || msg.client_msg_id} className={`flex gap-3 ${isAgent ? 'justify-end' : 'justify-start'}`}>
              {!isAgent && (
                customerAvatar ? (
                  <img src={customerAvatar} alt={customerName} className="w-8 h-8 rounded-full object-cover bg-slate-200 flex-shrink-0 mt-1" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
                    <i className="ri-user-3-line text-slate-500 text-sm" />
                  </div>
                )
              )}
              <div className="max-w-[70%]">
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                    isAgent
                      ? 'bg-brand-500 text-white rounded-tr-sm'
                      : 'bg-white text-slate-700 rounded-tl-sm shadow-soft border border-slate-100'
                  }`}
                >
                  {msg.msg_type === 'image' ? <img src={msg.content} className="max-w-full max-h-72 rounded-xl object-contain" /> : msg.content}
                </div>
                <div className={`text-[11px] text-slate-400 mt-1 ${isAgent ? 'text-right' : ''}`}>
                  {formatTime(msg.send_time)} {msg.status === 'failed' ? '发送失败' : ''}
                </div>
              </div>
              {isAgent && (
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-customer-service-2-line text-brand-600 text-sm" />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-5 py-2 border-t border-slate-100 flex gap-2 overflow-x-auto flex-shrink-0 bg-white">
        {quickReplies.map((reply) => (
          <button
            key={reply}
            onClick={() => setInput(reply)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-200 text-slate-600 hover:text-brand-600 text-xs rounded-full transition-colors whitespace-nowrap"
          >
            {reply}
          </button>
        ))}
      </div>

      <div className="relative px-4 py-3 border-t border-slate-100 bg-white flex-shrink-0">
        {error && <div className="mb-2 text-xs text-rose-500">{error}</div>}
        {showEmoji && (
          <div className="absolute left-4 bottom-[72px] z-10 grid grid-cols-5 gap-1 rounded-xl border border-slate-100 bg-white p-2 shadow-elevated">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setInput((old) => old + emoji)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        <div className="flex items-center gap-1.5 mb-2">
          <IconButton icon="ri-emotion-line" title="表情" onClick={() => setShowEmoji((open) => !open)} />
          <IconButton icon="ri-image-add-line" title="发送图片" onClick={() => imageInputRef.current?.click()} />
          <IconButton icon="ri-folder-upload-line" title="上传图片" onClick={() => imageInputRef.current?.click()} />
          <IconButton icon="ri-add-circle-line" title="更多" onClick={() => imageInputRef.current?.click()} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 focus-within:border-brand-300 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={agent ? '输入回复...' : '当前用户未绑定坐席'}
              disabled={!agent || sending}
              className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
            />
          </div>
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || !agent || sending}
            className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className="ri-send-plane-fill" />
          </button>
        </div>
      </div>
    </div>
  );
}

function IconButton({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-600 transition-colors"
    >
      <i className={`${icon} text-lg`} />
    </button>
  );
}

function formatTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
