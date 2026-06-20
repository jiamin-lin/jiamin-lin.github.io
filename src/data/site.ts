export const site = {
  name: 'Drzone',
  title: 'Drzone Cloud Field Notes',
  description: 'Cloud architecture field notes for resilient, secure, and cost-aware systems.',
  url: 'https://jiamin-lin.github.io'
};

export const languages = ['zh-cn', 'en', 'ja'] as const;
export type Lang = (typeof languages)[number];

export const languageLabels: Record<Lang, string> = {
  'zh-cn': '中文',
  en: 'English',
  ja: '日本語'
};

export const htmlLang: Record<Lang, string> = {
  'zh-cn': 'zh-CN',
  en: 'en',
  ja: 'ja'
};

export const homeCopy: Record<Lang, {
  eyebrow: string;
  title: string;
  description: string;
  latest: string;
  empty: string;
}> = {
  'zh-cn': {
    eyebrow: 'AWS SA / Silicon Valley',
    title: '面向真实业务系统的云架构笔记。',
    description: '整理架构评审、迁移设计、安全边界、可观测性和成本优化中的可复用判断。',
    latest: '最新笔记',
    empty: '笔记正在整理中。'
  },
  en: {
    eyebrow: 'AWS SA / Silicon Valley',
    title: 'Cloud architecture field notes for real systems.',
    description: 'A place for architecture reviews, migration patterns, security boundaries, observability, and cost-aware design.',
    latest: 'Latest briefings',
    empty: 'Briefings are being drafted.'
  },
  ja: {
    eyebrow: 'AWS SA / Silicon Valley',
    title: '実運用システムのためのクラウド設計ノート。',
    description: 'アーキテクチャレビュー、移行設計、セキュリティ境界、可観測性、コスト最適化を整理します。',
    latest: '最新ノート',
    empty: 'ノートを準備中です。'
  }
};

export const navItems = [
  { href: '/', label: 'Home' },
  { href: '/blog/', label: 'Blog' },
  { href: '/tags/', label: 'Tags' },
  { href: '/about/', label: 'About' }
];

export const operatingPillars = [
  {
    title: 'Architecture Reviews',
    text: 'Well-Architected tradeoffs, blast radius, deployment safety, and platform boundaries.'
  },
  {
    title: 'Migration Playbooks',
    text: 'Landing zones, identity, networking, data movement, cutover, and rollback plans.'
  },
  {
    title: 'Builder Notes',
    text: 'Short writeups from labs, prototypes, service deep dives, and design experiments.'
  }
];
