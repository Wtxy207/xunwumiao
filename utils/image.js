// utils/image.js
const CACHE_KEY = 'cloudTempUrlCache';
const CACHE_TTL = 90 * 60 * 1000;
let memCache = null;
function app() { return getApp(); }
function isCloudFile(id) { return typeof id === 'string' && id.indexOf('cloud://') === 0; }
function loadCache() { if (memCache) return memCache; try { memCache = wx.getStorageSync(CACHE_KEY) || {}; } catch (e) { memCache = {}; } return memCache; }
function saveCache() { try { wx.setStorageSync(CACHE_KEY, memCache || {}); } catch (e) {} }
async function resolveMany(fileIDs) {
  const ids = [...new Set((fileIDs || []).filter(isCloudFile))];
  const map = {};
  if (!ids.length) return map;
  const cache = loadCache();
  const now = Date.now();
  const need = [];
  ids.forEach((id) => { const hit = cache[id]; if (hit && hit.expire > now) map[id] = hit.url; else need.push(id); });
  if (!need.length) return map;
  const a = app();
  if (!a || !a.globalData || !a.globalData.cloudReady) return map;
  for (let i = 0; i < need.length; i += 50) {
    const chunk = need.slice(i, i + 50);
    try {
      const res = await wx.cloud.callFunction({ name: 'caseAction', data: { action: 'fileUrl', fileList: chunk, user: a.getCurrentUser() } });
      const list = (res && res.result && res.result.fileList) || [];
      list.forEach((f) => { if (f && f.fileID && f.tempFileURL) { map[f.fileID] = f.tempFileURL; cache[f.fileID] = { url: f.tempFileURL, expire: now + CACHE_TTL }; } });
    } catch (err) { console.warn('[image] 获取临时链接失败，回退 fileID', err); }
  }
  saveCache();
  return map;
}
async function resolveOne(fileID) { if (!isCloudFile(fileID)) return fileID || ''; const map = await resolveMany([fileID]); return map[fileID] || fileID; }
async function resolveImageFields(objects, field) {
  const key = field || 'image';
  const list = (objects || []).filter(Boolean);
  const ids = list.map((o) => o[key]).filter(isCloudFile);
  if (!ids.length) return list;
  const map = await resolveMany(ids);
  list.forEach((o) => { if (o[key] && map[o[key]]) o[key] = map[o[key]]; });
  return list;
}
module.exports = { isCloudFile, resolveMany, resolveOne, resolveImageFields };
