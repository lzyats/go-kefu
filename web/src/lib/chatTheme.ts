export type ChatTheme = 'fresh' | 'darkTech' | 'warm' | 'business' | 'luxury';

export interface ThemePalette {
  // Brand / accent color
  brandBg: string;
  brandBgHover: string;
  brandLight: string;
  brandText: string;
  brandBorder: string;
  // Page background
  pageBg: string;
  // Message area background
  msgAreaBg: string;
  // Header
  headerBg: string;
  headerBorder: string;
  headerText: string;
  headerSubText: string;
  // User message bubble
  userBubbleBg: string;
  userBubbleText: string;
  userBubbleBorder: string;
  // Other message bubble
  otherBubbleBg: string;
  otherBubbleText: string;
  otherBubbleBorder: string;
  // File bubble (user)
  userFileBg: string;
  userFileText: string;
  userFileSubText: string;
  userFileIconBg: string;
  // File bubble (other)
  otherFileBg: string;
  otherFileText: string;
  otherFileSubText: string;
  otherFileIconBg: string;
  otherFileBorder: string;
  // System message
  systemBg: string;
  systemText: string;
  // Avatar
  avatarBg: string;
  avatarIcon: string;
  onlineDot: string;
  typingDot: string;
  // Input bar
  inputBarBg: string;
  inputBarBorder: string;
  textareaBg: string;
  textareaText: string;
  textareaPlaceholder: string;
  textareaBorder: string;
  textareaFocusBorder: string;
  // Buttons
  sendBtn: string;
  sendBtnHover: string;
  sendBtnDisabled: string;
  sendBtnText: string;
  toolBtn: string;
  toolBtnHover: string;
  toolBtnActive: string;
  // Emoji panel
  emojiPanelBg: string;
  emojiPanelBorder: string;
  emojiHover: string;
  // Quick replies
  quickReplyBg: string;
  quickReplyText: string;
  quickReplyBorder: string;
  quickReplyHoverBorder: string;
  quickReplyHoverText: string;
  // Satisfaction card
  satisfactionBg: string;
  satisfactionBorder: string;
  satisfactionText: string;
  // Menu / dropdown
  menuBg: string;
  menuBorder: string;
  menuItemHover: string;
  menuItemText: string;
  menuItemDanger: string;
  menuItemDangerHover: string;
  // Widget specific
  widgetBg: string;
  widgetBorder: string;
  widgetShadow: string;
  tabActiveBorder: string;
  tabActiveText: string;
  tabInactiveText: string;
  tabInactiveHover: string;
  settingItemBg: string;
  settingItemBorder: string;
  settingItemActiveBg: string;
  settingItemActiveText: string;
  settingItemActiveBorder: string;
  toggleActive: string;
  // Misc
  text: string;
  subText: string;
  border: string;
  hoverBg: string;
  scrollThumb: string;
  // Floating button
  floatBtnBg: string;
  floatBtnHover: string;
  floatBtnText: string;
  floatBadge: string;
  // Minimized bar
  miniBg: string;
  miniBorder: string;
  miniText: string;
  // Chat widget content bg
  contentBg: string;
  // Overlay / modal
  overlayBg: string;
}

const freshPalette: ThemePalette = {
  brandBg: 'bg-teal-500',
  brandBgHover: 'hover:bg-teal-600',
  brandLight: 'bg-teal-50',
  brandText: 'text-teal-700',
  brandBorder: 'border-teal-500',
  pageBg: 'bg-slate-50',
  msgAreaBg: 'bg-slate-50/80',
  headerBg: 'bg-white/95',
  headerBorder: 'border-slate-100',
  headerText: 'text-slate-800',
  headerSubText: 'text-slate-500',
  userBubbleBg: 'bg-teal-500',
  userBubbleText: 'text-white',
  userBubbleBorder: 'border-teal-500',
  otherBubbleBg: 'bg-white',
  otherBubbleText: 'text-slate-800',
  otherBubbleBorder: 'border-slate-100',
  userFileBg: 'bg-teal-500',
  userFileText: 'text-white',
  userFileSubText: 'text-white/70',
  userFileIconBg: 'bg-white/20',
  otherFileBg: 'bg-white',
  otherFileText: 'text-slate-800',
  otherFileSubText: 'text-slate-400',
  otherFileIconBg: 'bg-slate-100',
  otherFileBorder: 'border-slate-100',
  systemBg: 'bg-slate-200/70',
  systemText: 'text-slate-500',
  avatarBg: 'bg-teal-100',
  avatarIcon: 'text-teal-600',
  onlineDot: 'bg-emerald-400',
  typingDot: 'bg-teal-400',
  inputBarBg: 'bg-white',
  inputBarBorder: 'border-slate-100',
  textareaBg: 'bg-slate-50',
  textareaText: 'text-slate-700',
  textareaPlaceholder: 'placeholder:text-slate-400',
  textareaBorder: 'border-transparent',
  textareaFocusBorder: 'focus:border-teal-400',
  sendBtn: 'bg-teal-500',
  sendBtnHover: 'hover:bg-teal-600',
  sendBtnDisabled: 'bg-slate-100',
  sendBtnText: 'text-white',
  toolBtn: 'text-slate-400',
  toolBtnHover: 'hover:text-teal-500',
  toolBtnActive: 'text-teal-500 bg-teal-50',
  emojiPanelBg: 'bg-slate-50',
  emojiPanelBorder: 'border-slate-100',
  emojiHover: 'hover:bg-teal-100',
  quickReplyBg: 'bg-white',
  quickReplyText: 'text-slate-600',
  quickReplyBorder: 'border-slate-200',
  quickReplyHoverBorder: 'hover:border-teal-300',
  quickReplyHoverText: 'hover:text-teal-600',
  satisfactionBg: 'bg-white',
  satisfactionBorder: 'border-slate-100',
  satisfactionText: 'text-slate-600',
  menuBg: 'bg-white',
  menuBorder: 'border-slate-100',
  menuItemHover: 'hover:bg-slate-50',
  menuItemText: 'text-slate-700',
  menuItemDanger: 'text-rose-600',
  menuItemDangerHover: 'hover:bg-rose-50',
  widgetBg: 'bg-white',
  widgetBorder: 'border-slate-200',
  widgetShadow: 'shadow-elevated',
  tabActiveBorder: 'border-teal-500',
  tabActiveText: 'text-teal-600',
  tabInactiveText: 'text-slate-500',
  tabInactiveHover: 'hover:text-slate-700',
  settingItemBg: 'bg-white',
  settingItemBorder: 'border-slate-200',
  settingItemActiveBg: 'bg-teal-50',
  settingItemActiveText: 'text-teal-700',
  settingItemActiveBorder: 'border-teal-500',
  toggleActive: 'bg-teal-500',
  text: 'text-slate-800',
  subText: 'text-slate-500',
  border: 'border-slate-100',
  hoverBg: 'hover:bg-slate-100',
  scrollThumb: 'scrollbar-thumb-slate-300',
  floatBtnBg: 'bg-teal-500',
  floatBtnHover: 'hover:bg-teal-600',
  floatBtnText: 'text-white',
  floatBadge: 'bg-red-500',
  miniBg: 'bg-white',
  miniBorder: 'border-slate-200',
  miniText: 'text-slate-800',
  contentBg: 'bg-slate-50/50',
  overlayBg: 'bg-black/80',
};

const darkTechPalette: ThemePalette = {
  brandBg: 'bg-cyan-500',
  brandBgHover: 'hover:bg-cyan-600',
  brandLight: 'bg-cyan-950',
  brandText: 'text-cyan-400',
  brandBorder: 'border-cyan-500',
  pageBg: 'bg-slate-950',
  msgAreaBg: 'bg-slate-950',
  headerBg: 'bg-slate-900/95',
  headerBorder: 'border-slate-800',
  headerText: 'text-slate-100',
  headerSubText: 'text-slate-400',
  userBubbleBg: 'bg-cyan-600',
  userBubbleText: 'text-white',
  userBubbleBorder: 'border-cyan-600',
  otherBubbleBg: 'bg-slate-800',
  otherBubbleText: 'text-slate-100',
  otherBubbleBorder: 'border-slate-700',
  userFileBg: 'bg-cyan-600',
  userFileText: 'text-white',
  userFileSubText: 'text-white/70',
  userFileIconBg: 'bg-white/20',
  otherFileBg: 'bg-slate-800',
  otherFileText: 'text-slate-200',
  otherFileSubText: 'text-slate-400',
  otherFileIconBg: 'bg-slate-700',
  otherFileBorder: 'border-slate-700',
  systemBg: 'bg-slate-800',
  systemText: 'text-slate-500',
  avatarBg: 'bg-cyan-950',
  avatarIcon: 'text-cyan-400',
  onlineDot: 'bg-cyan-400',
  typingDot: 'bg-cyan-400',
  inputBarBg: 'bg-slate-900',
  inputBarBorder: 'border-slate-800',
  textareaBg: 'bg-slate-800',
  textareaText: 'text-slate-100',
  textareaPlaceholder: 'placeholder:text-slate-500',
  textareaBorder: 'border-slate-700',
  textareaFocusBorder: 'focus:border-cyan-500',
  sendBtn: 'bg-cyan-600',
  sendBtnHover: 'hover:bg-cyan-500',
  sendBtnDisabled: 'bg-slate-800',
  sendBtnText: 'text-white',
  toolBtn: 'text-slate-400',
  toolBtnHover: 'hover:text-cyan-400',
  toolBtnActive: 'text-cyan-400 bg-cyan-950',
  emojiPanelBg: 'bg-slate-800',
  emojiPanelBorder: 'border-slate-700',
  emojiHover: 'hover:bg-cyan-950',
  quickReplyBg: 'bg-slate-800',
  quickReplyText: 'text-slate-300',
  quickReplyBorder: 'border-slate-700',
  quickReplyHoverBorder: 'hover:border-cyan-500',
  quickReplyHoverText: 'hover:text-cyan-400',
  satisfactionBg: 'bg-slate-800',
  satisfactionBorder: 'border-slate-700',
  satisfactionText: 'text-slate-300',
  menuBg: 'bg-slate-800',
  menuBorder: 'border-slate-700',
  menuItemHover: 'hover:bg-slate-700',
  menuItemText: 'text-slate-300',
  menuItemDanger: 'text-rose-400',
  menuItemDangerHover: 'hover:bg-rose-950',
  widgetBg: 'bg-slate-900',
  widgetBorder: 'border-slate-700',
  widgetShadow: 'shadow-elevated',
  tabActiveBorder: 'border-cyan-500',
  tabActiveText: 'text-cyan-400',
  tabInactiveText: 'text-slate-400',
  tabInactiveHover: 'hover:text-slate-300',
  settingItemBg: 'bg-slate-800',
  settingItemBorder: 'border-slate-700',
  settingItemActiveBg: 'bg-cyan-950',
  settingItemActiveText: 'text-cyan-400',
  settingItemActiveBorder: 'border-cyan-500',
  toggleActive: 'bg-cyan-600',
  text: 'text-slate-100',
  subText: 'text-slate-400',
  border: 'border-slate-700',
  hoverBg: 'hover:bg-slate-800',
  scrollThumb: 'scrollbar-thumb-slate-700',
  floatBtnBg: 'bg-cyan-600',
  floatBtnHover: 'hover:bg-cyan-500',
  floatBtnText: 'text-white',
  floatBadge: 'bg-red-500',
  miniBg: 'bg-slate-900',
  miniBorder: 'border-slate-700',
  miniText: 'text-slate-100',
  contentBg: 'bg-slate-950',
  overlayBg: 'bg-black/85',
};

const warmPalette: ThemePalette = {
  brandBg: 'bg-amber-500',
  brandBgHover: 'hover:bg-amber-600',
  brandLight: 'bg-amber-50',
  brandText: 'text-amber-700',
  brandBorder: 'border-amber-500',
  pageBg: 'bg-orange-50',
  msgAreaBg: 'bg-orange-50/80',
  headerBg: 'bg-white/95',
  headerBorder: 'border-orange-100',
  headerText: 'text-stone-800',
  headerSubText: 'text-stone-500',
  userBubbleBg: 'bg-amber-500',
  userBubbleText: 'text-white',
  userBubbleBorder: 'border-amber-500',
  otherBubbleBg: 'bg-white',
  otherBubbleText: 'text-stone-800',
  otherBubbleBorder: 'border-orange-100',
  userFileBg: 'bg-amber-500',
  userFileText: 'text-white',
  userFileSubText: 'text-white/70',
  userFileIconBg: 'bg-white/20',
  otherFileBg: 'bg-white',
  otherFileText: 'text-stone-800',
  otherFileSubText: 'text-stone-400',
  otherFileIconBg: 'bg-orange-100',
  otherFileBorder: 'border-orange-100',
  systemBg: 'bg-orange-200/60',
  systemText: 'text-stone-500',
  avatarBg: 'bg-amber-100',
  avatarIcon: 'text-amber-600',
  onlineDot: 'bg-emerald-400',
  typingDot: 'bg-amber-400',
  inputBarBg: 'bg-white',
  inputBarBorder: 'border-orange-100',
  textareaBg: 'bg-orange-50',
  textareaText: 'text-stone-700',
  textareaPlaceholder: 'placeholder:text-stone-400',
  textareaBorder: 'border-transparent',
  textareaFocusBorder: 'focus:border-amber-400',
  sendBtn: 'bg-amber-500',
  sendBtnHover: 'hover:bg-amber-600',
  sendBtnDisabled: 'bg-orange-100',
  sendBtnText: 'text-white',
  toolBtn: 'text-stone-400',
  toolBtnHover: 'hover:text-amber-500',
  toolBtnActive: 'text-amber-500 bg-amber-50',
  emojiPanelBg: 'bg-orange-50',
  emojiPanelBorder: 'border-orange-100',
  emojiHover: 'hover:bg-amber-100',
  quickReplyBg: 'bg-white',
  quickReplyText: 'text-stone-600',
  quickReplyBorder: 'border-orange-200',
  quickReplyHoverBorder: 'hover:border-amber-300',
  quickReplyHoverText: 'hover:text-amber-600',
  satisfactionBg: 'bg-white',
  satisfactionBorder: 'border-orange-100',
  satisfactionText: 'text-stone-600',
  menuBg: 'bg-white',
  menuBorder: 'border-orange-100',
  menuItemHover: 'hover:bg-orange-50',
  menuItemText: 'text-stone-700',
  menuItemDanger: 'text-rose-600',
  menuItemDangerHover: 'hover:bg-rose-50',
  widgetBg: 'bg-white',
  widgetBorder: 'border-orange-200',
  widgetShadow: 'shadow-elevated',
  tabActiveBorder: 'border-amber-500',
  tabActiveText: 'text-amber-600',
  tabInactiveText: 'text-stone-500',
  tabInactiveHover: 'hover:text-stone-700',
  settingItemBg: 'bg-white',
  settingItemBorder: 'border-orange-200',
  settingItemActiveBg: 'bg-amber-50',
  settingItemActiveText: 'text-amber-700',
  settingItemActiveBorder: 'border-amber-500',
  toggleActive: 'bg-amber-500',
  text: 'text-stone-800',
  subText: 'text-stone-500',
  border: 'border-orange-100',
  hoverBg: 'hover:bg-orange-50',
  scrollThumb: 'scrollbar-thumb-orange-300',
  floatBtnBg: 'bg-amber-500',
  floatBtnHover: 'hover:bg-amber-600',
  floatBtnText: 'text-white',
  floatBadge: 'bg-red-500',
  miniBg: 'bg-white',
  miniBorder: 'border-orange-200',
  miniText: 'text-stone-800',
  contentBg: 'bg-orange-50/50',
  overlayBg: 'bg-black/80',
};

const businessPalette: ThemePalette = {
  brandBg: 'bg-slate-600',
  brandBgHover: 'hover:bg-slate-700',
  brandLight: 'bg-slate-100',
  brandText: 'text-slate-700',
  brandBorder: 'border-slate-600',
  pageBg: 'bg-gray-50',
  msgAreaBg: 'bg-gray-50/80',
  headerBg: 'bg-white/95',
  headerBorder: 'border-gray-200',
  headerText: 'text-gray-900',
  headerSubText: 'text-gray-500',
  userBubbleBg: 'bg-slate-700',
  userBubbleText: 'text-white',
  userBubbleBorder: 'border-slate-700',
  otherBubbleBg: 'bg-white',
  otherBubbleText: 'text-gray-800',
  otherBubbleBorder: 'border-gray-200',
  userFileBg: 'bg-slate-700',
  userFileText: 'text-white',
  userFileSubText: 'text-white/70',
  userFileIconBg: 'bg-white/20',
  otherFileBg: 'bg-white',
  otherFileText: 'text-gray-800',
  otherFileSubText: 'text-gray-400',
  otherFileIconBg: 'bg-gray-100',
  otherFileBorder: 'border-gray-200',
  systemBg: 'bg-gray-200/70',
  systemText: 'text-gray-500',
  avatarBg: 'bg-slate-200',
  avatarIcon: 'text-slate-600',
  onlineDot: 'bg-emerald-400',
  typingDot: 'bg-slate-400',
  inputBarBg: 'bg-white',
  inputBarBorder: 'border-gray-200',
  textareaBg: 'bg-gray-50',
  textareaText: 'text-gray-700',
  textareaPlaceholder: 'placeholder:text-gray-400',
  textareaBorder: 'border-transparent',
  textareaFocusBorder: 'focus:border-slate-400',
  sendBtn: 'bg-slate-700',
  sendBtnHover: 'hover:bg-slate-800',
  sendBtnDisabled: 'bg-gray-100',
  sendBtnText: 'text-white',
  toolBtn: 'text-gray-400',
  toolBtnHover: 'hover:text-slate-600',
  toolBtnActive: 'text-slate-600 bg-slate-100',
  emojiPanelBg: 'bg-gray-50',
  emojiPanelBorder: 'border-gray-200',
  emojiHover: 'hover:bg-slate-100',
  quickReplyBg: 'bg-white',
  quickReplyText: 'text-gray-600',
  quickReplyBorder: 'border-gray-200',
  quickReplyHoverBorder: 'hover:border-slate-400',
  quickReplyHoverText: 'hover:text-slate-700',
  satisfactionBg: 'bg-white',
  satisfactionBorder: 'border-gray-200',
  satisfactionText: 'text-gray-600',
  menuBg: 'bg-white',
  menuBorder: 'border-gray-200',
  menuItemHover: 'hover:bg-gray-50',
  menuItemText: 'text-gray-700',
  menuItemDanger: 'text-rose-600',
  menuItemDangerHover: 'hover:bg-rose-50',
  widgetBg: 'bg-white',
  widgetBorder: 'border-gray-200',
  widgetShadow: 'shadow-elevated',
  tabActiveBorder: 'border-slate-600',
  tabActiveText: 'text-slate-700',
  tabInactiveText: 'text-gray-500',
  tabInactiveHover: 'hover:text-gray-700',
  settingItemBg: 'bg-white',
  settingItemBorder: 'border-gray-200',
  settingItemActiveBg: 'bg-slate-100',
  settingItemActiveText: 'text-slate-700',
  settingItemActiveBorder: 'border-slate-600',
  toggleActive: 'bg-slate-600',
  text: 'text-gray-900',
  subText: 'text-gray-500',
  border: 'border-gray-200',
  hoverBg: 'hover:bg-gray-100',
  scrollThumb: 'scrollbar-thumb-gray-300',
  floatBtnBg: 'bg-slate-700',
  floatBtnHover: 'hover:bg-slate-800',
  floatBtnText: 'text-white',
  floatBadge: 'bg-red-500',
  miniBg: 'bg-white',
  miniBorder: 'border-gray-200',
  miniText: 'text-gray-900',
  contentBg: 'bg-gray-50/50',
  overlayBg: 'bg-black/80',
};

const luxuryPalette: ThemePalette = {
  brandBg: 'bg-magenta-500',
  brandBgHover: 'hover:bg-magenta-600',
  brandLight: 'bg-magenta-50',
  brandText: 'text-magenta-600',
  brandBorder: 'border-magenta-500',
  pageBg: 'bg-white',
  msgAreaBg: 'bg-gray-50/80',
  headerBg: 'bg-white/95',
  headerBorder: 'border-slate-300',
  headerText: 'text-slate-900',
  headerSubText: 'text-slate-600',
  userBubbleBg: 'bg-magenta-500',
  userBubbleText: 'text-white',
  userBubbleBorder: 'border-magenta-500',
  otherBubbleBg: 'bg-white',
  otherBubbleText: 'text-slate-800',
  otherBubbleBorder: 'border-slate-200',
  userFileBg: 'bg-magenta-500',
  userFileText: 'text-white',
  userFileSubText: 'text-white/70',
  userFileIconBg: 'bg-white/20',
  otherFileBg: 'bg-white',
  otherFileText: 'text-slate-800',
  otherFileSubText: 'text-slate-500',
  otherFileIconBg: 'bg-slate-200',
  otherFileBorder: 'border-slate-200',
  systemBg: 'bg-slate-200/70',
  systemText: 'text-slate-600',
  avatarBg: 'bg-magenta-100',
  avatarIcon: 'text-magenta-600',
  onlineDot: 'bg-magenta-400',
  typingDot: 'bg-magenta-400',
  inputBarBg: 'bg-white',
  inputBarBorder: 'border-slate-200',
  textareaBg: 'bg-gray-50',
  textareaText: 'text-slate-800',
  textareaPlaceholder: 'placeholder:text-slate-400',
  textareaBorder: 'border-transparent',
  textareaFocusBorder: 'focus:border-magenta-500',
  sendBtn: 'bg-magenta-500',
  sendBtnHover: 'hover:bg-magenta-600',
  sendBtnDisabled: 'bg-slate-100',
  sendBtnText: 'text-white',
  toolBtn: 'text-slate-500',
  toolBtnHover: 'hover:text-magenta-500',
  toolBtnActive: 'text-magenta-500 bg-magenta-50',
  emojiPanelBg: 'bg-gray-50',
  emojiPanelBorder: 'border-slate-200',
  emojiHover: 'hover:bg-magenta-100',
  quickReplyBg: 'bg-white',
  quickReplyText: 'text-slate-700',
  quickReplyBorder: 'border-slate-300',
  quickReplyHoverBorder: 'hover:border-magenta-400',
  quickReplyHoverText: 'hover:text-magenta-600',
  satisfactionBg: 'bg-white',
  satisfactionBorder: 'border-slate-200',
  satisfactionText: 'text-slate-700',
  menuBg: 'bg-white',
  menuBorder: 'border-slate-200',
  menuItemHover: 'hover:bg-slate-100',
  menuItemText: 'text-slate-800',
  menuItemDanger: 'text-rose-600',
  menuItemDangerHover: 'hover:bg-rose-50',
  widgetBg: 'bg-white',
  widgetBorder: 'border-slate-300',
  widgetShadow: 'shadow-elevated',
  tabActiveBorder: 'border-magenta-500',
  tabActiveText: 'text-magenta-600',
  tabInactiveText: 'text-slate-500',
  tabInactiveHover: 'hover:text-slate-800',
  settingItemBg: 'bg-white',
  settingItemBorder: 'border-slate-300',
  settingItemActiveBg: 'bg-magenta-50',
  settingItemActiveText: 'text-magenta-700',
  settingItemActiveBorder: 'border-magenta-500',
  toggleActive: 'bg-magenta-500',
  text: 'text-slate-900',
  subText: 'text-slate-600',
  border: 'border-slate-300',
  hoverBg: 'hover:bg-slate-100',
  scrollThumb: 'scrollbar-thumb-slate-400',
  floatBtnBg: 'bg-magenta-500',
  floatBtnHover: 'hover:bg-magenta-600',
  floatBtnText: 'text-white',
  floatBadge: 'bg-red-500',
  miniBg: 'bg-white',
  miniBorder: 'border-slate-300',
  miniText: 'text-slate-900',
  contentBg: 'bg-gray-50/50',
  overlayBg: 'bg-black/80',
};

const palettes: Record<ChatTheme, ThemePalette> = {
  fresh: freshPalette,
  darkTech: darkTechPalette,
  warm: warmPalette,
  business: businessPalette,
  luxury: luxuryPalette,
};

export function getThemeClasses(theme: ChatTheme): ThemePalette {
  return palettes[theme] || freshPalette;
}

export const themeLabels: Record<ChatTheme, { label: string; desc: string; color: string; dot: string }> = {
  fresh: { label: '清新青绿', desc: '明亮简约，科技感', color: 'bg-teal-500', dot: 'bg-teal-400' },
  darkTech: { label: '深色科技', desc: '沉浸式深色风格', color: 'bg-cyan-600', dot: 'bg-cyan-400' },
  warm: { label: '暖色亲和', desc: '温馨友好，舒适', color: 'bg-amber-500', dot: 'bg-amber-400' },
  business: { label: '商务极简', desc: '专业稳重，中性', color: 'bg-slate-600', dot: 'bg-slate-400' },
  luxury: { label: '奢华版', desc: '高端典雅，紫粉', color: 'bg-magenta-500', dot: 'bg-magenta-400' },
};

export const themeList: ChatTheme[] = ['fresh', 'darkTech', 'warm', 'business', 'luxury'];

export const chatThemeStorageKey = 'kefu:web:chat_theme';

export function normalizeChatTheme(value: unknown): ChatTheme {
  return themeList.includes(value as ChatTheme) ? (value as ChatTheme) : 'fresh';
}

function readUrlChatTheme(): ChatTheme | null {
  if (typeof window === 'undefined') return null;
  const theme = new URLSearchParams(window.location.search).get('theme');
  return theme && themeList.includes(theme as ChatTheme) ? (theme as ChatTheme) : null;
}

export function readSavedChatTheme(): ChatTheme {
  if (typeof window === 'undefined') return 'fresh';
  const urlTheme = readUrlChatTheme();
  if (urlTheme) return urlTheme;
  return normalizeChatTheme(window.localStorage.getItem(chatThemeStorageKey));
}

export function hasSavedChatTheme() {
  if (typeof window === 'undefined') return false;
  return Boolean(readUrlChatTheme() || window.localStorage.getItem(chatThemeStorageKey));
}

export function saveChatTheme(theme: ChatTheme) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(chatThemeStorageKey, theme);
}
