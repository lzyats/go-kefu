import { useState, useRef, useEffect } from 'react';
import { getThemeClasses, type ChatTheme } from '../../../lib/chatTheme';

const EMOJIS = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
  '😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚',
  '😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭',
  '🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄',
  '😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕',
  '👍','👎','👏','🙌','🤝','🙏','💪','🎉','✨','❤️',
  '🔥','💯','😎','🤓','🥳','😕','😟','🙁','☹️','😮',
  '😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭',
  '🤬','💀','👻','👽','🤖','😺','😸','😹','😻','😼',
  '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈',
  '☀️','🌤','⛅','🌧','❄️','⚡','🌈','⭐','🌙','☁️',
];

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onImageClick: () => void;
  onFileClick: () => void;
  onEmojiSelect: (emoji: string) => void;
  theme: ChatTheme;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  onKeyDown,
  onImageClick,
  onFileClick,
  onEmojiSelect,
  theme,
}: ChatInputProps) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = getThemeClasses(theme);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  return (
    <div className={`flex-shrink-0 border-t ${t.inputBarBorder} ${t.inputBarBg}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 pt-2">
        <button
          onClick={() => { setShowEmoji(!showEmoji); setShowTools(false); }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showEmoji ? t.toolBtnActive : `${t.toolBtn} ${t.toolBtnHover}`}`}
          title="表情"
        >
          <i className="ri-emotion-line text-lg" />
        </button>
        <button
          onClick={() => { onImageClick(); setShowEmoji(false); }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${t.toolBtn} ${t.toolBtnHover}`}
          title="图片"
        >
          <i className="ri-image-add-line text-lg" />
        </button>
        <button
          onClick={() => { onFileClick(); setShowEmoji(false); }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${t.toolBtn} ${t.toolBtnHover}`}
          title="文件"
        >
          <i className="ri-folder-upload-line text-lg" />
        </button>
        <button
          onClick={() => { setShowTools(!showTools); setShowEmoji(false); }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showTools ? t.toolBtnActive : `${t.toolBtn} ${t.toolBtnHover}`}`}
          title="更多"
        >
          <i className="ri-add-circle-line text-lg" />
        </button>

        {showTools && (
          <div className="flex items-center gap-1 ml-1 animate-in fade-in slide-in-from-left-2">
            <button
              onClick={() => { setShowTools(false); }}
              className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors ${t.subText} ${t.hoverBg}`}
            >
              <i className="ri-camera-line" />
              拍照
            </button>
            <button
              onClick={() => { setShowTools(false); }}
              className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors ${t.subText} ${t.hoverBg}`}
            >
              <i className="ri-customer-service-2-line" />
              人工
            </button>
          </div>
        )}
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div
          ref={emojiRef}
          className={`px-3 py-2 border-b ${t.emojiPanelBorder} ${t.emojiPanelBg}`}
        >
          <div className="grid grid-cols-10 gap-1 max-h-[160px] overflow-y-auto">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onEmojiSelect(emoji); }}
                className={`w-7 h-7 flex items-center justify-center text-lg rounded transition-colors ${t.emojiHover}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 px-3 py-2.5">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="输入消息..."
          rows={1}
          className={`flex-1 min-h-[36px] max-h-[120px] px-3 py-2 rounded-xl text-sm outline-none resize-none border transition-all ${t.textareaBg} ${t.textareaText} ${t.textareaPlaceholder} ${t.textareaBorder} ${t.textareaFocusBorder}`}
        />
        <button
          onClick={onSend}
          disabled={!value.trim()}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
            value.trim()
              ? `${t.sendBtn} ${t.sendBtnHover} ${t.sendBtnText} shadow-soft`
              : `${t.sendBtnDisabled} text-slate-300 cursor-not-allowed`
          }`}
        >
          <i className="ri-send-plane-fill text-sm" />
        </button>
      </div>
    </div>
  );
}