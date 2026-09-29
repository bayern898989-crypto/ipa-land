/* 音标乐园 · 内容库加载
   内容库是唯一数据源：拉取 8 个 content-batch json，展开成单元/课程列表。
   禁止在这里硬编码任何词表——所有词汇一律来自 JSON。
*/
(function (global) {
  const BATCH_FILES = [
    'content-batch-1-short-vowels.json',
    'content-batch-2-long-vowels.json',
    'content-batch-3-schwa-diphthongs.json',
    'content-batch-4-diphthongs2.json',
    'content-batch-5-plosives.json',
    'content-batch-6-fricatives.json',
    'content-batch-7-affricates.json',
    'content-batch-8-sonorants.json',
  ];

  let cache = null; // Promise<Array<Unit>>

  function loadAll() {
    if (cache) return cache;
    cache = Promise.all(
      BATCH_FILES.map((f) =>
        fetch(f).then((r) => {
          if (!r.ok) throw new Error('内容加载失败：' + f);
          return r.json();
        })
      )
    ).then((batches) => {
      let lessonNum = 0;
      return batches.map((data, bIdx) => ({
        batchNum: bIdx + 1,
        file: BATCH_FILES[bIdx],
        title: data.meta.batch,
        sounds: data.sounds.map((s, sIdx) => {
          lessonNum++;
          return Object.assign({}, s, {
            batchNum: bIdx + 1,
            indexInBatch: sIdx,
            lessonNum,
          });
        }),
      }));
    });
    return cache;
  }

  function getSound(batchNum, indexInBatch) {
    return loadAll().then((units) => {
      const unit = units.find((u) => u.batchNum === Number(batchNum));
      if (!unit) return null;
      return unit.sounds[Number(indexInBatch)] || null;
    });
  }

  global.IpaData = { loadAll, getSound };
})(window);
