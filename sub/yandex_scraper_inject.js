// ═══════════════════════════════════════════════════════════════════════════
// Yandex Maps Category Scraper v3 — Interceptor-Based
// ═══════════════════════════════════════════════════════════════════════════
// HOW IT WORKS:
// 1. Intercepts the Yandex Maps SPA's own XHR requests
// 2. When YOU do a search via the maps search bar, captures all params
// 3. Replays those exact params for our automated searches
// ═══════════════════════════════════════════════════════════════════════════
// USAGE:
// 1. Open https://yandex.ru/maps/ (logged in)
// 2. Open DevTools (F12) → Console
// 3. Paste this script → Enter
// 4. Type ANY search in the maps search bar (e.g. "кафе") → hit Enter
// 5. The panel will say "✓ Шаблон захвачен!" — now automated search works
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const old = document.getElementById('ym-scraper-panel');
  if (old) old.remove();

  // ── State ──────────────────────────────────────────────────────────────
  const STATE = {
    capturedTemplate: null,  // captured search request template
    csrfToken: null,
    sessionId: null,
    rubricQueue: [],
    resolvedRubrics: [],
    allPlaces: {},
    isRunning: false,
    delay: 1200,
  };

  // ── XHR Interceptor ─────────────────────────────────────────────────
  // Monkey-patch XMLHttpRequest to capture the Yandex Maps SPA's own
  // search requests. This gives us the exact params format that works.
  const _origOpen = XMLHttpRequest.prototype.open;
  const _origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    this._ymUrl = url;
    this._ymMethod = method;
    return _origOpen.call(this, method, url, ...args);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    if (this._ymUrl && this._ymUrl.includes('/maps/api/search?')) {
      try {
        const urlObj = new URL(this._ymUrl, window.location.origin);
        const params = Object.fromEntries(urlObj.searchParams.entries());
        // Only capture if it has a text param (real search, not our custom)
        if (params.text && !params._ym_custom) {
          STATE.capturedTemplate = params;
          // Extract key values
          if (params.csrfToken) STATE.csrfToken = params.csrfToken;
          if (params.sessionId) STATE.sessionId = params.sessionId;
          console.log('%c[YM] ✓ Search template captured!', 'color: #00e676; font-weight: bold; font-size: 14px');
          console.log('[YM] Params:', Object.keys(params).join(', '));
          updateCaptureStatus(true, `Захвачено ${Object.keys(params).length} параметров`);
        }
      } catch (e) {
        console.error('[YM] Intercept error:', e);
      }
    }
    return _origSend.apply(this, args);
  };

  // Also intercept fetch for newer implementations
  const _origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url.includes('/maps/api/search?')) {
      try {
        const urlObj = new URL(url, window.location.origin);
        const params = Object.fromEntries(urlObj.searchParams.entries());
        if (params.text && !params._ym_custom) {
          STATE.capturedTemplate = params;
          if (params.csrfToken) STATE.csrfToken = params.csrfToken;
          if (params.sessionId) STATE.sessionId = params.sessionId;
          console.log('%c[YM] ✓ Search template captured (fetch)!', 'color: #00e676; font-weight: bold; font-size: 14px');
          console.log('[YM] Params:', Object.keys(params).join(', '));
          updateCaptureStatus(true, `Захвачено ${Object.keys(params).length} параметров`);
        }
      } catch (e) { }
    }
    return _origFetch.apply(this, arguments);
  };

  // ── CSS ────────────────────────────────────────────────────────────────
  const CSS = `
#ym-scraper-panel {
  position: fixed; top: 10px; right: 10px; z-index: 999999;
  width: 480px; max-height: 92vh;
  background: #1a1a2e; color: #e0e0e0;
  border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,.5);
  font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px;
  display: flex; flex-direction: column; overflow: hidden;
  border: 1px solid rgba(255,255,255,.08); resize: both;
}
#ym-scraper-panel * { box-sizing: border-box; }
.ym-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: linear-gradient(135deg, #16213e, #0f3460);
  cursor: move; user-select: none; flex-shrink: 0;
}
.ym-header h3 { margin: 0; font-size: 14px; color: #e94560; font-weight: 700; }
.ym-close { background: none; border: none; color: #888; font-size: 20px; cursor: pointer; padding: 0 4px; }
.ym-close:hover { color: #e94560; }
.ym-tabs { display: flex; background: #16213e; border-bottom: 1px solid #0f3460; flex-shrink: 0; }
.ym-tab {
  flex: 1; padding: 7px 4px; text-align: center; cursor: pointer;
  color: #888; border-bottom: 2px solid transparent; transition: all .2s;
  font-size: 11px; font-weight: 600;
}
.ym-tab:hover { color: #ccc; }
.ym-tab.active { color: #e94560; border-bottom-color: #e94560; }
.ym-body { padding: 12px 14px; overflow-y: auto; flex: 1; }
.ym-section { margin-bottom: 12px; }
.ym-section label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: .5px; display: block; margin-bottom: 4px; }
.ym-btn {
  padding: 6px 14px; border: none; border-radius: 6px; cursor: pointer;
  font-size: 11px; font-weight: 600; transition: all .15s;
}
.ym-btn-primary { background: #e94560; color: #fff; }
.ym-btn-primary:hover { background: #c81d45; }
.ym-btn-primary:disabled { background: #555; cursor: not-allowed; color: #999; }
.ym-btn-secondary { background: #16213e; color: #aaa; border: 1px solid #333; }
.ym-btn-secondary:hover { color: #fff; border-color: #e94560; }
.ym-btn-sm { padding: 4px 8px; font-size: 10px; }
.ym-btn-danger { background: #c0392b; color: #fff; }
.ym-status {
  display: flex; align-items: center; gap: 6px; padding: 6px 10px;
  background: #16213e; border-radius: 6px; margin: 6px 0; font-size: 11px;
}
.ym-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ym-dot-green { background: #00e676; box-shadow: 0 0 6px #00e676; }
.ym-dot-red { background: #e94560; box-shadow: 0 0 6px #e94560; }
.ym-dot-yellow { background: #ffc107; box-shadow: 0 0 6px #ffc107; }
.ym-progress { width: 100%; height: 4px; background: #16213e; border-radius: 2px; margin: 6px 0; overflow: hidden; }
.ym-progress-bar { height: 100%; background: linear-gradient(90deg, #e94560, #ff6b6b); border-radius: 2px; transition: width .3s; }
.ym-log {
  background: #0a0a1a; padding: 8px; border-radius: 6px; max-height: 180px;
  overflow-y: auto; font-family: 'Consolas', monospace; font-size: 10px;
  line-height: 1.4; margin: 6px 0;
}
.ym-log-entry { padding: 1px 0; }
.ym-log-ok { color: #00e676; }
.ym-log-err { color: #e94560; }
.ym-log-info { color: #64b5f6; }
.ym-log-warn { color: #ffc107; }
.ym-input {
  width: 100%; padding: 6px 8px; background: #0f3460; border: 1px solid #333;
  border-radius: 6px; color: #e0e0e0; font-size: 12px; outline: none;
}
.ym-input:focus { border-color: #e94560; }
.ym-input::placeholder { color: #555; }
.ym-row { display: flex; gap: 6px; align-items: center; }
.ym-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin: 6px 0; }
.ym-stat { background: #16213e; padding: 8px; border-radius: 6px; text-align: center; }
.ym-stat-num { font-size: 20px; font-weight: 700; color: #e94560; }
.ym-stat-label { font-size: 9px; color: #888; margin-top: 2px; }
.ym-suggest-list {
  background: #0f3460; border: 1px solid #333; border-top: none;
  border-radius: 0 0 6px 6px; max-height: 150px; overflow-y: auto; display: none;
}
.ym-suggest-item {
  padding: 6px 10px; cursor: pointer; font-size: 11px;
  border-bottom: 1px solid rgba(255,255,255,.04); display: flex;
  justify-content: space-between; align-items: center;
}
.ym-suggest-item:hover { background: rgba(233,69,96,.15); }
.ym-suggest-item .ym-s-name { color: #e0e0e0; }
.ym-suggest-item .ym-s-count { color: #888; font-size: 10px; }
.ym-suggest-item .ym-s-id { color: #64b5f6; font-size: 10px; font-family: monospace; }
.ym-queue-list { max-height: 160px; overflow-y: auto; margin: 6px 0; }
.ym-queue-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 4px 8px; background: #16213e; border-radius: 4px;
  margin-bottom: 3px; font-size: 11px;
}
.ym-queue-item.resolved { border-left: 3px solid #00e676; }
.ym-queue-item.pending { border-left: 3px solid #ffc107; }
.ym-queue-item .ym-q-remove { color: #e94560; cursor: pointer; font-size: 14px; background: none; border: none; padding: 0 2px; }
textarea.ym-input { min-height: 70px; resize: vertical; font-family: inherit; }
select.ym-input { cursor: pointer; }
.ym-capture-box {
  background: linear-gradient(135deg, #0f3460, #16213e); border: 2px dashed #e94560;
  border-radius: 8px; padding: 16px; text-align: center; margin: 8px 0;
}
.ym-capture-box.captured { border-color: #00e676; border-style: solid; }
`;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // ── Build Panel ────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'ym-scraper-panel';
  panel.innerHTML = `
  <div class="ym-header" id="ym-drag-handle">
    <h3>🗺 YM Scraper v3</h3>
    <div class="ym-row">
      <span id="ym-capture-dot" class="ym-dot ym-dot-red" title="Capture"></span>
      <button class="ym-close" id="ym-close-btn">×</button>
    </div>
  </div>
  <div class="ym-tabs">
    <div class="ym-tab active" data-tab="capture">🎯 Захват</div>
    <div class="ym-tab" data-tab="find">🔍 Найти</div>
    <div class="ym-tab" data-tab="queue">📋 Очередь</div>
    <div class="ym-tab" data-tab="search">📍 Места</div>
    <div class="ym-tab" data-tab="export">💾 Экспорт</div>
  </div>
  <div class="ym-body">

    <!-- CAPTURE TAB -->
    <div class="ym-pane" id="ym-pane-capture">
      <div class="ym-capture-box" id="ym-capture-box">
        <div style="font-size:24px;margin-bottom:8px">🎯</div>
        <div style="font-size:13px;font-weight:600;color:#e94560">Шаг 1: Захват шаблона</div>
        <div style="font-size:11px;color:#aaa;margin-top:6px">
          Введите <b>любой</b> запрос в строку поиска Яндекс Карт<br>
          (например: кафе, аптека, магазин) и нажмите Enter.<br>
          Скрипт перехватит параметры рабочего запроса.
        </div>
      </div>
      <div class="ym-status" id="ym-capture-status">
        <span class="ym-dot ym-dot-red"></span>
        <span>Ожидание поиска через UI карт...</span>
      </div>
      <div class="ym-section" style="margin-top:10px">
        <label>Настройки</label>
        <div class="ym-row" style="margin-top:4px">
          <span style="font-size:11px;min-width:65px">Задержка:</span>
          <input type="number" id="ym-delay" class="ym-input" value="1200" min="300" max="10000" style="width:80px">
          <span style="font-size:11px">мс</span>
        </div>
        <div class="ym-row" style="margin-top:4px">
          <span style="font-size:11px;min-width:65px">Регион:</span>
          <select id="ym-region" class="ym-input" style="width:170px">
            <option value="10723">🇷🇺 Вся Россия</option>
            <option value="213">Москва</option>
            <option value="2">Санкт-Петербург</option>
            <option value="54">Екатеринбург</option>
            <option value="43">Казань</option>
            <option value="65">Новосибирск</option>
          </select>
        </div>
      </div>
      <div class="ym-log" id="ym-capture-log"></div>
    </div>

    <!-- FIND TAB -->
    <div class="ym-pane" id="ym-pane-find" style="display:none">
      <div class="ym-section">
        <label>Живой поиск рубрик (suggest-geo)</label>
        <input type="text" id="ym-suggest-input" class="ym-input" placeholder="Начните вводить: Боулинг, Аптека, Школа...">
        <div class="ym-suggest-list" id="ym-suggest-list"></div>
        <div style="font-size:10px;color:#666;margin-top:4px">Кликните на рубрику чтобы добавить в очередь</div>
      </div>
      <hr style="border-color:#333;margin:10px 0">
      <div class="ym-section">
        <label>Массовый импорт (по одной на строку)</label>
        <textarea id="ym-bulk-input" class="ym-input" placeholder="Боулинг&#10;Аптека&#10;Ресторан"></textarea>
        <div class="ym-row" style="margin-top:6px">
          <button class="ym-btn ym-btn-primary" id="ym-btn-bulk-add">+ Добавить в очередь</button>
          <span style="font-size:10px;color:#888" id="ym-bulk-count"></span>
        </div>
      </div>
    </div>

    <!-- QUEUE TAB -->
    <div class="ym-pane" id="ym-pane-queue" style="display:none">
      <div class="ym-stats">
        <div class="ym-stat"><div class="ym-stat-num" id="ym-queue-total">0</div><div class="ym-stat-label">В очереди</div></div>
        <div class="ym-stat"><div class="ym-stat-num" id="ym-queue-resolved">0</div><div class="ym-stat-label">Найдено ID</div></div>
        <div class="ym-stat"><div class="ym-stat-num" id="ym-queue-failed">0</div><div class="ym-stat-label">Не найдено</div></div>
      </div>
      <div class="ym-progress"><div class="ym-progress-bar" id="ym-resolve-progress" style="width:0"></div></div>
      <div class="ym-row" style="margin-bottom:8px">
        <button class="ym-btn ym-btn-primary" id="ym-btn-resolve-all">▶ Резолвить все</button>
        <button class="ym-btn ym-btn-secondary" id="ym-btn-stop" disabled>■ Стоп</button>
        <button class="ym-btn ym-btn-sm ym-btn-danger" id="ym-btn-clear-queue">🗑 Очистить</button>
      </div>
      <div class="ym-queue-list" id="ym-queue-list"></div>
      <div class="ym-log" id="ym-resolve-log"></div>
    </div>

    <!-- SEARCH TAB -->
    <div class="ym-pane" id="ym-pane-search" style="display:none">
      <div class="ym-section">
        <label>Поиск мест по category_id</label>
        <div class="ym-row">
          <input type="text" id="ym-search-catid" class="ym-input" placeholder="category_id" style="flex:1">
          <input type="text" id="ym-search-name" class="ym-input" placeholder="Название" style="flex:1">
          <button class="ym-btn ym-btn-sm ym-btn-primary" id="ym-btn-search-one">🔍</button>
        </div>
      </div>
      <div class="ym-section">
        <label>Из найденных рубрик</label>
        <select id="ym-search-select" class="ym-input">
          <option value="">— сначала резолвите рубрики —</option>
        </select>
      </div>
      <div class="ym-row" style="margin:8px 0">
        <button class="ym-btn ym-btn-primary" id="ym-btn-search-all">▶ Обойти все</button>
        <button class="ym-btn ym-btn-secondary" id="ym-btn-stop-search" disabled>■ Стоп</button>
        <span style="font-size:10px;color:#888" id="ym-search-status"></span>
      </div>
      <div class="ym-progress"><div class="ym-progress-bar" id="ym-search-progress" style="width:0"></div></div>
      <div class="ym-log" id="ym-search-log"></div>
    </div>

    <!-- EXPORT TAB -->
    <div class="ym-pane" id="ym-pane-export" style="display:none">
      <div class="ym-stats">
        <div class="ym-stat"><div class="ym-stat-num" id="ym-export-rubrics">0</div><div class="ym-stat-label">Категорий</div></div>
        <div class="ym-stat"><div class="ym-stat-num" id="ym-export-places">0</div><div class="ym-stat-label">Мест</div></div>
        <div class="ym-stat"><div class="ym-stat-num" id="ym-export-size">0</div><div class="ym-stat-label">КБ данных</div></div>
      </div>
      <div class="ym-row" style="flex-wrap:wrap;gap:6px;margin:8px 0">
        <button class="ym-btn ym-btn-primary" id="ym-btn-export-rubrics">💾 Рубрики JSON</button>
        <button class="ym-btn ym-btn-primary" id="ym-btn-export-places">💾 Места JSON</button>
        <button class="ym-btn ym-btn-secondary" id="ym-btn-export-csv">📊 Места CSV</button>
      </div>
      <div class="ym-section" style="margin-top:8px">
        <label>Превью</label>
        <div class="ym-log" id="ym-export-preview" style="max-height:200px"></div>
      </div>
    </div>
  </div>
`;
  document.body.appendChild(panel);

  // ── Drag ───────────────────────────────────────────────────────────────
  const drag = document.getElementById('ym-drag-handle');
  let isDragging = false, dx, dy;
  drag.addEventListener('mousedown', e => { isDragging = true; dx = e.clientX - panel.offsetLeft; dy = e.clientY - panel.offsetTop; });
  document.addEventListener('mousemove', e => { if (!isDragging) return; panel.style.left = (e.clientX - dx) + 'px'; panel.style.top = (e.clientY - dy) + 'px'; panel.style.right = 'auto'; });
  document.addEventListener('mouseup', () => isDragging = false);

  // ── Tabs ───────────────────────────────────────────────────────────────
  document.querySelectorAll('.ym-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ym-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.ym-pane').forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      document.getElementById('ym-pane-' + tab.dataset.tab).style.display = '';
    });
  });
  document.getElementById('ym-close-btn').addEventListener('click', () => {
    // Restore originals
    XMLHttpRequest.prototype.open = _origOpen;
    XMLHttpRequest.prototype.send = _origSend;
    window.fetch = _origFetch;
    panel.remove();
  });

  // ── Helpers ────────────────────────────────────────────────────────────
  function log(containerId, msg, cls = '') {
    const el = document.getElementById(containerId);
    if (!el) return;
    const entry = document.createElement('div');
    entry.className = 'ym-log-entry ' + cls;
    entry.textContent = msg;
    el.appendChild(entry);
    el.scrollTop = el.scrollHeight;
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function download(filename, data, mime = 'application/json') {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function updateCaptureStatus(ok, msg) {
    const s = document.getElementById('ym-capture-status');
    const d = document.getElementById('ym-capture-dot');
    const box = document.getElementById('ym-capture-box');
    if (ok) {
      s.innerHTML = `<span class="ym-dot ym-dot-green"></span><span>✓ ${msg}</span>`;
      d.className = 'ym-dot ym-dot-green';
      box.classList.add('captured');
      box.querySelector('div:nth-child(1)').textContent = '✅';
      box.querySelector('div:nth-child(2)').textContent = 'Шаблон захвачен!';
      box.querySelector('div:nth-child(3)').innerHTML = `Можно искать места. Перейдите на вкладку <b>🔍 Найти</b>.`;
      log('ym-capture-log', `Захвачены параметры: ${Object.keys(STATE.capturedTemplate).join(', ')}`, 'ym-log-ok');
    } else {
      s.innerHTML = `<span class="ym-dot ym-dot-red"></span><span>${msg}</span>`;
      d.className = 'ym-dot ym-dot-red';
    }
  }

  // ── Search using captured template ──────────────────────────────────
  async function searchPlaces(rubricName, categoryId) {
    if (!STATE.capturedTemplate) {
      throw new Error('Сначала сделайте поиск через UI карт для захвата шаблона!');
    }
    // Clone the captured template and replace the text param
    const params = new URLSearchParams();
    const template = STATE.capturedTemplate;

    // Copy ALL params from the captured template
    for (const [key, value] of Object.entries(template)) {
      if (key === 'text') continue; // will set our own
      params.set(key, value);
    }

    // Set our search text with category_id
    const textParam = JSON.stringify({
      text: rubricName,
      what: [{ attr_name: 'category_id', attr_values: [categoryId] }]
    });
    params.set('text', textParam);

    // Override region if needed
    const gid = document.getElementById('ym-region').value;
    params.set('yandex_gid', gid);

    // Mark as our custom request so the interceptor doesn't re-capture it
    params.set('_ym_custom', '1');

    const url = `/maps/api/search?${params}`;

    return new Promise((resolve, reject) => {
      // Use the original XHR (not our patched one) to avoid re-interception issues
      const xhr = new XMLHttpRequest();
      _origOpen.call(xhr, 'GET', url, true);
      xhr.withCredentials = true;

      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (e) { reject(new Error('JSON parse error')); }
        } else {
          console.error('[YM] Search error:', xhr.status, xhr.responseText?.slice(0, 200));
          reject(new Error(`HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      _origSend.call(xhr);
    });
  }

  function extractPlaces(data) {
    return (data?.data?.items || []).filter(i => i.type === 'business').map(i => ({
      id: i.id, title: i.title, address: i.address,
      full_address: i.fullAddress, coordinates: i.coordinates, uri: i.uri,
      categories: (i.categories || []).map(c => ({ id: c.id, name: c.name, class: c.class, seoname: c.seoname })),
      rating: i.ratingData?.ratingValue, review_count: i.ratingData?.reviewCount,
      phones: (i.phones || []).map(p => p.number),
      urls: i.urls || [], working_time: i.workingTimeText,
    }));
  }

  // ── Suggest-Geo API ───────────────────────────────────────────────────
  let suggestDebounce = null;
  async function suggestGeo(query) {
    const params = new URLSearchParams({
      part: query, bases: 'geo,biz,transit',
      add_rubrics_loc: '1', add_chains_loc: '1',
      outformat: 'json', client_id: 'desktop-maps',
      lang: 'ru_RU', ll: '39.139071,54.307613',
      spn: '36.194411,52.412832', v: '9',
      fullpath: '1', origin: 'maps-search-form',
    });
    const resp = await _origFetch(`https://suggest-maps.yandex.ru/suggest-geo?${params}`, {
      credentials: 'include', headers: { 'Origin': 'https://yandex.ru' }
    });
    return await resp.json();
  }

  function parseRubricResult(r) {
    const lid = r.log_id || {};
    if (lid.type !== 'rubric') return null;
    return { name: r.text || '', category_id: lid.what?.id || '', tags: r.tags || [], org_count: r.subtitle?.text || '' };
  }

  // ── Live suggest ───────────────────────────────────────────────────────
  const suggestInput = document.getElementById('ym-suggest-input');
  const suggestList = document.getElementById('ym-suggest-list');

  suggestInput.addEventListener('input', () => {
    clearTimeout(suggestDebounce);
    const val = suggestInput.value.trim();
    if (val.length < 2) { suggestList.style.display = 'none'; return; }
    suggestDebounce = setTimeout(async () => {
      try {
        const data = await suggestGeo(val);
        suggestList.innerHTML = '';
        const rubrics = [];
        for (const r of (data.results || [])) { const p = parseRubricResult(r); if (p) rubrics.push(p); }
        if (!rubrics.length) {
          suggestList.innerHTML = '<div class="ym-suggest-item"><span class="ym-s-name" style="color:#888">Рубрики не найдены</span></div>';
        } else {
          rubrics.forEach(rb => {
            const item = document.createElement('div'); item.className = 'ym-suggest-item';
            item.innerHTML = `<span class="ym-s-name">${rb.name}</span><span class="ym-s-id">${rb.category_id}</span><span class="ym-s-count">${rb.org_count}</span>`;
            item.addEventListener('click', () => { addToQueue(rb.name, rb.category_id, rb.org_count, rb.tags, true); suggestList.style.display = 'none'; suggestInput.value = ''; });
            suggestList.appendChild(item);
          });
        }
        suggestList.style.display = 'block';
      } catch (e) { console.error('[YM] suggest error:', e); }
    }, 350);
  });
  suggestInput.addEventListener('blur', () => setTimeout(() => suggestList.style.display = 'none', 200));
  suggestInput.addEventListener('focus', () => { if (suggestList.children.length) suggestList.style.display = 'block'; });

  // ── Queue Management ──────────────────────────────────────────────────
  function addToQueue(name, catId = '', orgCount = '', tags = [], resolved = false) {
    if (STATE.rubricQueue.find(r => r.name === name)) return;
    const entry = { name, category_id: catId, org_count: orgCount, tags, resolved };
    STATE.rubricQueue.push(entry);
    if (resolved) STATE.resolvedRubrics.push(entry);
    renderQueue(); updateStats();
  }
  function removeFromQueue(name) {
    STATE.rubricQueue = STATE.rubricQueue.filter(r => r.name !== name);
    STATE.resolvedRubrics = STATE.resolvedRubrics.filter(r => r.name !== name);
    renderQueue(); updateStats();
  }
  function renderQueue() {
    const list = document.getElementById('ym-queue-list'); list.innerHTML = '';
    STATE.rubricQueue.forEach(r => {
      const el = document.createElement('div');
      el.className = 'ym-queue-item ' + (r.resolved ? 'resolved' : 'pending');
      el.innerHTML = `<span>${r.name}</span><span style="display:flex;align-items:center;gap:6px">${r.resolved ? `<span style="color:#00e676;font-size:10px;font-family:monospace">${r.category_id}</span><span style="color:#888;font-size:10px">${r.org_count}</span>` : '<span style="color:#ffc107;font-size:10px">ожидает</span>'}<button class="ym-q-remove" data-name="${r.name}">×</button></span>`;
      list.appendChild(el);
    });
    list.querySelectorAll('.ym-q-remove').forEach(btn => btn.addEventListener('click', () => removeFromQueue(btn.dataset.name)));
  }
  function updateStats() {
    document.getElementById('ym-queue-total').textContent = STATE.rubricQueue.length;
    document.getElementById('ym-queue-resolved').textContent = STATE.rubricQueue.filter(r => r.resolved).length;
    document.getElementById('ym-queue-failed').textContent = STATE.rubricQueue.filter(r => !r.resolved && r._tried).length;
    const sel = document.getElementById('ym-search-select');
    sel.innerHTML = '<option value="">— выбрать —</option>';
    STATE.resolvedRubrics.forEach(r => { const o = document.createElement('option'); o.value = r.category_id; o.textContent = `${r.name} (${r.category_id})`; o.dataset.name = r.name; sel.appendChild(o); });
    document.getElementById('ym-export-rubrics').textContent = STATE.resolvedRubrics.length;
    const tp = Object.values(STATE.allPlaces).reduce((s, v) => s + v.places.length, 0);
    document.getElementById('ym-export-places').textContent = tp;
    document.getElementById('ym-export-size').textContent = Math.round(JSON.stringify(STATE.allPlaces).length / 1024);
  }

  // ── Bulk import ───────────────────────────────────────────────────────
  document.getElementById('ym-btn-bulk-add').addEventListener('click', () => {
    const names = document.getElementById('ym-bulk-input').value.split('\n').map(s => s.trim()).filter(s => s);
    let added = 0;
    names.forEach(n => { if (!STATE.rubricQueue.find(r => r.name === n)) { addToQueue(n); added++; } });
    document.getElementById('ym-bulk-count').textContent = `+${added}`;
    document.getElementById('ym-bulk-input').value = '';
    document.querySelector('.ym-tab[data-tab="queue"]').click();
  });

  // ── Resolve ───────────────────────────────────────────────────────────
  document.getElementById('ym-btn-resolve-all').addEventListener('click', async () => {
    if (STATE.isRunning) return;
    STATE.isRunning = true;
    document.getElementById('ym-btn-resolve-all').disabled = true;
    document.getElementById('ym-btn-stop').disabled = false;
    STATE.delay = parseInt(document.getElementById('ym-delay').value) || 1200;
    document.getElementById('ym-resolve-log').innerHTML = '';
    const unresolved = STATE.rubricQueue.filter(r => !r.resolved);
    for (let i = 0; i < unresolved.length; i++) {
      if (!STATE.isRunning) { log('ym-resolve-log', '⏹ Остановлено', 'ym-log-warn'); break; }
      const r = unresolved[i];
      document.getElementById('ym-resolve-progress').style.width = ((i + 1) / unresolved.length * 100) + '%';
      try {
        const data = await suggestGeo(r.name);
        let found = false;
        for (const res of (data.results || [])) {
          const p = parseRubricResult(res);
          if (p) { Object.assign(r, p, { resolved: true }); if (!STATE.resolvedRubrics.find(x => x.name === r.name)) STATE.resolvedRubrics.push(r); log('ym-resolve-log', `[${i + 1}] ✓ ${r.name} → ${r.category_id} (${r.org_count})`, 'ym-log-ok'); found = true; break; }
        }
        if (!found) { r._tried = true; log('ym-resolve-log', `[${i + 1}] ✗ ${r.name} — не найдена`, 'ym-log-err'); }
      } catch (e) { r._tried = true; log('ym-resolve-log', `[${i + 1}] ✗ ${r.name}: ${e.message}`, 'ym-log-err'); }
      renderQueue(); updateStats(); await sleep(STATE.delay);
    }
    STATE.isRunning = false;
    document.getElementById('ym-btn-resolve-all').disabled = false;
    document.getElementById('ym-btn-stop').disabled = true;
    log('ym-resolve-log', `Готово! ${STATE.resolvedRubrics.length} рубрик.`, 'ym-log-info');
  });
  document.getElementById('ym-btn-stop').addEventListener('click', () => { STATE.isRunning = false; });
  document.getElementById('ym-btn-clear-queue').addEventListener('click', () => { STATE.rubricQueue = []; STATE.resolvedRubrics = []; renderQueue(); updateStats(); document.getElementById('ym-resolve-log').innerHTML = ''; });

  // ── Search Places ─────────────────────────────────────────────────────
  document.getElementById('ym-search-select').addEventListener('change', function () {
    if (this.value) { document.getElementById('ym-search-catid').value = this.value; document.getElementById('ym-search-name').value = this.selectedOptions[0]?.dataset?.name || ''; }
  });
  document.getElementById('ym-btn-search-one').addEventListener('click', async () => {
    const catId = document.getElementById('ym-search-catid').value.trim();
    const name = document.getElementById('ym-search-name').value.trim() || catId;
    if (!catId) return;
    log('ym-search-log', `Ищу: ${name} (${catId})...`, 'ym-log-info');
    try {
      const data = await searchPlaces(name, catId);
      const places = extractPlaces(data);
      const total = data?.data?.totalResultCount || 0;
      STATE.allPlaces[catId] = { rubric_name: name, category_id: catId, total_count: total, places };
      log('ym-search-log', `✓ ${name}: ${total} мест (${places.length})`, 'ym-log-ok');
      updateStats();
    } catch (e) { log('ym-search-log', `✗ ${e.message}`, 'ym-log-err'); }
  });
  document.getElementById('ym-btn-search-all').addEventListener('click', async () => {
    if (!STATE.resolvedRubrics.length) { log('ym-search-log', 'Нет рубрик!', 'ym-log-err'); return; }
    if (!STATE.capturedTemplate) { log('ym-search-log', 'Сначала захватите шаблон! (вкладка 🎯)', 'ym-log-err'); return; }
    STATE.isRunning = true;
    document.getElementById('ym-btn-stop-search').disabled = false;
    STATE.delay = parseInt(document.getElementById('ym-delay').value) || 1200;
    document.getElementById('ym-search-log').innerHTML = '';
    for (let i = 0; i < STATE.resolvedRubrics.length; i++) {
      if (!STATE.isRunning) { log('ym-search-log', '⏹ Остановлено', 'ym-log-warn'); break; }
      const r = STATE.resolvedRubrics[i];
      document.getElementById('ym-search-progress').style.width = ((i + 1) / STATE.resolvedRubrics.length * 100) + '%';
      document.getElementById('ym-search-status').textContent = `${i + 1}/${STATE.resolvedRubrics.length}`;
      try {
        const data = await searchPlaces(r.name, r.category_id);
        const places = extractPlaces(data);
        const total = data?.data?.totalResultCount || 0;
        STATE.allPlaces[r.category_id] = { rubric_name: r.name, category_id: r.category_id, total_count: total, places };
        log('ym-search-log', `[${i + 1}] ✓ ${r.name}: ${total} мест (${places.length})`, 'ym-log-ok');
      } catch (e) { log('ym-search-log', `[${i + 1}] ✗ ${r.name}: ${e.message}`, 'ym-log-err'); }
      updateStats(); await sleep(STATE.delay);
    }
    STATE.isRunning = false;
    document.getElementById('ym-btn-stop-search').disabled = true;
    log('ym-search-log', `Готово! ${Object.keys(STATE.allPlaces).length} категорий.`, 'ym-log-info');
  });
  document.getElementById('ym-btn-stop-search').addEventListener('click', () => { STATE.isRunning = false; });

  // ── Export ─────────────────────────────────────────────────────────────
  document.getElementById('ym-btn-export-rubrics').addEventListener('click', () => download('yandex_rubrics.json', JSON.stringify(STATE.resolvedRubrics, null, 2)));
  document.getElementById('ym-btn-export-places').addEventListener('click', () => download('yandex_places.json', JSON.stringify(STATE.allPlaces, null, 2)));
  document.getElementById('ym-btn-export-csv').addEventListener('click', () => {
    const rows = ['id,title,address,lat,lon,rating,reviews,category,phones,url'];
    Object.values(STATE.allPlaces).forEach(cat => cat.places.forEach(p => {
      rows.push(`"${p.id}","${(p.title || '').replace(/"/g, '""')}","${(p.address || '').replace(/"/g, '""')}",${p.coordinates?.[1] || ''},${p.coordinates?.[0] || ''},${p.rating || ''},${p.review_count || ''},"${(p.categories || []).map(c => c.name).join('; ')}","${(p.phones || []).join('; ')}","${(p.urls || [])[0] || ''}"`);
    }));
    download('yandex_places.csv', '\uFEFF' + rows.join('\n'), 'text/csv;charset=utf-8');
  });
  document.querySelector('.ym-tab[data-tab="export"]').addEventListener('click', () => {
    const prev = document.getElementById('ym-export-preview'); prev.innerHTML = '';
    const rc = STATE.resolvedRubrics.length, pc = Object.values(STATE.allPlaces).reduce((s, v) => s + v.places.length, 0);
    if (rc) { log('ym-export-preview', `Рубрик: ${rc}`, 'ym-log-info'); STATE.resolvedRubrics.slice(0, 5).forEach(r => log('ym-export-preview', `  ${r.name} → ${r.category_id}`, '')); }
    if (pc) { log('ym-export-preview', `Мест: ${pc}`, 'ym-log-info'); Object.values(STATE.allPlaces).slice(0, 5).forEach(c => log('ym-export-preview', `  ${c.rubric_name}: ${c.total_count}`, '')); }
    if (!rc && !pc) log('ym-export-preview', 'Нет данных', 'ym-log-warn');
    updateStats();
  });

  // ── Ready ──────────────────────────────────────────────────────────────
  console.log('%c[YM Scraper v3] Ready! Interceptor active.', 'color: #e94560; font-weight: bold; font-size: 14px');
  console.log('%cDo a search in the Yandex Maps search bar to capture request template.', 'color: #64b5f6');
  log('ym-capture-log', 'Скрипт загружен. Перехватчик активен.', 'ym-log-info');
  log('ym-capture-log', 'Сделайте любой поиск через строку поиска карт...', 'ym-log-warn');

})();
