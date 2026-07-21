export default {
  pages: [
    'pages/home/index',
    'pages/match/index',
    'pages/team/index',
    'pages/notification/index',
    'pages/profile/index',
    'pages/login/index',
  ],
  subPackages: [
    {
      root: 'subpackages/tournament',
      pages: [
        'pages/detail/index',
        'pages/register/index',
        'pages/bracket/index',
        'pages/manage/index',
        'pages/create/index',
      ],
    },
    {
      root: 'subpackages/team',
      pages: [
        'pages/detail/index',
        'pages/manage/index',
      ],
    },
    {
      root: 'subpackages/data',
      pages: [
        'pages/players/index',
        'pages/honor-roll/index',
      ],
    },
    {
      root: 'subpackages/community',
      pages: [
        'pages/square/index',
        'pages/post/index',
        'pages/publish/index',
        'pages/user/index',
        'pages/chat/index',
      ],
    },
    {
      root: 'subpackages/admin',
      pages: [
        'pages/announcement/index',
        'pages/users/index',
      ],
    },
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1a1a2e',
    navigationBarTitleText: '电竞平台',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f5f5f5',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#e94560',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home-active.png',
      },
      {
        pagePath: 'pages/match/index',
        text: '赛程',
        iconPath: 'assets/tabbar/match.png',
        selectedIconPath: 'assets/tabbar/match-active.png',
      },
      {
        pagePath: 'pages/team/index',
        text: '战队',
        iconPath: 'assets/tabbar/team.png',
        selectedIconPath: 'assets/tabbar/team-active.png',
      },
      {
        pagePath: 'pages/notification/index',
        text: '消息',
        iconPath: 'assets/tabbar/notification.png',
        selectedIconPath: 'assets/tabbar/notification-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tabbar/profile.png',
        selectedIconPath: 'assets/tabbar/profile-active.png',
      },
    ],
  },
  permission: {
    'scope.userLocation': {
      desc: '你的位置信息将用于赛事签到',
    },
  },
}
