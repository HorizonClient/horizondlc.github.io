/* ============================================
   HORIZON CLIENT — ClickGUI-style interactions
   (без регистрации/UID/админки)
   ============================================ */

(() => {
  'use strict';

  // ===== Время в titlebar =====
  const timeEl = document.getElementById('titlebarTime');
  const updateTime = () => {
    if (!timeEl) return;
    const d = new Date();
    timeEl.textContent = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };
  updateTime();
  setInterval(updateTime, 30000);

  // ===== HUD теперь — статичная картинка =====

  // ===== Счётчики в hero =====
  const counters = document.querySelectorAll('[data-count]');
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const dur = 1500;
      const start = performance.now();
      const animate = (now) => {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.floor(target * eased);
        if (t < 1) requestAnimationFrame(animate);
        else el.textContent = target;
      };
      requestAnimationFrame(animate);
      cio.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach((c) => cio.observe(c));

  // ===== Reveal =====
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('is-visible'), i * 60);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

  // ===== Переключение табов =====
  document.querySelectorAll('.titlebar-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.titlebar-tab').forEach((t) => t.classList.toggle('is-active', t === tab));
      document.querySelectorAll('.tab-panel').forEach((p) => {
        p.classList.toggle('is-active', p.dataset.panel === target);
      });
    });
  });

  // ===== Модули =====
  const MODULES = {
    Combat: [
      { name: 'Aura', key: 'R', enabled: false, settings: [
        { type: 'range', label: 'Радиус', min: 3, max: 6, step: 0.1, value: 3.5 },
        { type: 'range', label: 'CPS', min: 5, max: 20, step: 1, value: 12 },
        { type: 'toggle', label: 'Только игроки', value: true },
      ]},
      { name: 'TriggerBot', key: '', enabled: false, settings: [
        { type: 'range', label: 'Задержка (мс)', min: 0, max: 200, step: 10, value: 50 },
        { type: 'toggle', label: 'Только меч', value: false },
      ]},
      { name: 'AutoSwap', key: '', enabled: false },
      { name: 'ShiftTap', key: '', enabled: false, settings: [
        { type: 'range', label: 'Тайминг (мс)', min: 50, max: 300, step: 10, value: 150 },
      ]},
      { name: 'Projective Helper', key: '', enabled: true, settings: [
        { type: 'toggle', label: 'Показывать траекторию', value: true },
        { type: 'color', label: 'Цвет линии', value: '#ff5aac' },
      ]},
      { name: 'ElytraTarget', key: '', enabled: false, settings: [
        { type: 'range', label: 'Дистанция', min: 10, max: 100, step: 5, value: 30 },
        { type: 'toggle', label: 'Авто-выстрел', value: false },
      ]},
    ],
    Render: [
      { name: 'FireWorkEsp', enabled: false, settings: [{ type: 'toggle', label: 'Active', value: false }] },
      { name: 'Aspect Ratio', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'range', label: 'Соотношение', min: 0.5, max: 2.5, step: 0.05, value: 1.0 },
      ]},
      { name: 'Free Look', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'keybind', label: 'Свободный обзор', value: 'NUM' },
      ]},
      { name: 'Hud', enabled: true, settings: [
        { type: 'toggle', label: 'Показывать FPS', value: true },
        { type: 'toggle', label: 'Показывать BPS', value: true },
        { type: 'toggle', label: 'Показывать координаты', value: false },
        { type: 'color', label: 'Цвет текста', value: '#7c8cff' },
      ]},
      { name: 'Jump Circle', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'range', label: 'Max Size', min: 0.5, max: 3.0, step: 0.1, value: 2.0 },
        { type: 'range', label: 'Speed', min: 100, max: 2000, step: 50, value: 1000 },
        { type: 'color', label: 'Цвет', value: '#7c8cff' },
      ]},
      { name: 'ChinaHat', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'color', label: 'Color', value: '#ff5aac' },
        { type: 'range', label: 'Transparency', min: 0.0, max: 1.0, step: 0.05, value: 0.5 },
      ]},
      { name: 'Target Esp', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'select', label: 'Отображения таргета', value: 'Ghosts', options: ['Ghosts', '2D', 'Box', 'Circle', 'None'] },
        { type: 'color', label: 'Цвет', value: '#17d673' },
      ]},
    ],
    Player: [
      { name: 'Anti AFK', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'select', label: 'Режим', value: 'нет настроек', options: ['нет настроек', 'Таймер', 'Прыжки'] },
        { type: 'range', label: 'Выполнять каждые (сек)', min: 5, max: 60, step: 1, value: 10.0 },
      ]},
      { name: 'LockSlot', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'select', label: 'Заблокированные слоты', value: 'нет настроек', options: ['нет настроек', 'Слот 1', 'Слот 2', 'Слот 3', 'Слот 9'] },
      ]},
      { name: 'No Entity Trace', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'toggle', label: 'Без меча', value: false },
      ]},
      { name: 'No Push', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'select', label: 'Игнорировать', value: 'Block', options: ['Block', 'Players', 'All', 'None'] },
      ]},
      { name: 'RightHelper', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'toggle', label: 'AutoAddFriends', value: false },
        { type: 'range', label: 'RandomName', min: 0, max: 16, step: 1, value: 8.0 },
        { type: 'toggle', label: 'UseWoodAxe', value: false },
        { type: 'toggle', label: 'RenderSelection', value: false },
        { type: 'range', label: 'AntiSpamDelay', min: 0, max: 2000, step: 50, value: 500 },
      ]},
      { name: 'Item Scroller', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'range', label: 'Задержка прокрутки (мс)', min: 0, max: 100, step: 1, value: 26.0 },
      ]},
      { name: 'No Delay', enabled: false, settings: [{ type: 'toggle', label: 'Active', value: false }] },
    ],
    Movement: [
      { name: 'Auto Pilot', enabled: false, settings: [{ type: 'toggle', label: 'Active', value: false }] },
      { name: 'Click Pearl', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'select', label: 'Режим', value: 'Default', options: ['Default', 'Smart', 'Always'] },
        { type: 'keybind', label: 'Кнопка', value: 'MOUSE 4' },
      ]},
      { name: 'Tab Parser', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'select', label: 'Версия', value: '1.16.5', options: ['1.16.5', '1.18.2', '1.19.4', '1.20.1', '1.21.1'] },
        { type: 'select', label: 'Донат префиксы', value: 'нет настроек', options: ['нет настроек', 'Default', 'HolyWorld', 'ReallyWorld'] },
      ]},
      { name: 'IRC', enabled: false, settings: [{ type: 'toggle', label: 'Active', value: false }] },
      { name: 'AutoMessage', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'range', label: 'Интервал (сек)', min: 30, max: 600, step: 10, value: 120 },
      ]},
      { name: 'ChatUtil', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'toggle', label: 'Эмодзи', value: false },
        { type: 'keybind', label: 'Клавиша корд-дропера', value: 'BACKSLASH' },
      ]},
      { name: 'Click Friend', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'keybind', label: 'Добавить друга', value: 'MOUSE MIDDLE' },
      ]},
      { name: 'Wind Jump', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'keybind', label: 'Заряд ветра', value: 'N/A' },
      ]},
      { name: 'Server Assist', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'select', label: 'Тип сервера', value: 'ReallyWorld', options: ['ReallyWorld', 'HolyWorld', 'MineRex', 'Custom'] },
      ]},
    ],
    Misc: [
      { name: 'TpLoot', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'select', label: 'Режим работы', value: 'Fly', options: ['Fly', 'Walk', 'Teleport'] },
        { type: 'range', label: 'Скорость полёта', min: 0.5, max: 3.0, step: 0.1, value: 1.2 },
      ]},
      { name: 'Target Strafe', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'select', label: 'Режим', value: 'Matrix', options: ['Matrix', 'Circle', 'Around'] },
        { type: 'select', label: 'Точка для обхода', value: 'Circle', options: ['Circle', 'Square', 'Behind'] },
        { type: 'range', label: 'Радиус', min: 1.0, max: 5.0, step: 0.1, value: 2.6 },
        { type: 'range', label: 'Скорость', min: 0.1, max: 1.5, step: 0.05, value: 0.3 },
        { type: 'select', label: 'Настройки', value: 'Auto Jump', options: ['Auto Jump', 'Manual', 'Disabled'] },
      ]},
      { name: 'No Fall Damage', enabled: false, settings: [{ type: 'toggle', label: 'Active', value: false }] },
      { name: 'VClip', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'select', label: 'Обход', value: 'Default', options: ['Default', 'Smart', 'Silent'] },
        { type: 'range', label: 'Дистанция', min: 1, max: 10, step: 0.5, value: 3.0 },
      ]},
      { name: 'GrimGlade', enabled: false, settings: [{ type: 'toggle', label: 'Active', value: false }] },
      { name: 'Strafe', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'select', label: 'Режим', value: 'Matrix', options: ['Matrix', 'Legit', 'BHop'] },
        { type: 'range', label: 'Скорость', min: 0.1, max: 1.0, step: 0.02, value: 0.42 },
      ]},
      { name: 'Air Stuck', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'toggle', label: 'Свапать элитру на нагрудник', value: false },
      ]},
      { name: 'Elytra Motion', enabled: false, settings: [
        { type: 'toggle', label: 'Active', value: false },
        { type: 'range', label: 'Скорость', min: 0.5, max: 3.0, step: 0.1, value: 1.5 },
        { type: 'range', label: 'Высота', min: 50, max: 320, step: 10, value: 200 },
      ]},
    ],
  };

  const CATEGORY_ICONS = {
    Combat: '⚔️', Render: '👁️', Player: '👤', Movement: '🏃', Misc: '🔧',
  };

  const STORAGE_KEY_MODS = 'horizon_modules';
  let moduleStates = {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MODS);
    if (saved) moduleStates = JSON.parse(saved);
  } catch (_) {}

  const DEFAULT_ENABLED = ['Projective Helper', 'Hud'];
  DEFAULT_ENABLED.forEach((n) => {
    if (moduleStates[n] === undefined) moduleStates[n] = true;
  });

  const saveModules = () => {
    try { localStorage.setItem(STORAGE_KEY_MODS, JSON.stringify(moduleStates)); } catch (_) {}
  };

  const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  // ===== Рендер категорий =====
  const cgCategories = document.getElementById('cgCategories');
  const renderCategories = (active) => {
    if (!cgCategories) return;
    cgCategories.innerHTML = Object.keys(MODULES).map((cat) => {
      const enabled = MODULES[cat].filter((m) => moduleStates[m.name]).length;
      const total = MODULES[cat].length;
      return `
        <button type="button" class="cg-category ${cat === active ? 'is-active' : ''}" data-cat="${cat}">
          <span class="cg-cat-icon">${CATEGORY_ICONS[cat] || '◆'}</span>
          <span class="cg-cat-name">${cat}</span>
          <span class="cg-cat-badge">${enabled}/${total}</span>
        </button>
      `;
    }).join('');
    cgCategories.querySelectorAll('.cg-category').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentCat = btn.dataset.cat;
        renderCategories(currentCat);
        renderModules(currentCat);
      });
    });
  };

  // ===== Рендер модулей =====
  const cgModules = document.getElementById('cgModules');
  const cgCatName = document.getElementById('cgCatName');
  const cgCatCount = document.getElementById('cgCatCount');
  const toast = document.getElementById('successToast');
  let toastTimer = null;
  function showToast(msg, ms = 2500) {
    if (!toast) return;
    const text = toast.querySelector('.toast-text');
    if (text) text.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), ms);
  }

  const renderSetting = (s, modName, idx) => {
    if (s.type === 'toggle') {
      return `
        <div class="cg-setting">
          <span class="cg-setting-label">${s.label}</span>
          <div class="cg-toggle cg-setting-toggle ${s.value ? 'is-on' : ''}" data-setting="${modName}-${idx}" data-kind="toggle"></div>
        </div>
      `;
    }
    if (s.type === 'range') {
      const display = s.step < 1 ? s.value.toFixed(2) : s.value;
      return `
        <div class="cg-setting">
          <span class="cg-setting-label">${s.label}</span>
          <div class="cg-setting-range">
            <input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.value}" data-setting="${modName}-${idx}" data-kind="range" />
            <span class="cg-setting-value" data-value="${modName}-${idx}">${display}</span>
          </div>
        </div>
      `;
    }
    if (s.type === 'color') {
      return `
        <div class="cg-setting">
          <span class="cg-setting-label">${s.label}</span>
          <input type="color" value="${s.value}" data-setting="${modName}-${idx}" data-kind="color" class="cg-setting-color" />
        </div>
      `;
    }
    if (s.type === 'select') {
      return `
        <div class="cg-setting">
          <span class="cg-setting-label">${s.label}</span>
          <select class="cg-setting-select" data-setting="${modName}-${idx}" data-kind="select">
            ${s.options.map((o) => `<option value="${o}" ${o === s.value ? 'selected' : ''}>${o}</option>`).join('')}
          </select>
        </div>
      `;
    }
    if (s.type === 'keybind') {
      return `
        <div class="cg-setting">
          <span class="cg-setting-label">${s.label}</span>
          <button type="button" class="cg-keybind" data-setting="${modName}-${idx}" data-kind="keybind">${s.value}</button>
        </div>
      `;
    }
    return '';
  };

  let currentCat = 'Combat';
  const renderModules = (cat) => {
    if (!cgModules) return;
    const list = MODULES[cat] || [];
    if (cgCatName) cgCatName.textContent = cat;
    if (cgCatCount) cgCatCount.textContent = `${list.length} модулей`;

    const search = (document.getElementById('moduleSearch')?.value || '').toLowerCase();
    const filtered = list.filter((m) => m.name.toLowerCase().includes(search));

    if (!filtered.length) {
      cgModules.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Ничего не найдено</div>';
      return;
    }

    cgModules.innerHTML = filtered.map((m) => {
      const enabled = !!moduleStates[m.name];
      const hasSettings = Array.isArray(m.settings) && m.settings.length > 0;
      return `
        <div class="cg-module ${enabled ? 'is-enabled' : ''}" data-mod="${m.name}">
          <div class="cg-module-row">
            <div class="cg-toggle" data-toggle="${m.name}" aria-label="Включить модуль"></div>
            <div class="cg-mod-info">
              <div class="cg-mod-name">${m.name}</div>
            </div>
            <div class="cg-mod-actions">
              ${m.key ? `<span class="cg-mod-key">${m.key}</span>` : ''}
              ${hasSettings ? `<button type="button" class="cg-mod-settings" aria-label="Настройки" data-settings="${m.name}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
            </div>
          </div>
          ${hasSettings ? `
            <div class="cg-module-settings" data-settings-panel="${m.name}" hidden>
              ${m.settings.map((s, i) => renderSetting(s, m.name, i)).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    cgModules.querySelectorAll('[data-toggle]').forEach((toggle) => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = toggle.dataset.toggle;
        moduleStates[name] = !moduleStates[name];
        saveModules();
        renderModules(cat);
        renderCategories(cat);
        updateDashPreview();
        showToast(moduleStates[name] ? `${name} включён` : `${name} выключен`, 1200);
      });
    });

    cgModules.querySelectorAll('[data-settings]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = btn.dataset.settings;
        const panel = cgModules.querySelector(`[data-settings-panel="${name}"]`);
        if (!panel) return;
        panel.hidden = !panel.hidden;
        btn.classList.toggle('is-active', !panel.hidden);
      });
    });

    cgModules.querySelectorAll('.cg-module-settings').forEach((p) => {
      p.addEventListener('click', (e) => e.stopPropagation());
    });

    document.querySelectorAll('[data-setting]').forEach((el) => {
      const [modName, idxStr] = el.dataset.setting.split('-');
      const idx = parseInt(idxStr, 10);
      const mod = (MODULES[currentCat] || []).find((m) => m.name === modName);
      if (!mod || !mod.settings || !mod.settings[idx]) return;
      const s = mod.settings[idx];
      const kind = el.dataset.kind;
      if (kind === 'toggle') {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          s.value = !s.value;
          el.classList.toggle('is-on', s.value);
          saveModules();
        });
      } else if (kind === 'range') {
        el.addEventListener('input', () => {
          s.value = parseFloat(el.value);
          const valueEl = document.querySelector(`[data-value="${modName}-${idx}"]`);
          if (valueEl) valueEl.textContent = s.step < 1 ? s.value.toFixed(2) : s.value;
          saveModules();
        });
      } else if (kind === 'color') {
        el.addEventListener('input', () => { s.value = el.value; saveModules(); });
      } else if (kind === 'select') {
        el.addEventListener('change', () => { s.value = el.value; saveModules(); });
      } else if (kind === 'keybind') {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const orig = el.textContent;
          el.textContent = '...';
          const handler = (ev) => {
            ev.preventDefault();
            s.value = ev.key === ' ' ? 'SPACE' : ev.key.toUpperCase();
            el.textContent = s.value;
            saveModules();
            document.removeEventListener('keydown', handler);
          };
          document.addEventListener('keydown', handler);
        });
      }
    });
  };

  renderCategories(currentCat);
  renderModules(currentCat);

  document.getElementById('cgEnableAll')?.addEventListener('click', () => {
    (MODULES[currentCat] || []).forEach((m) => moduleStates[m.name] = true);
    saveModules();
    renderModules(currentCat);
    renderCategories(currentCat);
    updateDashPreview();
  });
  document.getElementById('cgDisableAll')?.addEventListener('click', () => {
    (MODULES[currentCat] || []).forEach((m) => moduleStates[m.name] = false);
    saveModules();
    renderModules(currentCat);
    renderCategories(currentCat);
    updateDashPreview();
  });
  document.getElementById('moduleSearch')?.addEventListener('input', () => renderModules(currentCat));

  // ===== Превью на дашборде =====
  const dashModulesPreview = document.getElementById('dashModulesPreview');
  const dashModulesCount = document.getElementById('dashModules');
  const cgTotalEnabled = document.getElementById('cgTotalEnabled');
  const cgTotalAll = document.getElementById('cgTotalAll');
  const updateDashPreview = () => {
    const enabled = [];
    Object.keys(MODULES).forEach((cat) => {
      MODULES[cat].forEach((m) => { if (moduleStates[m.name]) enabled.push(m.name); });
    });
    if (dashModulesCount) dashModulesCount.textContent = enabled.length;
    if (cgTotalEnabled) cgTotalEnabled.textContent = enabled.length;
    const totalAll = Object.values(MODULES).reduce((s, a) => s + a.length, 0);
    if (cgTotalAll) cgTotalAll.textContent = totalAll;
    if (dashModulesPreview) {
      if (!enabled.length) {
        dashModulesPreview.innerHTML = '<span style="color:var(--muted)">Модули не включены. Перейди во вкладку «Модули» →</span>';
      } else {
        dashModulesPreview.innerHTML = enabled.map((n) =>
          `<span style="display:inline-block;margin:2px 4px;padding:3px 8px;background:var(--bg-3);border:1px solid var(--border-2);border-radius:4px;color:var(--accent)">${n}</span>`
        ).join('');
      }
    }
  };
  updateDashPreview();

  // ===== Players list (демо, без регистрации) =====
  const DEMO_PLAYERS = [
    { uid: '001', nickname: 'Ceticet11' },
    { uid: '002', nickname: 'ShadowFox' },
    { uid: '003', nickname: 'CrystalMage' },
    { uid: '004', nickname: 'xXDragonXx' },
    { uid: '005', nickname: 'NovaStrike' },
    { uid: '006', nickname: 'Paster' },
    { uid: '007', nickname: 'Kvasok' },
    { uid: '008', nickname: 'SkyWord' },
  ];

  const renderPlayers = () => {
    const grid = document.getElementById('playersGrid');
    if (!grid) return;
    const countEl = document.getElementById('playersCount');
    const newEl = document.getElementById('playersNew');
    const latestEl = document.getElementById('playersLatest');
    if (countEl) countEl.textContent = DEMO_PLAYERS.length;
    if (newEl) newEl.textContent = 3;
    if (latestEl) latestEl.textContent = DEMO_PLAYERS[DEMO_PLAYERS.length - 1].nickname;
    grid.innerHTML = DEMO_PLAYERS.map((u) => `
      <div class="player-card">
        <div class="player-avatar">${escapeHtml(u.nickname.charAt(0).toUpperCase())}</div>
        <div class="player-info">
          <div class="player-nick">${escapeHtml(u.nickname)}</div>
          <span class="player-uid">#${escapeHtml(u.uid)}</span>
        </div>
      </div>
    `).join('');
  };
  renderPlayers();

  // ===== Download =====
  const DOWNLOAD_FILE = 'Horizon.jar';

  const startDownload = () => {
    const a = document.createElement('a');
    a.href = DOWNLOAD_FILE;
    a.download = 'Horizon.jar';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Скачивание Horizon.jar...');
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-download]')) startDownload();
  });

  const downloadCta = document.getElementById('downloadCta');
  if (downloadCta) {
    downloadCta.innerHTML = `
      <button type="button" class="btn-client btn-client-primary" data-download>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>Скачать клиент</span>
      </button>
    `;
  }

})();
