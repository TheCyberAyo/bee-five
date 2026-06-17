export type InfoMenuMode =
  | 'about-us'
  | 'how-to-play'
  | 'news-updates'
  | 'privacy-policy'
  | 'settings'
  | 'dashboard'
  | 'contact-us';

export type InfoMenuItem = {
  id: InfoMenuMode;
  label: string;
  /** Emoji fallback when no Dart asset exists (Dashboard mirrors Dart header person icon). */
  icon?: string;
  /** Dart homeImagery asset served from /public/homeImagery. */
  iconImagePath?: string;
};

/** Dashboard first, Settings second — then info pages (matches Dart priority + web content order). */
export const INFO_MENU_ITEMS: InfoMenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '👤' },
  { id: 'settings', label: 'Settings', iconImagePath: '/homeImagery/settings.png' },
  { id: 'about-us', label: 'About Us', iconImagePath: '/homeImagery/tour_icon.png' },
  { id: 'how-to-play', label: 'How to Play', icon: '📖' },
  { id: 'news-updates', label: 'News/Updates', icon: '📰' },
  { id: 'privacy-policy', label: 'Privacy Policy', iconImagePath: '/homeImagery/privacy-policy.png' },
  { id: 'contact-us', label: 'Contact Us', iconImagePath: '/homeImagery/connect.png' },
];
