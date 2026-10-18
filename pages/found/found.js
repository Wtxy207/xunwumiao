// pages/found/found.js
const app = getApp();
const util = require('../../utils/util.js');
const dbHelper = require('../../utils/db.js');
const imageHelper = require('../../utils/image.js');
const COLLECTION = 'found_items';
const TYPE = 'found';
const CATEGORIES = ['全部', '水杯', '钱包', '耳机', '手机', '钥匙', '证件', '书本', '电脑', '雨伞', '眼镜', '手表', '包', '配件', '其他'];
const PLACES = ['全部', '图书馆', '食堂', '教学楼', '宿舍', '操场', '体育馆', '超市', '浴室', '实验楼', '快递站', '北区', '南区', '东区', '西区'];
Page({
  data: { loading: true, keyword: '', categories: CATEGORIES, activeCategory: '全部', list: [], total: 0, openCount: 0, filterOpen: false, status: 'all', place: '全部', sort: 'new', places: PLACES, filterCount: 0 },
  allItems: [],
  onShow() { this.consumePendingFilter(); this.loadItems(); },
  onPullDownRefresh() { this.loadItems(); },
  consumePendingFilter() {
    const pending = wx.getStorageSync('listFilter');
    if (pending && pending.for === TYPE) { wx.removeStorageSync('listFilter'); this.setData({ status: pending.status || 'all' }); }
  },
  async loadItems() {
    if (!app.globalData.cloudReady) { this.setData({ loading: false, list: [] }); wx.stopPullDownRefresh(); return; }
    try {
      const db = wx.cloud.database();
      const items = await dbHelper.fetchAll(() => db.collection(COLLECTION).orderBy('createdAt', 'desc'), { max: 200 });
      this.allItems = items.map((item) => this.enrich(item));
      await imageHelper.resolveImageFields(this.allItems);
      this.setData({ loading: false, total: this.allItems.length, openCount: this.allItems.filter((i) => i.status !== 'resolved').length });
      this.applyFilter();
    } catch (err) { console.error('[found] 加载失败', err); this.setData({ loading: false }); util.toast('加载失败，请检查云开发配置');
    } finally { wx.stopPullDownRefresh(); }
  },
  enrich(item) { return { ...item, timeAgo: util.timeAgo(item.createdAt), posterName: (item.poster && item.poster.name) || '匿名侦探', posterInitial: util.initials(item.poster && item.poster.name), resolved: item.status === 'resolved' }; },
  applyFilter() {
    const kw = (this.data.keyword || '').trim().toLowerCase();
    const cat = this.data.activeCategory, status = this.data.status, place = this.data.place, sort = this.data.sort;
    const list = this.allItems.filter((item) => {
      if (cat !== '全部') { const n = util.normalizeCategory(item.category || item.title || ''); if (n !== cat) return false; }
      if (status === 'open' && item.resolved) return false;
      if (status === 'resolved' && !item.resolved) return false;
      if (place !== '全部' && (item.location || '').indexOf(place) === -1) return false;
      if (!kw) return true;
      const hay = `${item.title || ''} ${item.location || ''} ${item.desc || ''} ${item.color || ''} ${item.category || ''}`.toLowerCase();
      return hay.indexOf(kw) !== -1;
    }).sort((a, b) => sort === 'old' ? util.toMs(a.createdAt) - util.toMs(b.createdAt) : util.toMs(b.createdAt) - util.toMs(a.createdAt));
    this.setData({ list, filterCount: (status !== 'all' ? 1 : 0) + (place !== '全部' ? 1 : 0) + (sort !== 'new' ? 1 : 0) });
  },
  onKeywordInput(e) { this.setData({ keyword: e.detail.value }); this.applyFilter(); },
  clearKeyword() { this.setData({ keyword: '' }); this.applyFilter(); },
  onCategoryTap(e) { this.setData({ activeCategory: e.currentTarget.dataset.cat }); this.applyFilter(); },
  resetAll() { this.setData({ keyword: '', activeCategory: '全部', status: 'all', place: '全部', sort: 'new' }); this.applyFilter(); },
  openFilter() { this.setData({ filterOpen: true }); },
  closeFilter() { this.setData({ filterOpen: false }); },
  pickStatus(e) { this.setData({ status: e.currentTarget.dataset.val }); this.applyFilter(); },
  pickPlace(e) { this.setData({ place: e.currentTarget.dataset.val }); this.applyFilter(); },
  pickSort(e) { this.setData({ sort: e.currentTarget.dataset.val }); this.applyFilter(); },
  resetSheet() { this.setData({ status: 'all', place: '全部', sort: 'new' }); this.applyFilter(); },
  goPublish() { wx.navigateTo({ url: 'pages/publish/publish?type=found' }); },
  goDetail(e) { const id = e.currentTarget.dataset.id; wx.navigateTo({ url: `/pages/detail/detail?id=${id}&type=${TYPE}` }); },
  onShareAppMessage() { return { title: '寻物喵 · 这些招领物品里有你的吗', path: 'pages/found/found' }; }
});
