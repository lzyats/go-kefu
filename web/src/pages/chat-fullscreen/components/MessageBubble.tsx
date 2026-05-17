import type { Message } from '../page';
import { getThemeClasses, type ChatTheme } from '../../../lib/chatTheme';

interface MessageBubbleProps {
  message: Message;
  theme: ChatTheme;
  onImageClick: (url: string) => void;
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getFileIcon(type: string): string {
  if (type.includes('pdf')) return 'ri-file-pdf-line text-red-500';
  if (type.includes('word') || type.includes('doc')) return 'ri-file-word-line text-blue-500';
  if (type.includes('excel') || type.includes('sheet') || type.includes('csv')) return 'ri-file-excel-line text-emerald-500';
  if (type.includes('ppt')) return 'ri-file-ppt-line text-orange-500';
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return 'ri-file-zip-line text-amber-500';
  if (type.includes('image')) return 'ri-image-line text-teal-500';
  if (type.includes('video')) return 'ri-video-line text-rose-500';
  if (type.includes('audio')) return 'ri-music-line text-violet-500';
  if (type.includes('code') || type.includes('json') || type.includes('xml') || type.includes('javascript')) return 'ri-file-code-line text-slate-500';
  return 'ri-file-text-line text-slate-500';
}

export default function MessageBubble({ message, theme, onImageClick }: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  const isSystem = message.type === 'system';
  const t = getThemeClasses(theme);

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className={`text-[11px] px-3 py-1 rounded-full ${t.systemBg} ${t.systemText}`}>
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2.5 py-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className={`w-8 h-8 rounded-full ${t.avatarBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <i className={`${message.sender === 'bot' ? 'ri-robot-2-line' : 'ri-customer-service-2-line'} ${t.avatarIcon} text-xs`} />
        </div>
      )}

      <div className={`max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Text message */}
        {message.type === 'text' && (
          <div
            className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-soft border ${
              isUser
                ? `${t.userBubbleBg} ${t.userBubbleText} rounded-tr-sm ${t.userBubbleBorder}`
                : `${t.otherBubbleBg} ${t.otherBubbleText} rounded-tl-sm ${t.otherBubbleBorder}`
            }`}
          >
            {message.content}
          </div>
        )}

        {/* Image message */}
        {message.type === 'image' && (
          <div
            className={`rounded-2xl overflow-hidden cursor-pointer shadow-soft border ${
              isUser ? `rounded-tr-sm ${t.userBubbleBorder}` : `rounded-tl-sm ${t.otherBubbleBorder}`
            }`}
            onClick={() => onImageClick(message.content)}
          >
            <img
              src={message.content}
              alt="图片消息"
              className="max-w-[200px] max-h-[240px] w-auto h-auto object-cover rounded-2xl"
              loading="lazy"
            />
          </div>
        )}

        {/* File message */}
        {message.type === 'file' && (
          <div
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl max-w-[260px] shadow-soft border ${
              isUser
                ? `${t.userFileBg} rounded-tr-sm ${t.userBubbleBorder}`
                : `${t.otherFileBg} rounded-tl-sm ${t.otherFileBorder}`
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isUser ? t.userFileIconBg : t.otherFileIconBg}`}>
              <i className={`${getFileIcon(message.fileInfo?.type || '')} text-lg`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-sm truncate ${isUser ? t.userFileText : t.otherFileText}`}>
                {message.fileInfo?.name || message.content}
              </div>
              <div className={`text-[11px] ${isUser ? t.userFileSubText : t.otherFileSubText}`}>
                {message.fileInfo?.size}
              </div>
            </div>
            <button className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isUser ? 'hover:bg-white/20 text-white/80' : 'hover:bg-slate-100 text-slate-400'
            }`}>
              <i className="ri-download-line text-sm" />
            </button>
          </div>
        )}

        <span className={`text-[10px] mt-1 ${t.subText}`}>
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}