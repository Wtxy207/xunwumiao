// pages/rank/rank.js
const app = getApp();
const util = require('../../utils/util.js');
const dbHelper = require('../../utils/db.js');

const LEVEL_RULES = [
  { name: '见习侦探', range: '0 - 49 分', color: '#8a93a9' },
  { name: '铜牌侦探', range: '50 - 99 分', color: '#d98a4a' },
  { name: '银牌侦探', range: '100 - 199 分', color: '#b8c4d8' },
  { name: '金牌侦探', range: '200 - 499 分', color: '#fbbf24' },
  { name: '名侦探', range: '500 分以上', color: '#c084fc' }
];

Page({
  data: {
    loading: true, cloudReady: true, podium: [], rest: [], total: 0,
    myRank: 0, myScore: 0,
    myLevel: { name: '见习侦探', progress: 0, toNext: 0, nextName: '', nextMin: 0 },
    stats: { lost: 0, found: 0, resolved: 0, comments: 0 },
    levelRules: LEVEL_RULES
  },
  onShow() { this.loadData(); },
  onPullDownRefresh() { this.loadData(); },
  async loadData() {
    if (!app.globalData.cloudReady) {
      this.setData({ loading: false, cloudReady: false, podium: [], rest: [] });
      wx.stopPullDownRefresh(); return;
    }
    const db = wx.cloud.database();
    const userId = app.globalData.userId;
    const safe = (promise, fallback) => promise.then((r) => r).catch(() => fallback);
    try {
      const [scoreData, myScoreRes, myLost, myFound, myLostDone, myFoundDone, myComments] = await Promise.all([
        dbHelper.fetchAll(() => db.collection('scores').orderBy('score', 'desc'), { max: 100 }),
        safe(db.collection('scores').where({ userId }).limit(1).get(), { data: [] }),
        safe(db.collection('lost_items').where({ 'poster.id': userId }).count(), { total: 0 }),
        safe(db.collection('found_items').where({ 'poster.id': userId }).count(), { total: 0 }),
        safe(db.collection('lost_items').where({ 'poster.id': userId, status: 'resolved' }).count(), { total: 0 }),
        safe(db.collection('found_items').where({ 'poster.id': userId, status: 'resolved' }).count(), { total: 0 }),
        safe(db.collection('comments').where({ userId }).count(), { total: 0 })
      ]);
      const scores = (scoreData || []).map((s, i) => {
        const lv = util.levelInfo(s.score);
        return { ...s, rankNum: i + 1, rankClass: i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : 'normal', isMe: s.userId === userId, level: lv.name, scoreNum: Number(s.score) || 0, initial: util.initials(s.name) };
      });
      const myIndex = scores.findIndex((s) => s.userId === userId);
      const myScoreFromList = myIndex >= 0 ? scores[myIndex].scoreNum : 0;
      const myScore = (myScoreRes.data[0] && Number(myScoreRes.data[0].score)) || myScoreFromList;
      const myLevel = util.levelInfo(myScore);
      const top3 = scores.slice(0, 3);
      const podium = [top3[1], top3[0], top3[2]].filter(Boolean).map((s) => ({ ...s, pos: s.rankNum === 1 ? 'first' : s.rankNum === 2 ? 'second' : 'third', place: s.rankNum }));
      this.setData({
        loading: false, cloudReady: true, podium, rest: scores.slice(3), total: scores.length,
        myRank: myIndex >= 0 ? myIndex + 1 : 0, myScore, myLevel,
        stats: { lost: myLost.total || 0, found: myFound.total || 0, resolved: (myLostDone.total || 0) + (myFoundDone.total || 0), comments: myComments.total || 0 }
      });
    } catch (err) {
      console.error('[rank] 加载失败', err);
      this.setData({ loading: false });
      util.toast('排行榜加载失败，请检查云开发配置');
    } finally { wx.stopPullDownRefresh(); }
  }
});
