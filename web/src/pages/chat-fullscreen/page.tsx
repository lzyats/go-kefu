import { useEffect, useRef, useState } from 'react';
import ChatHeader from './components/ChatHeader';
import MessageBubble from './components/MessageBubble';
import ChatInput from './components/ChatInput';
import { getThemeClasses, hasSavedChatTheme, normalizeChatTheme, readSavedChatTheme, saveChatTheme, type ChatTheme, themeLabels, themeList } from '../../lib/chatTheme';
import { createSession, ChatMessage, getAssetUrl, getPublicConfig, getWsUrl, listSessionMessages, PublicFAQ, sendWsMessage, SessionItem, uploadChatImage } from '@/lib/customerApi';
import { notifyMessage, stopFlashTitle, unlockSound } from '@/lib/notify';

export type MessageSender = 'user' | 'bot' | 'agent';
export type MessageType = 'text' | 'image' | 'file' | 'system';

export interface FileInfo {
  name: string;
  size: string;
  type: string;
}

export interface Message {
  id: string;
  type: MessageType;
  sender: MessageSender;
  content: string;
  fileInfo?: FileInfo;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'failed';
}

interface ChatCache {
  visitorName: string;
  session: SessionItem;
  savedAt: number;
}

const cacheKeyPrefix = 'kefu:web:chat_session';
const visitorKeyPrefix = 'kefu:web:visitor_name';
const cacheTTL = 24 * 60 * 60 * 1000;

const welcomeMessages: Message[] = [
  {
    id: 'welcome',
    type: 'system',
    sender: 'bot',
    content: '客服已接入会话',
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: 'welcome2',
    type: 'text',
    sender: 'bot',
    content: '您好！我是 ChatFlow 智能客服助手，请问有什么可以帮您？您也可以直接输入"人工"转接人工客服。',
    timestamp: new Date(Date.now() - 55000),
    status: 'sent',
  },
];

function generateVisitorName() {
  const externalUserID = getStableExternalUserID();
  if (externalUserID) return externalUserID;
  const stored = localStorage.getItem(getScopedStorageKey(visitorKeyPrefix));
  if (stored) return stored;
  const name = `访客${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  localStorage.setItem(getScopedStorageKey(visitorKeyPrefix), name);
  return name;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function ChatFullscreen() {
  const [brandName, setBrandName] = useState('ChatFlow');
  const [faqs, setFaqs] = useState<PublicFAQ[]>([]);
  const [messages, setMessages] = useState<Message[]>(welcomeMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [theme, setTheme] = useState<ChatTheme>(() => readSavedChatTheme());
  const [satisfaction, setSatisfaction] = useState(0);
  const [showSatisfaction, setShowSatisfaction] = useState(false);
  const [showThemeDrawer, setShowThemeDrawer] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [session, setSession] = useState<SessionItem | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | undefined>(undefined);

  const t = getThemeClasses(theme);
  const quickReplyItems = faqs.slice(0, 6).map((item) => item.question);

  useEffect(() => {
    loadPublicConfig();
    const name = generateVisitorName();
    setVisitorName(name);
    const cache = readCache();
    if (cache && hasExternalProfile()) {
      void restoreExternalSession(name);
    } else if (cache) {
      setVisitorName(cache.visitorName);
      setSession(cache.session);
      void restoreCachedSession(cache);
    } else if (getExternalUserID()) {
      void restoreExternalSession(name);
    }
    return () => {
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  async function loadPublicConfig() {
    try {
      const config = await getPublicConfig({ force: true });
      const nextName = config.display_name || 'ChatFlow';
      setBrandName(nextName);
      setFaqs(config.faqs || []);
      if (!hasSavedChatTheme() && config.chat_theme) setTheme(normalizeChatTheme(config.chat_theme));
      setMessages((old) => old.map((item) => item.id === 'welcome2' ? {
        ...item,
        content: `您好！我是 ${nextName} 智能客服助手，请问有什么可以帮您？您也可以直接输入"人工"转接人工客服。`,
      } : item));
    } catch {
      setBrandName('ChatFlow');
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function addMessage(msg: Omit<Message, 'id' | 'timestamp'> & { id?: string; timestamp?: Date }) {
    const newMsg: Message = {
      ...msg,
      id: msg.id || generateId(),
      timestamp: msg.timestamp || new Date(),
    };
    setMessages((prev) => [...prev, newMsg]);
    return newMsg;
  }

  function addSystemMessage(content: string) {
    addMessage({ type: 'system', sender: 'bot', content, status: 'sent' });
  }

  async function ensureSession() {
    if (session) return session;
    const name = visitorName || generateVisitorName();
    setVisitorName(name);
    const created = await createSession(name, 'web', '', getSessionDisplayName(name), getExternalUserAvatar());
    setSession(created);
    writeCache({ visitorName: name, session: created, savedAt: Date.now() });
    connect(created, name);
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
      // 历史消息拉取失败时仍然续接 WebSocket，不阻断客户继续咨询。
    }
    connect(cache.session, cache.visitorName);
  }

  async function restoreExternalSession(name: string) {
    try {
      const current = await createSession(name, 'web', '', getSessionDisplayName(name), getExternalUserAvatar());
      setSession(current);
      writeCache({ visitorName: name, session: current, savedAt: Date.now() });
      await restoreCachedSession({ visitorName: name, session: current, savedAt: Date.now() });
    } catch {
      // 外部用户自动续接失败时保留欢迎页，用户发送消息时仍会再次尝试创建/续接。
    }
  }

  function connect(current: SessionItem, name: string) {
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
        reconnectTimerRef.current = window.setTimeout(() => connect(current, name), 3000);
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
        notifyMessage('客服回复了您', message.msg_type === 'image' ? '[图片]' : message.content.slice(0, 60));
        stopFlashTitle();
      }
      const nextSession = {
        ...current,
        status: message.sender_type === 'agent' ? 'serving' : current.status,
        agent_id: message.sender_type === 'agent' ? message.sender_id : current.agent_id,
      };
      writeCache({ visitorName: name, session: nextSession, savedAt: Date.now() });
      setSession((old) => old ? { ...old, ...nextSession } : nextSession);
    };
  }

  async function waitForSocket() {
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

  async function handleSendText() {
    const text = inputValue.trim();
    if (!text) return;
    const clientMsgID = `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setInputValue('');
    addMessage({ id: clientMsgID, type: 'text', sender: 'user', content: text, status: 'sending' });
    try {
      const current = await ensureSession();
      await waitForSocket();
      sendWsMessage(wsRef.current, { session_id: current.id, content: text, msg_type: 'text', client_msg_id: clientMsgID });
    } catch (err) {
      setMessages((old) => old.map((item) => item.id === clientMsgID ? { ...item, status: 'failed' } : item));
      addSystemMessage(err instanceof Error ? err.message : '消息发送失败');
    }
  }

  function handleQuickReply(text: string) {
    const faq = faqs.find((item) => item.question === text);
    if (faq) {
      addMessage({
        type: 'text',
        sender: 'user',
        content: faq.question,
        status: 'sent',
      });
      setIsTyping(true);
      window.setTimeout(() => {
        setIsTyping(false);
        addMessage({
          type: 'text',
          sender: 'bot',
          content: faq.answer,
          status: 'sent',
        });
      }, 500);
      return;
    }
    setInputValue(text);
    window.setTimeout(() => {
      void handleSendTextWithValue(text);
    });
  }

  async function handleSendTextWithValue(text: string) {
    const clientMsgID = `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setInputValue('');
    addMessage({ id: clientMsgID, type: 'text', sender: 'user', content: text, status: 'sending' });
    try {
      const current = await ensureSession();
      await waitForSocket();
      sendWsMessage(wsRef.current, { session_id: current.id, content: text, msg_type: 'text', client_msg_id: clientMsgID });
    } catch (err) {
      setMessages((old) => old.map((item) => item.id === clientMsgID ? { ...item, status: 'failed' } : item));
      addSystemMessage(err instanceof Error ? err.message : '消息发送失败');
    }
  }

  async function handleTransferToAgent() {
    const clientMsgID = `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    addSystemMessage('正在为您转接人工客服，请稍候...');
    addMessage({
      id: clientMsgID,
      type: 'text',
      sender: 'user',
      content: '人工',
      status: 'sending',
    });
    try {
      const current = await ensureSession();
      await waitForSocket();
      sendWsMessage(wsRef.current, { session_id: current.id, content: '人工', msg_type: 'text', client_msg_id: clientMsgID });
    } catch (err) {
      setMessages((old) => old.map((item) => item.id === clientMsgID ? { ...item, status: 'failed' } : item));
      addSystemMessage(err instanceof Error ? err.message : '转人工失败，请稍后重试');
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    const clientMsgID = `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    addMessage({
      id: clientMsgID,
      type: 'image',
      sender: 'user',
      content: localUrl,
      fileInfo: { name: file.name, size: formatFileSize(file.size), type: file.type },
      status: 'sending',
    });
    try {
      const current = await ensureSession();
      const uploaded = await uploadChatImage(file);
      await waitForSocket();
      sendWsMessage(wsRef.current, { session_id: current.id, content: uploaded.url, msg_type: 'image', client_msg_id: clientMsgID });
    } catch (err) {
      setMessages((old) => old.map((item) => item.id === clientMsgID ? { ...item, status: 'failed' } : item));
      addSystemMessage(err instanceof Error ? err.message : '图片发送失败');
    } finally {
      e.target.value = '';
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    addMessage({
      type: 'file',
      sender: 'user',
      content: file.name,
      fileInfo: { name: file.name, size: formatFileSize(file.size), type: file.type },
      status: 'failed',
    });
    addSystemMessage('当前仅支持图片上传，文件发送将在后续开放。');
    e.target.value = '';
  }

  function handleEmojiSelect(emoji: string) {
    setInputValue((prev) => prev + emoji);
  }

  function handleSatisfaction(star: number) {
    setSatisfaction(star);
    setShowSatisfaction(false);
    addMessage({
      type: 'text',
      sender: 'bot',
      content: `感谢您的评价，${star >= 4 ? '很高兴帮到您，如有其他问题随时联系！' : '非常抱歉体验未达预期，我们会持续改进。'}`,
      status: 'sent',
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendText();
    }
  }

  function applyTheme(nextTheme: ChatTheme) {
    setTheme(nextTheme);
    saveChatTheme(nextTheme);
  }

  return (
    <div className={`h-screen flex flex-col ${t.pageBg} font-sans overflow-hidden`} onClick={unlockSound}>
      <ChatHeader
        theme={theme}
        brandName={brandName}
        onThemeChange={applyTheme}
        onEndSession={() => setShowSatisfaction(true)}
        onTransferToAgent={() => void handleTransferToAgent()}
      />

      <div
        className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-1.5 border-b ${t.headerBorder} ${t.headerBg} cursor-pointer`}
        onClick={() => setShowThemeDrawer(true)}
      >
        <span className={`text-[11px] ${t.subText}`}>当前主题：</span>
        <span className={`w-2 h-2 rounded-full ${themeLabels[theme].dot}`} />
        <span className={`text-[11px] font-medium ${t.text}`}>{themeLabels[theme].label}</span>
        <i className={`ri-arrow-down-s-line text-[11px] ${t.subText}`} />
      </div>

      <div className={`flex-1 overflow-y-auto ${t.msgAreaBg} scroll-smooth`}>
        <div className="px-4 py-3 space-y-1">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              theme={theme}
              onImageClick={setPreviewImage}
            />
          ))}

          {isTyping && (
            <div className="flex gap-2 justify-start py-1">
              <div className={`w-8 h-8 rounded-full ${t.avatarBg} flex items-center justify-center flex-shrink-0`}>
                <i className={`ri-robot-2-line ${t.avatarIcon} text-xs`} />
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

          {showSatisfaction && (
            <div className="flex justify-center py-3">
              <div className={`max-w-xs w-full p-4 rounded-2xl shadow-soft border ${t.satisfactionBg} ${t.satisfactionBorder}`}>
                <p className={`text-sm text-center mb-3 ${t.satisfactionText}`}>
                  本次服务是否解决了您的问题？
                </p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleSatisfaction(star)}
                      className="w-9 h-9 flex items-center justify-center text-amber-400 hover:scale-125 transition-transform text-xl"
                    >
                      <i className={star <= satisfaction ? 'ri-star-fill' : 'ri-star-line'} />
                    </button>
                  ))}
                </div>
                <div className="flex justify-center gap-3 mt-3">
                  <button
                    onClick={() => setShowSatisfaction(false)}
                    className={`text-xs ${t.subText} hover:text-slate-600 transition-colors`}
                  >
                    暂不评价
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {messages.length < 5 && !showSatisfaction && quickReplyItems.length > 0 && (
        <div className={`flex-shrink-0 px-4 py-2 flex gap-2 overflow-x-auto ${t.msgAreaBg}`}>
          {quickReplyItems.map((reply) => (
            <button
              key={reply}
              onClick={() => handleQuickReply(reply)}
              className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-full border transition-colors whitespace-nowrap shadow-soft ${t.quickReplyBg} ${t.quickReplyText} ${t.quickReplyBorder} ${t.quickReplyHoverBorder} ${t.quickReplyHoverText}`}
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={() => void handleSendText()}
        onKeyDown={handleKeyDown}
        onImageClick={() => imageInputRef.current?.click()}
        onFileClick={() => fileInputRef.current?.click()}
        onEmojiSelect={handleEmojiSelect}
        theme={theme}
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.ppt,.pptx,.csv,.md,.json,.xml,.png,.jpg,.jpeg,.gif,.webp"
        className="hidden"
        onChange={handleFileUpload}
      />

      {previewImage && (
        <div
          className={`fixed inset-0 z-[60] ${t.overlayBg} flex items-center justify-center p-4`}
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={previewImage}
              alt="预览"
              className="max-w-full max-h-[80vh] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              <i className="ri-close-line text-xl" />
            </button>
          </div>
        </div>
      )}

      {showThemeDrawer && (
        <>
          <div className="fixed inset-0 z-[55] bg-black/40" onClick={() => setShowThemeDrawer(false)} />
          <div className={`fixed bottom-0 left-0 right-0 z-[56] rounded-t-2xl border-t shadow-elevated p-5 space-y-3 animate-in slide-in-from-bottom-4 ${t.widgetBg} ${t.widgetBorder}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-base font-semibold ${t.text}`}>选择主题风格</h3>
              <button
                onClick={() => setShowThemeDrawer(false)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.toolBtn} ${t.hoverBg}`}
              >
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {themeList.map((tk) => {
                const info = themeLabels[tk];
                const isActive = theme === tk;
                return (
                  <button
                    key={tk}
                    onClick={() => { applyTheme(tk); setShowThemeDrawer(false); }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      isActive
                        ? `${t.settingItemActiveBorder} ${t.settingItemActiveBg} ${t.settingItemActiveText}`
                        : `${t.settingItemBorder} ${t.settingItemBg} ${t.subText}`
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full ${info.dot}`} />
                    <div>
                      <div className={`text-sm font-medium ${isActive ? t.settingItemActiveText : t.text}`}>{info.label}</div>
                      <div className={`text-[11px] ${t.subText}`}>{info.desc}</div>
                    </div>
                    {isActive && <i className={`ri-check-line ${t.brandText} ml-auto`} />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function parseWsData<T>(data: unknown): T {
  return typeof data === 'string' ? JSON.parse(data) as T : data as T;
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
  const params = new URLSearchParams(window.location.search);
  const tenantID = params.get('tenant_id') || localStorage.getItem('kefu:web:tenant_id') || 'tenant-demo';
  const appID = params.get('app_id') || localStorage.getItem('kefu:web:app_id') || 'default';
  const userID = getStableExternalUserID() || 'anonymous';
  return `${prefix}:${tenantID}:${appID}:${userID}`;
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
    type: message.msg_type === 'image' ? 'image' : 'text',
    sender: message.sender_type === 'customer' ? 'user' : 'agent',
    content: message.msg_type === 'image' ? getAssetUrl(message.content) : message.content,
    timestamp: message.send_time ? new Date(message.send_time) : new Date(),
    status: 'sent',
  };
}
