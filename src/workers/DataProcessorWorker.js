/**
 * DataProcessorWorker - データ処理用Web Worker
 */

// Worker内でのメッセージ処理
self.onmessage = function(e) {
  const { type, data, id } = e.data;

  try {
    let result;

    switch (type) {
      case 'PROCESS_SEARCH_RESULTS':
        result = processSearchResults(data);
        break;
      case 'CALCULATE_DISTANCE':
        result = calculateDistance(data);
        break;
      case 'CALCULATE_AREA':
        result = calculateArea(data);
        break;
      case 'PROCESS_ROUTE_DATA':
        result = processRouteData(data);
        break;
      case 'OPTIMIZE_BOOKMARKS':
        result = optimizeBookmarks(data);
        break;
      case 'GENERATE_STATISTICS':
        result = generateStatistics(data);
        break;
      case 'COMPRESS_DATA':
        result = compressData(data);
        break;
      case 'DECOMPRESS_DATA':
        result = decompressData(data);
        break;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }

    // 結果を送信
    self.postMessage({
      type: 'SUCCESS',
      id,
      result
    });

  } catch (error) {
    // エラーを送信
    self.postMessage({
      type: 'ERROR',
      id,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
};

// 検索結果の処理
function processSearchResults(data) {
  const { results, query, filters } = data;
  
  let processedResults = results.map(result => ({
    ...result,
    relevanceScore: calculateRelevanceScore(result, query),
    distance: result.location ? calculateDistanceFromCenter(result.location, filters.center) : null
  }));

  // フィルタリング
  if (filters.category) {
    processedResults = processedResults.filter(result => 
      result.category === filters.category
    );
  }

  if (filters.maxDistance) {
    processedResults = processedResults.filter(result => 
      !result.distance || result.distance <= filters.maxDistance
    );
  }

  // ソート
  processedResults.sort((a, b) => {
    if (filters.sortBy === 'distance') {
      return (a.distance || Infinity) - (b.distance || Infinity);
    } else if (filters.sortBy === 'relevance') {
      return b.relevanceScore - a.relevanceScore;
    }
    return 0;
  });

  return {
    results: processedResults,
    totalCount: processedResults.length,
    processingTime: Date.now() - data.startTime
  };
}

// 関連度スコアの計算
function calculateRelevanceScore(result, query) {
  const queryLower = query.toLowerCase();
  const nameLower = result.name.toLowerCase();
  const descriptionLower = (result.description || '').toLowerCase();

  let score = 0;

  // 名前での完全一致
  if (nameLower === queryLower) {
    score += 100;
  } else if (nameLower.includes(queryLower)) {
    score += 50;
  }

  // 説明での一致
  if (descriptionLower.includes(queryLower)) {
    score += 25;
  }

  // 文字の近似度
  score += calculateStringSimilarity(nameLower, queryLower) * 30;

  return score;
}

// 文字列類似度の計算（Levenshtein距離ベース）
function calculateStringSimilarity(str1, str2) {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen;
}

// 距離計算（Haversine公式）
function calculateDistance(data) {
  const { point1, point2 } = data;
  
  const R = 6371; // 地球の半径（km）
  const dLat = toRadians(point2.lat - point1.lat);
  const dLon = toRadians(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return {
    distance: distance,
    unit: 'km'
  };
}

// 中心点からの距離計算
function calculateDistanceFromCenter(location, center) {
  if (!center) return null;
  
  return calculateDistance({
    point1: center,
    point2: location
  }).distance;
}

// 面積計算（Shoelace公式）
function calculateArea(data) {
  const { coordinates } = data;
  
  if (coordinates.length < 3) {
    return { area: 0, unit: 'km²' };
  }

  // 座標を地球の曲率を考慮して投影
  const projectedCoords = coordinates.map(coord => ({
    x: coord.lng * Math.cos(toRadians(coord.lat)),
    y: coord.lat
  }));

  let area = 0;
  const n = projectedCoords.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += projectedCoords[i].x * projectedCoords[j].y;
    area -= projectedCoords[j].x * projectedCoords[i].y;
  }

  area = Math.abs(area) / 2;
  
  // 度からkm²に変換（概算）
  const kmPerDegree = 111.32; // 1度あたりのkm（概算）
  area = area * kmPerDegree * kmPerDegree;

  return {
    area: area,
    unit: 'km²'
  };
}

// ルートデータの処理
function processRouteData(data) {
  const { route, options } = data;
  
  let totalDistance = 0;
  let totalDuration = 0;
  const segments = [];

  if (route.coordinates && route.coordinates.length > 1) {
    for (let i = 0; i < route.coordinates.length - 1; i++) {
      const segment = {
        start: route.coordinates[i],
        end: route.coordinates[i + 1],
        distance: calculateDistance({
          point1: { lat: route.coordinates[i][1], lng: route.coordinates[i][0] },
          point2: { lat: route.coordinates[i + 1][1], lng: route.coordinates[i + 1][0] }
        }).distance
      };
      
      segments.push(segment);
      totalDistance += segment.distance;
    }
  }

  // 推定所要時間の計算
  const speedKmh = options.mode === 'walking' ? 5 : options.mode === 'cycling' ? 20 : 50;
  totalDuration = (totalDistance / speedKmh) * 60; // 分

  return {
    totalDistance,
    totalDuration,
    segments,
    mode: options.mode,
    processingTime: Date.now() - data.startTime
  };
}

// ブックマークの最適化
function optimizeBookmarks(data) {
  const { bookmarks } = data;
  
  // 重複の除去
  const uniqueBookmarks = [];
  const seen = new Set();
  
  bookmarks.forEach(bookmark => {
    const key = `${bookmark.location.lat.toFixed(6)},${bookmark.location.lng.toFixed(6)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueBookmarks.push(bookmark);
    }
  });

  // カテゴリ別グループ化
  const groupedByCategory = {};
  uniqueBookmarks.forEach(bookmark => {
    if (!groupedByCategory[bookmark.categoryId]) {
      groupedByCategory[bookmark.categoryId] = [];
    }
    groupedByCategory[bookmark.categoryId].push(bookmark);
  });

  // 地理的クラスタリング
  const clusters = performGeographicClustering(uniqueBookmarks);

  return {
    originalCount: bookmarks.length,
    optimizedCount: uniqueBookmarks.length,
    duplicatesRemoved: bookmarks.length - uniqueBookmarks.length,
    groupedByCategory,
    clusters,
    processingTime: Date.now() - data.startTime
  };
}

// 地理的クラスタリング（簡易版）
function performGeographicClustering(bookmarks, maxDistance = 1) {
  const clusters = [];
  const processed = new Set();

  bookmarks.forEach((bookmark, index) => {
    if (processed.has(index)) return;

    const cluster = [bookmark];
    processed.add(index);

    bookmarks.forEach((otherBookmark, otherIndex) => {
      if (processed.has(otherIndex) || index === otherIndex) return;

      const distance = calculateDistance({
        point1: bookmark.location,
        point2: otherBookmark.location
      }).distance;

      if (distance <= maxDistance) {
        cluster.push(otherBookmark);
        processed.add(otherIndex);
      }
    });

    clusters.push({
      center: calculateClusterCenter(cluster),
      bookmarks: cluster,
      count: cluster.length
    });
  });

  return clusters;
}

// クラスター中心の計算
function calculateClusterCenter(bookmarks) {
  const totalLat = bookmarks.reduce((sum, bookmark) => sum + bookmark.location.lat, 0);
  const totalLng = bookmarks.reduce((sum, bookmark) => sum + bookmark.location.lng, 0);
  
  return {
    lat: totalLat / bookmarks.length,
    lng: totalLng / bookmarks.length
  };
}

// 統計情報の生成
function generateStatistics(data) {
  const { items, type } = data;
  
  const stats = {
    total: items.length,
    type: type,
    generatedAt: new Date().toISOString()
  };

  if (type === 'bookmarks') {
    stats.byCategory = {};
    stats.byMonth = {};
    stats.mostVisited = [];

    items.forEach(item => {
      // カテゴリ別統計
      stats.byCategory[item.categoryId] = (stats.byCategory[item.categoryId] || 0) + 1;

      // 月別統計
      const month = new Date(item.createdAt).toISOString().substring(0, 7);
      stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
    });

    // 最も訪問されたブックマーク
    stats.mostVisited = items
      .filter(item => item.visitCount > 0)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 10);
  }

  return stats;
}

// データ圧縮（簡易版）
function compressData(data) {
  const jsonString = JSON.stringify(data);
  
  // 簡易的な圧縮（重複文字列の置換）
  const compressionMap = new Map();
  let compressedString = jsonString;
  let compressionId = 0;

  // よく使われる文字列パターンを検出して置換
  const patterns = [
    /"lat":/g,
    /"lng":/g,
    /"name":/g,
    /"id":/g,
    /"createdAt":/g,
    /"updatedAt":/g
  ];

  patterns.forEach(pattern => {
    const matches = jsonString.match(pattern);
    if (matches && matches.length > 3) {
      const replacement = `__${compressionId}__`;
      compressionMap.set(replacement, matches[0]);
      compressedString = compressedString.replace(pattern, replacement);
      compressionId++;
    }
  });

  return {
    compressed: compressedString,
    compressionMap: Object.fromEntries(compressionMap),
    originalSize: jsonString.length,
    compressedSize: compressedString.length,
    compressionRatio: (1 - compressedString.length / jsonString.length) * 100
  };
}

// データ展開
function decompressData(data) {
  const { compressed, compressionMap } = data;
  let decompressed = compressed;

  Object.entries(compressionMap).forEach(([replacement, original]) => {
    decompressed = decompressed.replace(new RegExp(replacement, 'g'), original);
  });

  return JSON.parse(decompressed);
}

// ユーティリティ関数
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// プログレス報告
function reportProgress(current, total, message) {
  self.postMessage({
    type: 'PROGRESS',
    progress: {
      current,
      total,
      percentage: Math.round((current / total) * 100),
      message
    }
  });
}

// Worker初期化完了の通知
self.postMessage({
  type: 'READY',
  message: 'DataProcessorWorker initialized'
});