import { useState } from 'react';
import { getThemeClasses, type ChatTheme, themeLabels, themeList } from '../../../lib/chatTheme';

interface ChatHeaderProps {
  theme: ChatTheme;
  brandName: string;
  onThemeChange: (theme: ChatTheme) => void;
  onEndSession: () => void;
  onTransferToAgent: () => void;
}

export default function ChatHeader({ theme, brandName, onThemeChange, onEndSession, onTransferToAgent }: ChatHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const t = getThemeClasses(theme);

  return (
    <header className={`relative flex-shrink-0 flex items-center justify-between px-4 h-14 border-b backdrop-blur-md ${t.headerBg} ${t.headerBorder}`}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={`w-9 h-9 rounded-full ${t.brandBg} flex items-center justify-center`}>
            <i className="ri-chat-smile-3-line text-white text-sm" />
          </div>
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${t.onlineDot} border-2 border-white`} />
        </div>
        <div>
          <div className={`text-sm font-semibold ${t.headerText}`}>{brandName} 客服</div>
          <div className={`text-[11px] ${t.headerSubText} flex items-center gap-1`}>
            <span className={`w-1 h-1 rounded-full ${t.onlineDot} animate-pulse`} />
            在线中
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="relative">
          <button
            onClick={() => { setShowThemePicker(!showThemePicker); setShowMenu(false); }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${t.toolBtn} ${t.hoverBg}`}
            title="切换主题"
          >
            <i className="ri-palette-line text-sm" />
          </button>

          {showThemePicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowThemePicker(false)} />
              <div className={`absolute right-0 top-10 w-52 rounded-xl border shadow-elevated z-50 overflow-hidden p-2 space-y-1 ${t.menuBg} ${t.menuBorder}`}>
                <div className={`px-3 py-1.5 text-xs font-semibold ${t.subText}`}>选择主题风格</div>
                {themeList.map((tk) => {
                  const info = themeLabels[tk];
                  const isActive = theme === tk;
                  return (
                    <button
                      key={tk}
                      onClick={() => { onThemeChange(tk); setShowThemePicker(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                        isActive ? `${t.settingItemActiveBg} ${t.settingItemActiveText}` : `${t.menuItemText} ${t.menuItemHover}`
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${info.dot}`} />
                      <div>
                        <div className="text-sm font-medium">{info.label}</div>
                        <div className={`text-[10px] ${t.subText}`}>{info.desc}</div>
                      </div>
                      {isActive && <i className={`ri-check-line ${t.brandText} ml-auto text-xs`} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => { setShowMenu(!showMenu); setShowThemePicker(false); }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${t.toolBtn} ${t.hoverBg}`}
          >
            <i className="ri-more-2-fill text-sm" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className={`absolute right-0 top-10 w-40 rounded-xl border shadow-elevated z-50 overflow-hidden ${t.menuBg} ${t.menuBorder}`}>
                <button
                  onClick={() => { onEndSession(); setShowMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${t.menuItemText} ${t.menuItemHover}`}
                >
                  <i className="ri-survey-line text-xs" />
                  结束并评价
                </button>
                <button
                  onClick={() => { onTransferToAgent(); setShowMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${t.menuItemText} ${t.menuItemHover}`}
                >
                  <i className="ri-customer-service-2-line text-xs" />
                  转人工客服
                </button>
                <button
                  onClick={() => { setShowMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${t.menuItemDanger} ${t.menuItemDangerHover}`}
                >
                  <i className="ri-close-circle-line text-xs" />
                  结束会话
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
