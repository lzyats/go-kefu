import { useState, useRef, useEffect } from 'react';
import { getThemeClasses, type ChatTheme, themeLabels, themeList } from '../../lib/chatTheme';

interface Message {
  id: string;
  type: 'user' | 'agent' | 'bot';
  content: string;
  timestamp: Date;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  { id: '1', question: '如何修改账户密码？', answer: '进入"设置"页面，选择"安全设置"，点击"修改密码"即可。' },
  { id: '2', question: '支持哪些支付方式？', answer: '我们支持微信支付、支付宝、银联卡以及企业对公转账。' },
  { id: '3', question: '如何申请发票？', answer: '在订单详情页点击"申请发票"，填写相关信息后提交即可。' },
  { id: '4', question: '退款需要多久？', answer: '退款一般会在3-7个工作日内原路返回，具体时间视银行处理速度而定。' },
  { id: '5', question: '如何联系人工客服？', answer: '在聊天窗口输入"人工"或直接点击顶部的"转人工"按钮即可接入。' },
];

const quickReplies = [
  '产品定价',
  '技术支持',
  '账户问题',
  '功能咨询',
];

const botResponses: Record<string, string> = {
  '产品定价': '我们提供三种方案：基础版¥99/月（5坐席）、专业版¥299/月（20坐席）、企业版按需定制。需要详细了解吗？',
  '技术支持': '技术支持团队工作日 9:00-21:00 在线。您可以描述遇到的具体问题，我会尽力帮您解决。',
  '账户问题': '常见的账户问题包括：密码重置、权限调整、账户注销等。请问您遇到的是哪种情况？',
  '功能咨询': 'ChatFlow 支持实时聊天、AI机器人、FAQ检索、多语言、满意度评分、数据分析等功能。您对哪方面感兴趣？',
  '你好': '您好！我是 ChatFlow 智能助手，很高兴为您服务。请问有什么可以帮您？',
  'hello': 'Hello! I am the ChatFlow AI assistant. How can I help you today?',
};

function getBotReply(input: string): string {
  const lower = input.toLowerCase();
  for (const key of Object.keys(botResponses)) {
    if (lower.includes(key.toLowerCase())) return botResponses[key];
  }
  if (lower.includes('你好') || lower.includes('您好')) return botResponses['你好'];
  if (lower.includes('hi') || lower.includes('hello')) return botResponses['hello'];
  return '抱歉，我可能没有完全理解您的问题。您可以尝试点击下方的常见问题，或输入"人工"转接人工客服。';
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'faq' | 'settings'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'bot',
      content: '您好！我是 ChatFlow 智能客服助手，请问有什么可以帮您？您也可以直接输入"人工"转接人工客服。',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [satisfaction, setSatisfaction] = useState(0);
  const [showSatisfaction, setShowSatisfaction] = useState(false);
  const [theme, setTheme] = useState<ChatTheme>('fresh');
  const [language, setLanguage] = useState('zh');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = getThemeClasses(theme);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply = getBotReply(userMsg.content);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), type: 'bot', content: reply, timestamp: new Date() },
      ]);
    }, 1200);
  };

  const handleQuickReply = (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply = getBotReply(text);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), type: 'bot', content: reply, timestamp: new Date() },
      ]);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFAQClick = (faq: FAQItem) => {
    setActiveTab('chat');
    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: faq.question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), type: 'bot', content: faq.answer, timestamp: new Date() },
      ]);
    }, 600);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 ${t.floatBtnBg} ${t.floatBtnHover} ${t.floatBtnText} rounded-full shadow-elevated flex items-center justify-center transition-all hover:scale-105 group`}
      >
        <i className="ri-chat-3-line text-2xl" />
        <span className={`absolute right-0 top-0 w-3.5 h-3.5 ${t.floatBadge} rounded-full border-2 ${t.widgetBorder.includes('white') ? 'border-white' : 'border-white'}`} />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`fixed bottom-6 right-6 z-50 px-5 py-3 ${t.miniBg} ${t.miniText} rounded-2xl shadow-elevated border ${t.widgetBorder} flex items-center gap-3 transition-all hover:scale-105`}
      >
        <div className={`w-8 h-8 rounded-full ${t.brandBg} flex items-center justify-center`}>
          <i className="ri-chat-3-line text-white" />
        </div>
        <span className="text-sm font-medium">ChatFlow 客服</span>
        <span className={`w-2.5 h-2.5 rounded-full ${t.onlineDot}`} />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 w-[380px] h-[580px] max-h-[85vh] rounded-2xl shadow-elevated overflow-hidden flex flex-col border ${t.widgetBorder} ${t.widgetBg}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${t.headerBorder} ${t.headerBg} flex-shrink-0`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-full ${t.brandBg} flex items-center justify-center`}>
            <i className="ri-chat-smile-3-line text-white" />
          </div>
          <div>
            <div className={`text-sm font-semibold ${t.headerText}`}>ChatFlow 客服</div>
            <div className={`flex items-center gap-1 text-xs ${t.brandText}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${t.onlineDot} animate-pulse`} />
              在线中
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${t.toolBtn} ${t.hoverBg} transition-colors`}
          >
            <i className="ri-subtract-line" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${t.toolBtn} ${t.hoverBg} transition-colors`}
          >
            <i className="ri-close-line" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${t.headerBorder} ${t.headerBg} flex-shrink-0`}>
        {([
          { key: 'chat', icon: 'ri-chat-3-line', label: '对话' },
          { key: 'faq', icon: 'ri-questionnaire-line', label: '常见问题' },
          { key: 'settings', icon: 'ri-settings-4-line', label: '设置' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.key
                ? `${t.tabActiveBorder} ${t.tabActiveText}`
                : `border-transparent ${t.tabInactiveText} ${t.tabInactiveHover}`
            }`}
          >
            <i className={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-hidden ${t.contentBg}`}>
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 ${t.scrollThumb}`}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.type !== 'user' && (
                    <div className={`w-7 h-7 rounded-full ${t.avatarBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <i className={`${msg.type === 'bot' ? 'ri-robot-2-line' : 'ri-customer-service-2-line'} ${t.avatarIcon} text-xs`} />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-soft border ${
                      msg.type === 'user'
                        ? `${t.userBubbleBg} ${t.userBubbleText} rounded-tr-sm ${t.userBubbleBorder}`
                        : `${t.otherBubbleBg} ${t.otherBubbleText} rounded-tl-sm ${t.otherBubbleBorder}`
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-2 justify-start">
                  <div className={`w-7 h-7 rounded-full ${t.avatarBg} flex items-center justify-center flex-shrink-0`}>
                    <i className="ri-robot-2-line text-xs" />
                  </div>
                  <div className={`rounded-2xl rounded-tl-sm px-4 py-3 shadow-soft border ${t.otherBubbleBg} ${t.otherBubbleBorder}`}>
                    <div className="flex gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${t.typingDot} animate-bounce`} style={{ animationDelay: '0ms' }} />
                      <span className={`w-1.5 h-1.5 rounded-full ${t.typingDot} animate-bounce`} style={{ animationDelay: '150ms' }} />
                      <span className={`w-1.5 h-1.5 rounded-full ${t.typingDot} animate-bounce`} style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            {messages.length < 3 && (
              <div className="px-4 py-2 flex flex-wrap gap-1.5 flex-shrink-0">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => handleQuickReply(reply)}
                    className={`px-3 py-1.5 ${t.quickReplyBg} border ${t.quickReplyBorder} ${t.quickReplyHoverBorder} ${t.quickReplyHoverText} ${t.quickReplyText} text-xs rounded-full transition-colors shadow-soft`}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            {/* Satisfaction */}
            {showSatisfaction && (
              <div className={`mx-4 mb-2 p-3 rounded-xl ${t.satisfactionBg} border ${t.satisfactionBorder} shadow-soft`}>
                <p className={`text-xs ${t.subText} mb-2`}>本次服务是否解决了您的问题？</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => {
                        setSatisfaction(star);
                        setShowSatisfaction(false);
                        setMessages((prev) => [
                          ...prev,
                          { id: Date.now().toString(), type: 'bot', content: `感谢您的评价！${star >= 4 ? '很高兴帮到您！' : '我们会继续努力改进。'}`, timestamp: new Date() },
                        ]);
                      }}
                      className="w-7 h-7 flex items-center justify-center text-amber-400 hover:scale-110 transition-transform"
                    >
                      <i className={star <= satisfaction ? 'ri-star-fill' : 'ri-star-line'} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className={`px-3 py-3 border-t ${t.inputBarBorder} ${t.inputBarBg} flex-shrink-0`}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${t.textareaBg} ${t.textareaBorder} ${t.textareaFocusBorder}`}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息..."
                  className={`flex-1 bg-transparent text-sm outline-none ${t.textareaText} ${t.textareaPlaceholder}`}
                />
                <button className={`w-7 h-7 flex items-center justify-center ${t.toolBtn} ${t.toolBtnHover} transition-colors`}>
                  <i className="ri-attachment-line" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className={`w-7 h-7 rounded-lg ${t.sendBtn} flex items-center justify-center ${t.sendBtnText} ${t.brandBgHover} transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <i className="ri-send-plane-fill text-xs" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <button
                  onClick={() => handleQuickReply('人工')}
                  className={`text-xs ${t.brandText} font-medium`}
                >
                  转人工客服
                </button>
                <button
                  onClick={() => setShowSatisfaction(true)}
                  className={`text-xs ${t.subText} hover:text-amber-500 transition-colors`}
                >
                  评价服务
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="h-full overflow-y-auto px-4 py-3">
            <div className={`text-xs ${t.subText} mb-3`}>点击问题查看答案</div>
            <div className="space-y-2">
              {faqData.map((faq) => (
                <button
                  key={faq.id}
                  onClick={() => handleFAQClick(faq)}
                  className={`w-full text-left p-3 rounded-xl ${t.settingItemBg} border ${t.settingItemBorder} ${t.brandBorder.replace('border-', 'hover:border-')} transition-colors`}
                >
                  <div className="flex items-start gap-2">
                    <i className={`ri-question-line ${t.brandText} mt-0.5`} />
                    <span className={`text-sm ${t.text}`}>{faq.question}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto px-4 py-4 space-y-5">
            {/* Theme */}
            <div>
              <h4 className={`text-sm font-semibold ${t.text} mb-3`}>界面主题</h4>
              <div className="grid grid-cols-2 gap-2">
                {themeList.map((tk) => {
                  const info = themeLabels[tk];
                  const isActive = theme === tk;
                  return (
                    <button
                      key={tk}
                      onClick={() => setTheme(tk)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                        isActive
                          ? `${t.settingItemActiveBorder} ${t.settingItemActiveBg} ${t.settingItemActiveText}`
                          : `${t.settingItemBorder} ${t.settingItemBg} ${t.subText}`
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${info.dot}`} />
                      <div className="text-left">
                        <div className={`text-xs font-medium ${isActive ? t.settingItemActiveText : t.text}`}>{info.label}</div>
                        <div className={`text-[10px] ${t.subText}`}>{info.desc}</div>
                      </div>
                      {isActive && <i className={`ri-check-line ${t.brandText} ml-auto text-xs`} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language */}
            <div>
              <h4 className={`text-sm font-semibold ${t.text} mb-3`}>语言设置</h4>
              <div className="space-y-2">
                {[
                  { code: 'zh', label: '简体中文' },
                  { code: 'en', label: 'English' },
                  { code: 'ja', label: '日本語' },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-colors ${
                      language === lang.code
                        ? `${t.settingItemActiveBorder} ${t.settingItemActiveBg}`
                        : `${t.settingItemBorder} ${t.settingItemBg}`
                    }`}
                  >
                    <span className={`text-sm ${language === lang.code ? t.settingItemActiveText : t.text}`}>{lang.label}</span>
                    {language === lang.code && <i className={`ri-check-line ${t.brandText}`} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div>
              <h4 className={`text-sm font-semibold ${t.text} mb-3`}>消息通知</h4>
              <div className="space-y-3">
                {[
                  { label: '声音提醒', icon: 'ri-volume-up-line', defaultOn: true },
                  { label: '桌面通知', icon: 'ri-notification-3-line', defaultOn: true },
                  { label: '振动反馈', icon: 'ri-smartphone-line', defaultOn: false },
                ].map((item) => (
                  <ToggleRow key={item.label} label={item.label} icon={item.icon} defaultOn={item.defaultOn} t={t} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({ label, icon, defaultOn, t }: { label: string; icon: string; defaultOn: boolean; t: ReturnType<typeof getThemeClasses> }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <i className={`${icon} ${t.subText}`} />
        <span className={`text-sm ${t.text}`}>{label}</span>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`w-11 h-6 rounded-full transition-colors relative ${on ? t.toggleActive : 'bg-slate-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-soft transition-transform ${on ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
}