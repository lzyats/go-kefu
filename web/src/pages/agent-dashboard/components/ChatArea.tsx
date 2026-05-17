import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  sender: 'agent' | 'user';
  content: string;
  time: string;
  type?: 'text' | 'image';
}

const mockMessages: Record<string, Message[]> = {
  '1': [
    { id: '1', sender: 'user', content: '你好，我想了解一下你们的产品', time: '14:32' },
    { id: '2', sender: 'agent', content: '您好！欢迎咨询 ChatFlow 智能客服系统。我们提供基础版、专业版和企业版三种方案，请问您的团队规模大概是多少呢？', time: '14:33' },
    { id: '3', sender: 'user', content: '大概20人左右', time: '14:35' },
    { id: '4', sender: 'agent', content: '那专业版非常适合您！专业版支持20个坐席，包含AI智能客服、数据分析、自定义主题等全部功能，价格是¥299/月。', time: '14:36' },
    { id: '5', sender: 'user', content: '请问专业版包含哪些功能？', time: '14:38' },
  ],
  '2': [
    { id: '1', sender: 'user', content: '我已经完成付款了', time: '14:20' },
    { id: '2', sender: 'agent', content: '感谢您选择 ChatFlow！请提供一下您的订单号，我帮您确认一下。', time: '14:21' },
    { id: '3', sender: 'user', content: '订单号是 #202605170028', time: '14:23' },
    { id: '4', sender: 'agent', content: '已确认收到您的付款，预计5分钟内开通完成。我会发送开通邮件到您的注册邮箱。', time: '14:24' },
    { id: '5', sender: 'user', content: '我已经付款了，什么时候可以开通？', time: '14:28' },
  ],
};

const quickReplies = [
  '您好，有什么可以帮您？',
  '请稍等，我为您查询一下',
  '这个问题我帮您转接技术同事',
  '感谢您的耐心等待',
];

export default function ChatArea({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>(mockMessages[sessionId] || []);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(mockMessages[sessionId] || []);
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'agent',
      content: input.trim(),
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat header */}
      <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
            <i className="ri-user-3-line text-brand-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">会话 #{sessionId}</div>
            <div className="text-xs text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              在线
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
            <i className="ri-phone-line" />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
            <i className="ri-video-chat-line" />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
            <i className="ri-more-2-line" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/30">
        <div className="text-center">
          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-xs rounded-full">会话开始</span>
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
                <i className="ri-user-3-line text-slate-500 text-sm" />
              </div>
            )}
            <div className="max-w-[70%]">
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'agent'
                    ? 'bg-brand-500 text-white rounded-tr-sm'
                    : 'bg-white text-slate-700 rounded-tl-sm shadow-soft border border-slate-100'
                }`}
              >
                {msg.content}
              </div>
              <div className={`text-[11px] text-slate-400 mt-1 ${msg.sender === 'agent' ? 'text-right' : ''}`}>{msg.time}</div>
            </div>
            {msg.sender === 'agent' && (
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-1">
                <i className="ri-customer-service-2-line text-brand-600 text-sm" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      <div className="px-5 py-2 border-t border-slate-100 flex gap-2 overflow-x-auto flex-shrink-0 bg-white">
        {quickReplies.map((reply) => (
          <button
            key={reply}
            onClick={() => {
              setInput(reply);
            }}
            className="px-3 py-1.5 bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-200 text-slate-600 hover:text-brand-600 text-xs rounded-full transition-colors whitespace-nowrap"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
            <i className="ri-add-circle-line" />
          </button>
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 focus-within:border-brand-300 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入回复..."
              className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className="ri-send-plane-fill" />
          </button>
        </div>
      </div>
    </div>
  );
}