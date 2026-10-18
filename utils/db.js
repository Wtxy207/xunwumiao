// utils/db.js
// 云数据库查询辅助
function getDb() { return wx.cloud.database(); }

async function fetchAll(buildQuery, options) {
  const pageSize = (options && options.pageSize) || 20;
  const max = (options && options.max) || 100;
  const list = [];
  for (let skip = 0; skip < max; skip += pageSize) {
    const res = await buildQuery().skip(skip).limit(pageSize).get();
    const data = (res && res.data) || [];
    list.push(...data);
    if (data.length < pageSize) break;
  }
  return list;
}

async function fetchByIds(collection, ids, field) {
  const key = field || '_id';
  const db = getDb();
  const _ = db.command;
  const unique = [...new Set((ids || []).filter(Boolean))];
  const map = {};
  for (let i = 0; i < unique.length; i += 20) {
    const chunk = unique.slice(i, i + 20);
    const res = await db.collection(collection).where({ [key]: _.in(chunk) }).limit(20).get();
    (res.data || []).forEach((doc) => { map[doc[key]] = doc; });
  }
  return map;
}

module.exports = { getDb, fetchAll, fetchByIds };
