import { useState, useRef, useEffect } from 'react';
import { getThemeClasses, hasSavedChatTheme, normalizeChatTheme, readSavedChatTheme, saveChatTheme, type ChatTheme, themeLabels, themeList } from '../../lib/chatTheme';
import { ChatMessage, createSession, getAppId, getAssetUrl, getPublicConfig, getTenantId, getWsUrl, listSessionMessages, PublicFAQ, sendWsMessage, SessionItem, uploadChatImage } from '../../lib/customerApi';
import { getNotifySettings, notifyMessage, saveNotifySettings, unlockSound, type NotifySettings } from '../../lib/notify';

interface Message {
  id: string;
  type: 'user' | 'agent' | 'bot';
  content: string;
  timestamp: Date;
  msgType?: 'text' | 'image';
  status?: 'sending' | 'sent' | 'failed';
}

interface ChatCache {
  visitorName: string;
  session: SessionItem;
  savedAt: number;
}

const botResponses: Record<string, string> = {
  '产品定价': '我们提供三种方案：基础版¥99/月（5坐席）、专业版¥299/月（20坐席）、企业版按需定制。需要详细了解吗？',
  '技术支持': '技术支持团队工作日 9:00-21:00 在线。您可以描述遇到的具体问题，我会尽力帮您解决。',
  '账户问题': '常见的账户问题包括：密码重置、权限调整、账户注销等。请问您遇到的是哪种情况？',
  '功能咨询': 'ChatFlow 支持实时聊天、AI机器人、FAQ检索、多语言、满意度评分、数据分析等功能。您对哪方面感兴趣？',
  '你好': '您好！我是 ChatFlow 智能助手，很高兴为您服务。请问有什么可以帮您？',
  'hello': 'Hello! I am the ChatFlow AI assistant. How can I help you today?',
};

const emojis = ['😀', '😄', '😂', '😊', '😍', '👍', '🙏', '🎉', '❤️', '🔥'];
const cacheKeyPrefix = 'kefu:web:chat_widget_session';
const cacheTTL = 24 * 60 * 60 * 1000;

function getBotReply(input: string, brandName = 'ChatFlow', faqs: PublicFAQ[] = []): string {
  const lower = input.toLowerCase();
  for (const faq of faqs) {
    if (lower.includes(faq.question.toLowerCase())) return faq.answer;
  }
  for (const key of Object.keys(botResponses)) {
    if (lower.includes(key.toLowerCase())) return botResponses[key];
  }
  if (lower.includes('你好') || lower.includes('您好')) return botResponses['你好'];
  if (lower.includes('hi') || lower.includes('hello')) return botResponses['hello'];
  return `抱歉，我可能没有完全理解您的问题。您可以尝试点击下方的常见问题，或输入"人工"转接${brandName}客服。`;
}

function getOrCreateVisitorName() {
  const externalUserID = getStableExternalUserID();
  if (externalUserID) return externalUserID;
  const key = getScopedStorageKey('kefu:web:chat_widget_visitor');
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const name = `访客${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  localStorage.setItem(key, name);
  return name;
}

function generateClientMsgID(prefix = 'web') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseWsData<T>(data: unknown): T {
  return typeof data === 'string' ? JSON.parse(data) as T : data as T;
}

export default function ChatWidget() {
  const [brandName, setBrandName] = useState('ChatFlow');
  const [faqs, setFaqs] = useState<PublicFAQ[]>([]);
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
  const [showEmoji, setShowEmoji] = useState(false);
  const [theme, setTheme] = useState<ChatTheme>(() => readSavedChatTheme());
  const [language, setLanguage] = useState('zh');
  const [notifySettings, setNotifySettings] = useState<NotifySettings>(() => getNotifySettings());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | undefined>(undefined);
  const [session, setSession] = useState<SessionItem | null>(null);
  const [visitorName] = useState(() => getOrCreateVisitorName());
  const tenantId = getTenantId();
  const appId = getAppId();

  const t = getThemeClasses(theme);
  const quickReplyItems = faqs.slice(0, 4).map((item) => item.question);

  const applyTheme = (nextTheme: ChatTheme) => {
    setTheme(nextTheme);
    saveChatTheme(nextTheme);
  };

  const updateNotifySetting = (key: keyof NotifySettings, value: boolean) => {
    const next = { ...notifySettings, [key]: value };
    setNotifySettings(next);
    saveNotifySettings(next);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadPublicConfig();
    const cache = readCache();
    if (cache && hasExternalProfile()) {
      void restoreExternalSession(visitorName);
    } else if (cache) {
      setSession(cache.session);
      void restoreCachedSession(cache);
    } else if (getExternalUserID()) {
      void restoreExternalSession(visitorName);
    }
  }, [tenantId, appId]);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  async function loadPublicConfig() {
    try {
      const config = await getPublicConfig({ force: true });
      const nextName = config.display_name || 'ChatFlow';
      setBrandName(nextName);
      setFaqs(config.faqs || []);
      if (!hasSavedChatTheme() && config.chat_theme) setTheme(normalizeChatTheme(config.chat_theme));
      setMessages((old) => old.map((item) => item.id === 'welcome' ? {
        ...item,
        content: `您好！我是 ${nextName} 智能客服助手，请问有什么可以帮您？您也可以直接输入"人工"转接人工客服。`,
      } : item));
    } catch {
      setBrandName('ChatFlow');
    }
  }

  const handleSend = () => {
    void sendText(inputValue.trim());
  };

  const handleQuickReply = (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date(),
      status: 'sent',
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply = getBotReply(text, brandName, faqs);
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

  const handleFAQClick = (faq: PublicFAQ) => {
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

  async function ensureManualSession() {
    if (session) return session;
    const created = await createSession(visitorName, 'web', '', getSessionDisplayName(visitorName), getExternalUserAvatar());
    setSession(created);
    writeCache({ visitorName, session: created, savedAt: Date.now() });
    connectWS(created, visitorName);
    return created;
  }

  async function restoreCachedSession(cache: ChatCache) {
    writeCache({ ...cache, savedAt: Date.now() });
    try {
      const res = await listSessionMessages(cache.session.id, 0, 200);
      const history = (res.items || []).map(mapChatMessage).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      if (history.length > 0) {
        setMessages(history);
      }
    } catch {
      // 历史消息拉取失败不影响会话续接。
    }
    connectWS(cache.session, cache.visitorName);
  }

  async function restoreExternalSession(name: string) {
    try {
      const current = await createSession(name, 'web', '', getSessionDisplayName(name), getExternalUserAvatar());
      setSession(current);
      writeCache({ visitorName: name, session: current, savedAt: Date.now() });
      await restoreCachedSession({ visitorName: name, session: current, savedAt: Date.now() });
    } catch {
      // 外部用户自动续接失败时，发送消息时还会再次尝试创建/续接。
    }
  }

  function connectWS(current: SessionItem, name = visitorName) {
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    const ws = new WebSocket(getWsUrl('customer', name, `customer-${name}`));
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ event: 'ping' }));
    };
    ws.onclose = () => {
      if (wsRef.current === ws) {
        reconnectTimerRef.current = window.setTimeout(() => connectWS(current, name), 3000);
      }
    };
    ws.onmessage = (event) => {
      const envelope = JSON.parse(event.data);
      if (envelope.event !== 'message') return;
      const message = parseWsData<ChatMessage>(envelope.data);
      setMessages((old) => {
        if (old.some((item) => item.id === message.id || item.id === message.client_msg_id)) {
          return old.map((item) => item.id === message.client_msg_id ? mapChatMessage(message) : item);
        }
        return [...old, mapChatMessage(message)].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });
      if (message.sender_type === 'agent') {
        const nextSession = { ...current, status: 'serving', agent_id: message.sender_id };
        setSession((old) => old ? { ...old, ...nextSession } : nextSession);
        writeCache({ visitorName: name, session: nextSession, savedAt: Date.now() });
        notifyMessage(`${brandName} 客服回复了您`, message.content.slice(0, 60));
      }
    };
  }

  async function waitForManualSocket() {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    await new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const timer = window.setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          window.clearInterval(timer);
          resolve();
        }
        if (Date.now() - start > 3000) {
          window.clearInterval(timer);
          reject(new Error('WebSocket 未连接'));
        }
      }, 50);
    });
  }

  async function handleTransferToAgent() {
    const clientMsgID = generateClientMsgID();
    setActiveTab('chat');
    setMessages((prev) => [
      ...prev,
      { id: `${clientMsgID}-system`, type: 'bot', content: '正在为您转接人工客服，请稍候...', timestamp: new Date() },
      { id: clientMsgID, type: 'user', content: '人工', timestamp: new Date() },
    ]);
    try {
      const current = await ensureManualSession();
      await waitForManualSocket();
      sendWsMessage(wsRef.current, { session_id: current.id, content: '人工', msg_type: 'text', client_msg_id: clientMsgID });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `${clientMsgID}-failed`, type: 'bot', content: err instanceof Error ? err.message : '转人工失败，请稍后重试', timestamp: new Date() },
      ]);
    }
  }

  async function sendText(text: string) {
    if (!text) return;
    const faq = faqs.find((item) => item.question === text);
    if (faq) {
      handleQuickReply(text);
      setInputValue('');
      return;
    }
    const clientMsgID = generateClientMsgID();
    setMessages((prev) => [
      ...prev,
      { id: clientMsgID, type: 'user', content: text, timestamp: new Date(), msgType: 'text', status: 'sending' },
    ]);
    setInputValue('');
    setShowEmoji(false);
    try {
      const current = await ensureManualSession();
      await waitForManualSocket();
      sendWsMessage(wsRef.current, { session_id: current.id, content: text, msg_type: 'text', client_msg_id: clientMsgID });
    } catch (err) {
      setMessages((old) => old.map((item) => item.id === clientMsgID ? { ...item, status: 'failed' } : item));
      setMessages((prev) => [
        ...prev,
        { id: `${clientMsgID}-failed`, type: 'bot', content: err instanceof Error ? err.message : '消息发送失败', timestamp: new Date(), status: 'sent' },
      ]);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const clientMsgID = generateClientMsgID('web-image');
    const localUrl = URL.createObjectURL(file);
    setActiveTab('chat');
    setMessages((prev) => [
      ...prev,
      { id: clientMsgID, type: 'user', content: localUrl, timestamp: new Date(), msgType: 'image', status: 'sending' },
    ]);
    try {
      const current = await ensureManualSession();
      const uploaded = await uploadChatImage(file);
      await waitForManualSocket();
      sendWsMessage(wsRef.current, { session_id: current.id, content: uploaded.url, msg_type: 'image', client_msg_id: clientMsgID });
      setShowEmoji(false);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `${clientMsgID}-failed`, type: 'bot', content: err instanceof Error ? err.message : '图片发送失败，请稍后重试', timestamp: new Date() },
      ]);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          unlockSound();
          setIsOpen(true);
        }}
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
        onClick={() => {
          unlockSound();
          setIsMinimized(false);
        }}
        className={`fixed bottom-6 right-6 z-50 px-5 py-3 ${t.miniBg} ${t.miniText} rounded-2xl shadow-elevated border ${t.widgetBorder} flex items-center gap-3 transition-all hover:scale-105`}
      >
        <div className={`w-8 h-8 rounded-full ${t.brandBg} flex items-center justify-center`}>
          <i className="ri-chat-3-line text-white" />
        </div>
        <span className="text-sm font-medium">{brandName} 客服</span>
        <span className={`w-2.5 h-2.5 rounded-full ${t.onlineDot}`} />
      </button>
    );
  }

  return (
    <div onClick={unlockSound} className={`fixed bottom-6 right-6 z-50 w-[380px] h-[580px] max-h-[85vh] rounded-2xl shadow-elevated overflow-hidden flex flex-col border ${t.widgetBorder} ${t.widgetBg}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${t.headerBorder} ${t.headerBg} flex-shrink-0`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-full ${t.brandBg} flex items-center justify-center`}>
            <i className="ri-chat-smile-3-line text-white" />
          </div>
          <div>
            <div className={`text-sm font-semibold ${t.headerText}`}>{brandName} 客服</div>
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
                    {msg.msgType === 'image' ? (
                      <img src={getAssetUrl(msg.content)} className="max-w-full max-h-56 rounded-xl object-contain" />
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.status === 'failed' && (
                    <div className="mt-1 text-right text-[10px] text-rose-500">发送失败</div>
                  )}
                  {msg.status === 'sending' && (
                    <div className="mt-1 text-right text-[10px] text-slate-400">发送中...</div>
                  )}
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
            {messages.length < 3 && quickReplyItems.length > 0 && (
              <div className="px-4 py-2 flex flex-wrap gap-1.5 flex-shrink-0">
                {quickReplyItems.map((reply) => (
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
            <div className={`relative px-3 py-3 border-t ${t.inputBarBorder} ${t.inputBarBg} flex-shrink-0`}>
              {showEmoji && (
                <div className="absolute left-3 bottom-[92px] z-10 grid grid-cols-5 gap-1 rounded-xl border border-slate-100 bg-white p-2 shadow-elevated">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setInputValue((old) => old + emoji)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <div className="mb-2 flex items-center gap-1.5">
                <button onClick={() => setShowEmoji((open) => !open)} className={`w-7 h-7 flex items-center justify-center rounded-lg ${t.toolBtn} ${t.toolBtnHover} transition-colors`} title="表情">
                  <i className="ri-emotion-line" />
                </button>
                <button onClick={() => imageInputRef.current?.click()} className={`w-7 h-7 flex items-center justify-center rounded-lg ${t.toolBtn} ${t.toolBtnHover} transition-colors`} title="发送图片">
                  <i className="ri-image-add-line" />
                </button>
                <button onClick={() => imageInputRef.current?.click()} className={`w-7 h-7 flex items-center justify-center rounded-lg ${t.toolBtn} ${t.toolBtnHover} transition-colors`} title="上传图片">
                  <i className="ri-folder-upload-line" />
                </button>
                <button onClick={() => imageInputRef.current?.click()} className={`w-7 h-7 flex items-center justify-center rounded-lg ${t.toolBtn} ${t.toolBtnHover} transition-colors`} title="更多">
                  <i className="ri-add-circle-line" />
                </button>
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${t.textareaBg} ${t.textareaBorder} ${t.textareaFocusBorder}`}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息..."
                  className={`flex-1 bg-transparent text-sm outline-none ${t.textareaText} ${t.textareaPlaceholder}`}
                />
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
                  onClick={handleTransferToAgent}
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
              {faqs.length === 0 && (
                <div className={`rounded-xl border ${t.settingItemBorder} ${t.settingItemBg} px-3 py-4 text-center text-xs ${t.subText}`}>
                  当前暂无常见问题
                </div>
              )}
              {faqs.map((faq) => (
                <button
                  key={faq.faq_id || faq.id || faq.question}
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
                      onClick={() => applyTheme(tk)}
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
                  { key: 'sound', label: '声音提醒', icon: 'ri-volume-up-line' },
                  { key: 'desktop', label: '桌面通知', icon: 'ri-notification-3-line' },
                  { key: 'vibration', label: '振动反馈', icon: 'ri-smartphone-line' },
                ].map((item) => (
                  <ToggleRow
                    key={item.key}
                    label={item.label}
                    icon={item.icon}
                    on={notifySettings[item.key as keyof NotifySettings]}
                    onChange={(value) => updateNotifySetting(item.key as keyof NotifySettings, value)}
                    t={t}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({ label, icon, on, onChange, t }: { label: string; icon: string; on: boolean; onChange: (value: boolean) => void; t: ReturnType<typeof getThemeClasses> }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <i className={`${icon} ${t.subText}`} />
        <span className={`text-sm ${t.text}`}>{label}</span>
      </div>
      <button
        onClick={() => onChange(!on)}
        className={`w-11 h-6 rounded-full transition-colors relative ${on ? t.toggleActive : 'bg-slate-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-soft transition-transform ${on ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
}

function readCache(): ChatCache | null {
  const raw = localStorage.getItem(getScopedStorageKey(cacheKeyPrefix));
  if (!raw) return null;
  try {
    const cache = JSON.parse(raw) as ChatCache;
    if (Date.now() - cache.savedAt > cacheTTL) return null;
    return cache;
  } catch {
    return null;
  }
}

function writeCache(cache: ChatCache) {
  localStorage.setItem(getScopedStorageKey(cacheKeyPrefix), JSON.stringify(cache));
}

function getScopedStorageKey(prefix: string) {
  const userID = getStableExternalUserID() || 'anonymous';
  return `${prefix}:${getTenantId()}:${getAppId()}:${userID}`;
}

function getExternalUserID() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('user_id') ||
    params.get('userId') ||
    params.get('uid') ||
    ''
  ).trim();
}

function getExternalUserName() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('user_name') ||
    params.get('userName') ||
    params.get('display_name') ||
    params.get('nickname') ||
    params.get('name') ||
    params.get('username') ||
    ''
  ).trim();
}

function getExternalUserAvatar() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('avatar') ||
    params.get('avatar_url') ||
    params.get('avatarUrl') ||
    params.get('user_avatar') ||
    ''
  ).trim();
}

function hasExternalProfile() {
  return !!(getExternalUserName() || getExternalUserAvatar());
}

function getStableExternalUserID() {
  return getExternalUserID() || getExternalUserName();
}

function getSessionDisplayName(userID: string) {
  return getExternalUserName() || (getExternalUserID() ? '' : userID);
}

function mapChatMessage(message: ChatMessage): Message {
  return {
    id: message.id || message.client_msg_id,
    type: message.sender_type === 'customer' ? 'user' : 'agent',
    content: message.msg_type === 'image' ? getAssetUrl(message.content) : message.content,
    timestamp: message.send_time ? new Date(message.send_time) : new Date(),
    msgType: message.msg_type === 'image' ? 'image' : 'text',
    status: 'sent',
  };
}
