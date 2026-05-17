import { useState, useRef, useEffect } from 'react';
import ChatHeader from './components/ChatHeader';
import MessageBubble from './components/MessageBubble';
import ChatInput from './components/ChatInput';
import { getThemeClasses, type ChatTheme, themeLabels, themeList } from '../../lib/chatTheme';

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

const quickReplies = [
  '产品定价',
  '技术支持',
  '账户问题',
  '功能咨询',
  '申请发票',
  '退款查询',
];

const botResponses: Record<string, string> = {
  '产品定价': '我们提供三种方案：基础版¥99/月（5坐席）、专业版¥299/月（20坐席）、企业版按需定制。需要详细了解吗？',
  '技术支持': '技术支持团队工作日 9:00-21:00 在线。您可以描述遇到的具体问题，我会尽力帮您解决。',
  '账户问题': '常见的账户问题包括：密码重置、权限调整、账户注销等。请问您遇到的是哪种情况？',
  '功能咨询': 'ChatFlow 支持实时聊天、AI机器人、FAQ检索、多语言、满意度评分、数据分析等功能。您对哪方面感兴趣？',
  '申请发票': '您可以在订单详情页点击"申请发票"，填写抬头、税号等信息后提交，电子发票将在24小时内发送至您的邮箱。',
  '退款查询': '退款一般会在3-7个工作日内原路返回，具体时间视银行处理速度而定。如有异常请联系人工客服。',
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
  return '抱歉，我可能没有完全理解您的问题。您可以尝试点击下方快捷回复，或输入"人工"转接人工客服。';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function ChatFullscreen() {
  const [messages, setMessages] = useState<Message[]>([
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
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [theme, setTheme] = useState<ChatTheme>('fresh');
  const [satisfaction, setSatisfaction] = useState(0);
  const [showSatisfaction, setShowSatisfaction] = useState(false);
  const [showThemeDrawer, setShowThemeDrawer] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = getThemeClasses(theme);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const addMessage = (msg: Omit<Message, 'id' | 'timestamp'> & { timestamp?: Date }) => {
    const newMsg: Message = {
      ...msg,
      id: generateId(),
      timestamp: msg.timestamp || new Date(),
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const sendBotReply = (userContent: string, delay = 1200) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply = getBotReply(userContent);
      addMessage({
        type: 'text',
        sender: 'bot',
        content: reply,
        status: 'sent',
      });
    }, delay);
  };

  const handleSendText = () => {
    const text = inputValue.trim();
    if (!text) return;

    addMessage({
      type: 'text',
      sender: 'user',
      content: text,
      status: 'sent',
    });
    setInputValue('');

    if (text.includes('人工')) {
      addMessage({
        type: 'system',
        sender: 'bot',
        content: '正在为您转接人工客服，请稍候...',
      });
      setTimeout(() => {
        addMessage({
          type: 'text',
          sender: 'agent',
          content: '您好！我是人工客服小李，已收到您的会话，请问有什么可以帮您？',
          status: 'sent',
        });
      }, 1500);
      return;
    }

    sendBotReply(text);
  };

  const handleQuickReply = (text: string) => {
    addMessage({
      type: 'text',
      sender: 'user',
      content: text,
      status: 'sent',
    });
    sendBotReply(text, 800);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    addMessage({
      type: 'image',
      sender: 'user',
      content: url,
      fileInfo: { name: file.name, size: formatFileSize(file.size), type: file.type },
      status: 'sent',
    });
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage({
        type: 'text',
        sender: 'bot',
        content: '已收到您发送的图片，请问有什么需要我帮您解答的吗？',
        status: 'sent',
      });
    }, 1500);
    e.target.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addMessage({
      type: 'file',
      sender: 'user',
      content: file.name,
      fileInfo: { name: file.name, size: formatFileSize(file.size), type: file.type },
      status: 'sent',
    });
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage({
        type: 'text',
        sender: 'bot',
        content: `已收到您发送的文件「${file.name}」，我们会尽快处理。如有疑问请继续提问。`,
        status: 'sent',
      });
    }, 1500);
    e.target.value = '';
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputValue((prev) => prev + emoji);
  };

  const handleSatisfaction = (star: number) => {
    setSatisfaction(star);
    setShowSatisfaction(false);
    addMessage({
      type: 'text',
      sender: 'bot',
      content: `感谢您的评价！${star >= 4 ? '很高兴帮到您，如有其他问题随时联系！' : '非常抱歉体验未达预期，我们会持续改进。'}`,
      status: 'sent',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleToggleTheme = () => {
    setShowThemeDrawer(true);
  };

  const cycleTheme = () => {
    const idx = themeList.indexOf(theme);
    setTheme(themeList[(idx + 1) % themeList.length]);
  };

  return (
    <div className={`h-screen flex flex-col ${t.pageBg} font-sans overflow-hidden`}>
      <ChatHeader
        theme={theme}
        onToggleTheme={cycleTheme}
        onEndSession={() => setShowSatisfaction(true)}
      />

      {/* Theme switcher hint */}
      <div
        className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-1.5 border-b ${t.headerBorder} ${t.headerBg} cursor-pointer`}
        onClick={() => setShowThemeDrawer(true)}
      >
        <span className={`text-[11px] ${t.subText}`}>当前主题：</span>
        <span className={`w-2 h-2 rounded-full ${themeLabels[theme].dot}`} />
        <span className={`text-[11px] font-medium ${t.text}`}>{themeLabels[theme].label}</span>
        <i className={`ri-arrow-down-s-line text-[11px] ${t.subText}`} />
      </div>

      {/* Messages area */}
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

          {/* Satisfaction card */}
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

      {/* Quick replies */}
      {messages.length < 5 && !showSatisfaction && (
        <div className={`flex-shrink-0 px-4 py-2 flex gap-2 overflow-x-auto ${t.msgAreaBg}`}>
          {quickReplies.map((reply) => (
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
        onSend={handleSendText}
        onKeyDown={handleKeyDown}
        onImageClick={() => imageInputRef.current?.click()}
        onFileClick={() => fileInputRef.current?.click()}
        onEmojiSelect={handleEmojiSelect}
        theme={theme}
      />

      {/* Hidden file inputs */}
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

      {/* Image preview modal */}
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

      {/* Theme drawer */}
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
                    onClick={() => { setTheme(tk); setShowThemeDrawer(false); }}
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