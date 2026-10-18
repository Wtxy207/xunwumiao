// utils/chat.js
const util = require('./util.js');
const dbHelper = require('./db.js');
const MESSAGES_TAB_INDEX = 4;
function app() { return getApp(); }
function getUnread(chat, userId) {
  const u = chat && chat.unread;
  if (typeof u === 'number') return u;
  if (u && typeof u === 'object') return Number(u[userId]) || 0;
  return 0;
}
function otherOf(chat, userId) {
  const isUser1 = chat.user1 === userId;
  return { id: isUser1 ? chat.user2 : chat.user1, name: (isUser1 ? chat.name2 : chat.name1) || '对方' };
}
function previewOf(chat) {
  const type = chat.lastMsgType || 'text';
  if (type === 'image') return '[图片]';
  const msg = chat.lastMsg || '';
  if (!msg) return '开始聊天吧～';
  return msg;
}
function setBadge(total) {
  try {
    const n = Number(total) || 0;
    if (n <= 0) { wx.removeTabBarBadge({ index: MESSAGES_TAB_INDEX, fail: () => {} }); }
    else { wx.setTabBarBadge({ index: MESSAGES_TAB_INDEX, text: n > 99 ? '99+' : String(n), fail: () => {} }); }
  } catch (e) {}
}
async function refreshBadge() {
  try {
    const a = app();
    if (!a || !a.globalData || !a.globalData.cloudReady) return 0;
    const db = wx.cloud.database();
    const userId = a.globalData.userId;
    const chats = await dbHelper.fetchAll(
      () => db.collection('chats').where({ userIds: db.command.all([userId]) }),
      { max: 60 });
    const total = chats.reduce((sum, c) => sum + getUnread(c, userId), 0);
    setBadge(total);
    return total;
  } catch (e) { return 0; }
}
module.exports = { MESSAGES_TAB_INDEX, getUnread, otherOf, previewOf, setBadge, refreshBadge };
