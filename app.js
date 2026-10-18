// app.js
// 寻物喵 - 校园 AI 侦探失物招领
// 使用前只需改一处：把下面的 ENV_ID 换成你的云开发环境ID

const ENV_ID = 'cloud1-d5g4kfil366683cd2'; // TODO: 为你的云开发环境ID，形如 cloud1-xxxxxxxx
const ENV_PLACEHOLDER = 'cloud1-xxxxxxxx';
const DEFAULT_NICKNAME = '见习侦探';

const chatHelper = require('./utils/chat.js');

// 演示模式开关：仅用于路演。开启后，当对方从未在会话里回复过时，
// 会插入一条本地生成的"模拟回复"，让演示看起来是双向对话；
// 正式提交/上线时把 autoReply 改成 false 即可。
const DEMO_MODE = {
  autoReply: true
};

App({
  globalData: {
    userId: '',
    nickname: DEFAULT_NICKNAME,
    envId: ENV_ID,
    cloudReady: false,
    demoMode: DEMO_MODE
  },

  onLaunch() {
    this.initUser();

    // 云开发初始化
    if (!wx.cloud) {
      console.warn('[寻物喵] 当前基础库不支持云开发，请把调试基础库调到 2.2.3 以上');
      this.globalData.cloudReady = false;
      return;
    }
    if (!ENV_ID || ENV_ID === ENV_PLACEHOLDER) {
      console.warn('[寻物喵] 尚未配置云开发环境ID，请在 app.js 中填写 ENV_ID');
      this.globalData.cloudReady = false;
      return;
    }
    try {
      wx.cloud.init({ env: ENV_ID, traceUser: true });
      this.globalData.cloudReady = true;
      // 首次进入时刷新消息未读红点（等 App 注册完成后再调）
      setTimeout(() => {
        chatHelper.refreshBadge();
      }, 800);
    } catch (err) {
      console.error('[寻物喵] 云开发初始化失败', err);
      this.globalData.cloudReady = false;
    }
  },

  // 本地身份：不依赖登录也能保证每台设备有稳定的 userId
  initUser() {
    let userId = wx.getStorageSync('userId');
    if (!userId) {
      userId = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      wx.setStorageSync('userId', userId);
    }
    this.globalData.userId = userId;

    const nickname = wx.getStorageSync('nickname');
    this.globalData.nickname = nickname || DEFAULT_NICKNAME;
  },

  // 当前用户（发布 / 评论 / 聊天都会带上）
  getCurrentUser() {
    return {
      id: this.globalData.userId,
      name: this.globalData.nickname || DEFAULT_NICKNAME
    };
  },

  // 修改昵称：showModal 的 editable 能力（基础库 2.17.1+）
  setNickname() {
    return new Promise((resolve) => {
      wx.showModal({
        title: '你的侦探昵称',
        editable: true,
        placeholderText: '例如：福尔摩斯喵',
        content: this.globalData.nickname === DEFAULT_NICKNAME ? '' : this.globalData.nickname,
        success: (res) => {
          if (!res.confirm) return resolve(false);
          const name = (res.content || '').trim().slice(0, 12);
          if (!name) return resolve(false);
          this.globalData.nickname = name;
          wx.setStorageSync('nickname', name);
          resolve(true);
        },
        fail: () => resolve(false)
      });
    });
  },

  // 统一的云开发可用性检查
  ensureCloud() {
    if (this.globalData.cloudReady) return true;
    wx.showModal({
      title: '云开发未配置',
      content: '请先在 app.js 中填写云开发环境ID，并在云开发控制台创建数据集合，然后重新编译。',
      showCancel: false,
      confirmText: '知道了'
    });
    return false;
  },

  onError(msg) {
    console.error('[寻物喵] 未捕获错误：', msg);
  },

  onUnhandledRejection(res) {
    console.error('[寻物喵] Promise 异常：', res && res.reason);
  }
});
