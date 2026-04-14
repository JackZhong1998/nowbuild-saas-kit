/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: ['/api/*', '/sign-in*', '/sign-up*'],
  alternateRefs: [
    { href: 'https://yourdomain.com/en', hreflang: 'en' },
    { href: 'https://yourdomain.com/zh', hreflang: 'zh' },
  ],
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/api/', '/sign-in', '/sign-up'] },
    ],
    additionalSitemaps: [],
  },
};
