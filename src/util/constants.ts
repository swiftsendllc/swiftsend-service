export const Collections = {
  USERS: 'users',
  USER_PROFILES: 'user_profiles',
  POSTS: 'posts',
  LIKES: 'likes',
  COMMENTS: 'comments',
  SAVES: 'saves',
  SHARES: 'shares',
  STORIES: 'stories',
  FOLLOWERS: 'followers',
  MESSAGES: 'messages',
  CHANNELS: 'channels',
  REELS: 'reels',
  PROFILES: 'profiles',
  REACTIONS: 'reactions',
  GROUPS: 'groups',
  GROUP_MESSAGES: 'group_messages',
  GROUP_REACTIONS: 'group_reactions',
  REPLIES: 'replies',
  SUBSCRIPTIONS: 'subscriptions',
  PAYMENTS: 'payments',
  PURCHASES: 'purchases',
  GROUP_REPLIES: 'group_replies',
  CARDS: 'cards',
  SUBSCRIPTION_PLANS: 'subscription_plans',
  ASSETS: 'assets',
  CREATOR_ASSETS: 'creator_assets',
  FAN_ASSETS: 'fan_assets',
  POST_ASSETS: 'post_assets',
  MESSAGE_ASSETS: 'message_assets',
} as const;

export enum HostNames {}
export const headerPools = [
  {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Upgrade-Insecure-Requests': '1',
  },
  {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
  },
  {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.90 Safari/537.36 Edg/118.0.2088.46',
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  },
  {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.132 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    'Accept': 'text/html,image/apng,image/*,*/*;q=0.8',
  },
  ,
  {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  {
    'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:118.0) Gecko/20100101 Firefox/118.0',
    'Accept': '*/*',
  },
  {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0',
    'Accept': 'image/webp,*/*',
  },
  {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Accept': '*/*',
  },
  {
    'User-Agent': 'Mozilla/5.0 (Android 14; Mobile; rv:118.0) Gecko/118.0 Firefox/118.0',
    'Accept': 'image/avif,image/webp,*/*',
  },
  {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.90 Safari/537.36 Edg/118.0.2088.46',
    'Accept': 'image/avif,image/webp,*/*',
  },
  {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.2222.0',
    'Accept': '*/*',
  },
  {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/117.0.5938.132 Mobile/15E148 Safari/604.1 EdgiOS/117.2045.50',
    'Accept': 'image/webp,*/*',
  },
  {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 14; Pixel 6 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.132 Mobile Safari/537.36 EdgA/117.0.2045.50',
    'Accept': 'text/html,*/*',
  },
  {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Trident/7.0; rv:11.0) like Gecko',
    'Accept': '*/*',
  },
  ,
  {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 14; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
    'Accept': 'image/avif,image/webp,*/*',
  },
  {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/22.0 Chrome/117.0.0.0 Mobile Safari/537.36',
    'Accept': '*/*',
  },
  {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.92 Safari/537.36 OPR/103.0.0.0',
    'Accept': 'image/webp,*/*',
  },
  {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.132 Mobile Safari/537.36 OPR/103.0.0.0',
    'Accept': '*/*',
  },
  {
    'User-Agent':
      'Mozilla/5.0 (Linux; U; Android 12; en-US; Pixel 4 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.132 UCBrowser/13.5.8.1306 Mobile Safari/537.36',
    'Accept': '*/*',
  },
];
