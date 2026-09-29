/* ============================================
   NOVA//STUDIO — interactions
   ============================================ */

(() => {
  'use strict';

  // ===== Хранилище =====
  const USERS_KEY = 'horizon_users';
  const BANNED_KEY = 'horizon_banned';
  const ADMIN_SESSION = 'horizon_admin_session';
  const THEME_KEY = 'horizon_theme';
  const ADMIN_PASSWORD = 'fssgsdfgds';

  // Чистим хвосты старой авторизации и UID, если они остались в браузере
  ['horizon_login_users', 'horizon_uid_counter', 'horizon_current_user', 'horizon_user'].forEach((key) => {
    try { localStorage.removeItem(key); } catch (_) {}
  });

  const getUsers = () => {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch (_) { return []; }
  };
  const setUsers = (list) => {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(list)); } catch (_) {}
  };
  const getBanned = () => {
    try { return JSON.parse(localStorage.getItem(BANNED_KEY) || '[]'); } catch (_) { return []; }
  };
  const setBanned = (list) => {
    try { localStorage.setItem(BANNED_KEY, JSON.stringify(list)); } catch (_) {}
  };
  const isBannedEmail = (email) => {
    if (!email) return false;
    return getBanned().some((e) => (e || '').toLowerCase() === email.toLowerCase());
  };

  const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));


  const formatDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (_) { return '—'; }
  };

  // ===== Файл для кнопки «Скачать клиент» (IndexedDB — основное хранилище, большие файлы) =====
  const FILE_DB = 'horizon-files';
  const FILE_STORE = 'downloads';
  const CLIENT_FILE_KEY = 'client';
  const LS_FILE_KEY = 'horizon_client_file';
  // localStorage — только аварийный запасной путь; физический потолок ~5 МБ на весь origin
  const LS_MAX = 4 * 1024 * 1024;

  // Сколько браузер готов отдать под хранение (обычно ГБ, а не МБ)
  const storageHeadroom = async () => {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        const quota = est.quota || 0;
        const used = est.usage || 0;
        if (quota > 0) return { quota, used, free: Math.max(0, quota - used) };
      }
    } catch (_) { /* нет API — вернём null */ }
    return null;
  };

  const humanSize = (bytes) => {
    const n = Number(bytes) || 0;
    if (n >= 1024 ** 3) return (n / 1024 ** 3).toFixed(1) + ' ГБ';
    if (n >= 1024 ** 2) return (n / 1024 ** 2).toFixed(1) + ' МБ';
    if (n >= 1024) return (n / 1024).toFixed(1) + ' КБ';
    return n + ' Б';
  };

  const openFileDB = () => new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB недоступен в этом браузере')); return; }
    const req = indexedDB.open(FILE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILE_STORE)) db.createObjectStore(FILE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Не удалось открыть хранилище файлов'));
    req.onblocked = () => reject(new Error('Хранилище файлов заблокировано другой вкладкой'));
  });

  const fileDBRun = (mode, key, value) => new Promise((resolve, reject) => {
    openFileDB().then((db) => {
      const tx = db.transaction(FILE_STORE, mode);
      const store = tx.objectStore(FILE_STORE);
      const req = mode === 'readwrite'
        ? (value === undefined ? store.delete(key) : store.put(value, key))
        : store.get(key);
      let out = null;
      req.onsuccess = () => { out = req.result; };
      tx.oncomplete = () => { db.close(); resolve(out); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('Ошибка хранилища файлов')); };
      tx.onabort = () => { db.close(); reject(tx.error || new Error('Операция отменена — не хватило места')); };
    }).catch(reject);
  });

  const fileDBPut = (key, value) => fileDBRun('readwrite', key, value);
  const fileDBGet = (key) => fileDBRun('readonly', key);
  const fileDBDel = (key) => fileDBRun('readwrite', key, undefined);

  const blobToDataURL = (blob) => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error || new Error('Не удалось прочитать файл'));
    fr.readAsDataURL(blob);
  });

  const dataURLToBlob = (dataUrl) => {
    const comma = dataUrl.indexOf(',');
    const meta = dataUrl.slice(0, comma);
    const mime = (meta.match(/^data:([^;]+)/) || [])[1] || 'application/octet-stream';
    const bin = atob(dataUrl.slice(comma + 1));
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const isQuotaError = (err) => {
    if (!err) return false;
    if (err.name === 'QuotaExceededError') return true;
    return /quota|not enough|store|abort/i.test(err.message || '');
  };

  const saveClientFile = async (record) => {
    // Заранее проверяем, влезет ли файл в отведённое место
    const head = await storageHeadroom();
    if (head && record.size > head.free) {
      throw new Error(
        `Файл ${humanSize(record.size)} не помещается: свободно ${humanSize(head.free)} из ${humanSize(head.quota)}.`
      );
    }

    // Старый файл удаляем, чтобы не держать два файла одновременно
    try { await fileDBDel(CLIENT_FILE_KEY); } catch (_) { /* нечего удалять */ }

    try {
      await fileDBPut(CLIENT_FILE_KEY, record);
      return;
    } catch (idbErr) {
      // Аварийный путь: localStorage + base64, физический потолок ~5 МБ
      if (record.size > LS_MAX) {
        if (isQuotaError(idbErr)) {
          throw new Error('В браузере закончилось место под файл. Удалите старый файл или освободите место.');
        }
        throw new Error((idbErr && idbErr.message) || 'Не удалось сохранить файл');
      }
      const dataUrl = await blobToDataURL(record.data);
      const meta = { name: record.name, type: record.type, size: record.size, uploadedAt: record.uploadedAt };
      localStorage.setItem(LS_FILE_KEY, JSON.stringify({ ...meta, dataUrl }));
    }
  };

  const loadClientFile = async () => {
    try {
      const rec = await fileDBGet(CLIENT_FILE_KEY);
      if (rec && rec.data) return rec;
    } catch (_) { /* ищем в localStorage */ }
    try {
      const raw = localStorage.getItem(LS_FILE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.dataUrl) return null;
      return { name: obj.name, type: obj.type, size: obj.size, uploadedAt: obj.uploadedAt, data: dataURLToBlob(obj.dataUrl) };
    } catch (_) { return null; }
  };

  const deleteClientFile = async () => {
    try { await fileDBDel(CLIENT_FILE_KEY); } catch (_) { /* пусто или недоступно */ }
    try { localStorage.removeItem(LS_FILE_KEY); } catch (_) {}
  };

  // ===== Кастомный курсор =====
  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursorFollower');
  let cx = 0, cy = 0, fx = 0, fy = 0;

  if (cursor && follower && matchMedia('(hover: hover)').matches) {
    document.addEventListener('mousemove', (e) => {
      cx = e.clientX; cy = e.clientY;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    });

    const tick = () => {
      fx += (cx - fx) * 0.15;
      fy += (cy - fy) * 0.15;
      follower.style.transform = `translate(${fx}px, ${fy}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    };
    tick();

    document.querySelectorAll('a, button, [data-magnetic]').forEach((el) => {
      el.addEventListener('mouseenter', () => follower.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => follower.classList.remove('is-hover'));
    });
  }

  // ===== Magnetic-кнопки =====
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = 0.35;
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });

  // ===== Nav при скролле =====
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  // ===== Мобильное меню =====
  const menuBtn = document.getElementById('menuBtn');
  const navLinks = document.querySelector('.nav-links');
  if (menuBtn && navLinks) {
    const closeMenu = () => {
      navLinks.classList.remove('is-open');
      menuBtn.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    };
    menuBtn.addEventListener('click', () => {
      const open = navLinks.classList.toggle('is-open');
      menuBtn.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target)) closeMenu();
    });
  }

  // ===== Переключатель темы =====
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');

  const getTheme = () => (root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  const setTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
    if (themeToggle) {
      themeToggle.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'
      );
    }
  };

  setTheme(getTheme());
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });
  }

  // ===== Reveal-анимации =====
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('is-visible'), i * 80);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

  // ===== Параллакс для орбов =====
  const orbs = document.querySelectorAll('.orb');
  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    orbs.forEach((orb, i) => {
      const k = (i + 1) * 12;
      orb.style.translate = `${x * k}px ${y * k}px`;
    });
  });

  // ===== Счётчики =====
  const counters = document.querySelectorAll('[data-count]');
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      // data-count может содержать суффикс: "50+" или "2-3"
      const [, num, suffix] = el.dataset.count.match(/^(\d+)(.*)$/) || [];
      if (num === undefined) { cio.unobserve(el); return; }
      const target = parseInt(num, 10);
      const dur = 1600;
      const start = performance.now();
      const animate = (now) => {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.floor(target * eased) + suffix;
        if (t < 1) requestAnimationFrame(animate);
        else el.textContent = target + suffix;
      };
      requestAnimationFrame(animate);
      cio.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach((c) => cio.observe(c));

  // ===== 3D-наклон для process-карточек =====
  document.querySelectorAll('.process-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `translateY(-6px) perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // ===== Плавный скролл по якорям =====
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.length > 1) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // ===== Тост =====
  const toast = document.getElementById('successToast');
  const showToast = (text, ms = 2600) => {
    if (!toast) return;
    toast.querySelector('.toast-text').textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), ms);
  };

  // ===== Скачивание =====
  let clientFile = null; // { name, type, size, uploadedAt, data: Blob }

  const downloadCta = document.getElementById('downloadCta');
  if (downloadCta) {
    downloadCta.innerHTML = `
      <button type="button" class="btn-download" id="downloadBtn">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Скачать клиент</span>
        <span class="dl-suffix">Скоро</span>
      </button>
      <div class="download-hint">Клиент появится в этом месте. Подпишись на Telegram, чтобы не пропустить релиз.</div>
    `;
    const btn = document.getElementById('downloadBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (clientFile && clientFile.data) {
          const url = URL.createObjectURL(clientFile.data);
          const a = document.createElement('a');
          a.href = url;
          a.download = clientFile.name || 'HorizonClient';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          showToast('Скачивание запущено: ' + (clientFile.name || 'файл'), 3000);
          return;
        }
        showToast('Релиз скоро. Подпишись на Telegram, чтобы узнать первым.', 3000);
      });
    }
  }

  // Обновляет вид кнопки и подсказки в зависимости от наличия файла
  const refreshDownloadUI = () => {
    const suffix = downloadCta && downloadCta.querySelector('.dl-suffix');
    const hint = downloadCta && downloadCta.querySelector('.download-hint');
    if (suffix) suffix.hidden = !!clientFile;
    if (hint) {
      hint.textContent = clientFile
        ? `${clientFile.name} · ${humanSize(clientFile.size)} · готов к скачиванию`
        : 'Клиент появится в этом месте. Подпишись на Telegram, чтобы не пропустить релиз.';
    }
  };

  // Обновляет карточку файла в админ-панели
  const dlFileInput = document.getElementById('dlFileInput');
  const dlFileEmpty = document.getElementById('dlFileEmpty');
  const dlFileRow = document.getElementById('dlFileRow');
  const dlFileName = document.getElementById('dlFileName');
  const dlFileSize = document.getElementById('dlFileSize');
  const dlFileDate = document.getElementById('dlFileDate');
  const dlRemoveFile = document.getElementById('dlRemoveFile');

  const dlFileLimit = document.getElementById('dlFileLimit');

  const refreshFileCard = () => {
    if (dlFileEmpty) dlFileEmpty.hidden = !!clientFile;
    if (dlFileRow) dlFileRow.hidden = !clientFile;
    if (dlRemoveFile) dlRemoveFile.hidden = !clientFile;
    if (clientFile) {
      if (dlFileName) dlFileName.textContent = clientFile.name;
      if (dlFileSize) dlFileSize.textContent = humanSize(clientFile.size);
      if (dlFileDate) dlFileDate.textContent = formatDate(new Date(clientFile.uploadedAt).toISOString());
    }
    refreshDownloadUI();

    // Показываем реальный запас места под файл
    if (dlFileLimit) {
      storageHeadroom().then((head) => {
        if (!head) {
          dlFileLimit.textContent = 'Браузер не сообщает доступное место — ограничений нет.';
        } else {
          dlFileLimit.textContent = `Файл хранится в этом браузере. Доступно: ${humanSize(head.free)} из ${humanSize(head.quota)}.`;
        }
      }).catch(() => {
        dlFileLimit.textContent = 'Файл хранится в этом браузере.';
      });
    }
  };

  // ===== Публичный список игроков =====
  const playersGrid = document.getElementById('playersGrid');
  const playersCountEl = document.getElementById('playersCount');
  const playersNewEl = document.getElementById('playersNew');
  const playersLatestEl = document.getElementById('playersLatest');

  const renderPlayers = () => {
    if (!playersGrid) return;
    // Забаненных не показываем публично
    const visible = getUsers().filter((u) => u && u.nickname && !isBannedEmail(u.email));
    visible.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    const todayKey = new Date().toDateString();
    const newToday = visible.filter((u) => u.createdAt && new Date(u.createdAt).toDateString() === todayKey).length;
    if (playersCountEl) playersCountEl.textContent = visible.length;
    if (playersNewEl) playersNewEl.textContent = newToday;
    if (playersLatestEl) playersLatestEl.textContent = visible.length ? visible[visible.length - 1].nickname : '—';

    if (!visible.length) {
      playersGrid.innerHTML = '<div class="player-empty">Список игроков пока пуст.</div>';
      return;
    }

    playersGrid.innerHTML = visible.map((u) => {
      const initial = (u.nickname || '?').charAt(0).toUpperCase();
      return `
        <div class="player-card">
          <div class="player-avatar">${escapeHtml(initial)}</div>
          <div class="player-info">
            <div class="player-nick">${escapeHtml(u.nickname)}</div>
            <div class="player-since">с ${formatDate(u.createdAt)}</div>
          </div>
        </div>
      `;
    }).join('');
  };

  // ===== Админ-панель =====
  const adminModal = document.getElementById('adminModal');
  const navAdmin = document.getElementById('navAdmin');
  const adminSection = document.getElementById('admin');
  const closeAdmin = document.getElementById('closeAdmin');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const adminTbody = document.getElementById('adminTbody');
  const adminTotal = document.getElementById('adminTotal');
  const adminToday = document.getElementById('adminToday');
  const adminBanned = document.getElementById('adminBanned');
  const adminClear = document.getElementById('adminClear');
  const adminLock = document.getElementById('adminLock');
  const adminExport = document.getElementById('adminExport');
  const adminImport = document.getElementById('adminImport');
  const adminImportFile = document.getElementById('adminImportFile');

  const isAdminAuth = () => {
    try { return localStorage.getItem(ADMIN_SESSION) === '1'; } catch (_) { return false; }
  };
  const setAdminAuth = (v) => {
    try { v ? localStorage.setItem(ADMIN_SESSION, '1') : localStorage.removeItem(ADMIN_SESSION); } catch (_) {}
  };

  const refreshAdminUI = () => {
    const authed = isAdminAuth();
    // Ссылка в навигации всегда видна — это вход в админку через пароль
    if (navAdmin) navAdmin.hidden = false;
    if (adminSection) adminSection.hidden = !authed;
    if (authed) setTimeout(renderAdminTable, 0);
  };

  const openAdminModal = () => {
    if (!adminModal) return;
    adminModal.classList.add('is-open');
    adminModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => adminPasswordInput?.focus(), 200);
  };
  const closeAdminModal = () => {
    if (!adminModal) return;
    adminModal.classList.remove('is-open');
    adminModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    adminLoginForm?.reset();
    adminLoginForm?.querySelectorAll('.field').forEach((f) => f.classList.remove('has-error'));
    adminLoginForm?.querySelectorAll('.field-error').forEach((e) => e.textContent = '');
  };

  if (navAdmin) {
    navAdmin.addEventListener('click', (e) => {
      if (!isAdminAuth()) {
        e.preventDefault();
        openAdminModal();
      }
    });
  }
  if (closeAdmin) closeAdmin.addEventListener('click', closeAdminModal);
  adminModal?.querySelectorAll('[data-close-admin]').forEach((el) => {
    el.addEventListener('click', closeAdminModal);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && adminModal?.classList.contains('is-open')) closeAdminModal();
  });

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pwd = (new FormData(adminLoginForm).get('adminPassword') || '').toString();

      const field = adminPasswordInput?.closest('.field');
      const errEl = adminLoginForm.querySelector('[data-error="adminPassword"]');
      if (field) field.classList.remove('has-error');
      if (errEl) errEl.textContent = '';

      if (pwd !== ADMIN_PASSWORD) {
        if (field) field.classList.add('has-error');
        if (errEl) errEl.textContent = 'Неверный пароль';
        adminPasswordInput?.focus();
        return;
      }

      setAdminAuth(true);
      closeAdminModal();
      refreshAdminUI();
      renderAdminTable();
      showToast('Доступ к админ-панели открыт');

      setTimeout(() => {
        const target = document.getElementById('admin');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    });
  }

  // Очистить всех
  if (adminClear) {
    adminClear.addEventListener('click', () => {
      if (!isAdminAuth()) return;
      if (!confirm('Точно удалить всех пользователей? Действие необратимо.')) return;
      setUsers([]);
      setBanned([]);
      renderAdminTable();
      renderPlayers();
      showToast('Список пользователей очищен');
    });
  }

  // ===== Загрузка файла для кнопки «Скачать клиент» =====
  const dlPickFile = document.getElementById('dlPickFile');

  if (dlPickFile && dlFileInput) {
    dlPickFile.addEventListener('click', () => dlFileInput.click());

    dlFileInput.addEventListener('change', async () => {
      const file = dlFileInput.files && dlFileInput.files[0];
      if (!file) return;
      const record = {
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: Date.now(),
        data: file,
      };
      const big = file.size > 8 * 1024 * 1024;
      if (big) {
        showToast(`Сохраняем ${humanSize(file.size)}… это может занять пару секунд`, 60000);
      }
      try {
        await saveClientFile(record);
        clientFile = record;
        refreshFileCard();
        showToast(`Файл «${file.name}» (${humanSize(file.size)}) готов к скачиванию`, 3600);
      } catch (err) {
        refreshFileCard();
        showToast('Не удалось сохранить файл: ' + (err && err.message ? err.message : err), 6000);
      } finally {
        dlFileInput.value = '';
      }
    });
  }

  if (dlRemoveFile) {
    dlRemoveFile.addEventListener('click', async () => {
      if (!isAdminAuth()) return;
      if (!confirm('Удалить файл? Кнопка «Скачать клиент» снова покажет заглушку.')) return;
      await deleteClientFile();
      clientFile = null;
      refreshFileCard();
      showToast('Файл удалён');
    });
  }

  // Заблокировать — выйти из админки
  if (adminLock) {
    adminLock.addEventListener('click', () => {
      setAdminAuth(false);
      refreshAdminUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('Админ-панель заблокирована');
    });
  }

  // ===== Экспорт / Импорт базы =====
  if (adminExport) {
    adminExport.addEventListener('click', () => {
      if (!isAdminAuth()) return;
      const users = getUsers();
      const dump = {
        version: 1,
        exportedAt: new Date().toISOString(),
        users,
        banned: getBanned(),
      };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `horizon-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`База сохранена (${users.length} юзеров)`);
    });
  }

  if (adminImport && adminImportFile) {
    adminImport.addEventListener('click', () => {
      if (!isAdminAuth()) return;
      adminImportFile.click();
    });
    adminImportFile.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const dump = JSON.parse(ev.target.result);
          if (!dump || !Array.isArray(dump.users)) throw new Error('Неверный формат файла');
          const ok = confirm(
            `Найдено ${dump.users.length} пользователей. ` +
            `Текущая база (${getUsers().length} юзеров) будет ЗАМЕНЕНА. ` +
            `\n\nПродолжить?`
          );
          if (!ok) { adminImportFile.value = ''; return; }
          setUsers(dump.users);
          if (Array.isArray(dump.banned)) setBanned(dump.banned);
          renderAdminTable();
          renderPlayers();
          showToast(`База восстановлена: ${dump.users.length} юзеров`, 3000);
        } catch (err) {
          alert('Ошибка чтения файла: ' + err.message);
        } finally {
          adminImportFile.value = '';
        }
      };
      reader.readAsText(file);
    });
  }

  // ===== Таблица пользователей =====
  function renderAdminTable() {
    if (!adminTbody) return;
    const users = getUsers();

    const todayKey = new Date().toDateString();
    const isToday = (u) => u.createdAt && new Date(u.createdAt).toDateString() === todayKey;
    const todayUsers = users.filter(isToday);
    const bannedCount = users.filter((u) => isBannedEmail(u.email)).length;

    if (adminTotal) adminTotal.textContent = users.length;
    if (adminToday) adminToday.textContent = todayUsers.length;
    if (adminBanned) adminBanned.textContent = bannedCount;

    // Блок «Новые сегодня»
    const todayCard = document.getElementById('adminTodayCard');
    const todayList = document.getElementById('adminTodayList');
    const todayCountEl = document.getElementById('adminTodayListCount');
    if (todayCard && todayList && todayCountEl) {
      todayCountEl.textContent = todayUsers.length;
      if (todayUsers.length === 0) {
        todayCard.hidden = true;
        todayList.innerHTML = '';
      } else {
        todayCard.hidden = false;
        todayList.innerHTML = todayUsers
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map((u) => {
            const initial = (u.nickname || '?').charAt(0).toUpperCase();
            const time = new Date(u.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            return `
              <div class="today-row">
                <span class="today-avatar">${escapeHtml(initial)}</span>
                <div class="today-info">
                  <div class="today-nick">${escapeHtml(u.nickname || '—')}</div>
                  <div class="today-email">${escapeHtml(u.email || '')}</div>
                </div>
                <span class="today-time">сегодня в ${time}</span>
              </div>
            `;
          }).join('');
      }
    }

    if (!users.length) {
      adminTbody.innerHTML = '<tr><td colspan="5" class="admin-empty">Пока никого нет. Добавь игроков через импорт базы.</td></tr>';
      return;
    }

    adminTbody.innerHTML = users.map((u, i) => {
      const banned = isBannedEmail(u.email);
      return `
      <tr class="${banned ? 'is-banned' : ''}">
        <td class="col-nick">${escapeHtml(u.nickname)}${banned ? ' <span class="banned-tag">бан</span>' : ''}</td>
        <td class="col-email">${escapeHtml(u.email || '—')}</td>
        <td class="col-date">${formatDate(u.createdAt)}</td>
        <td>${banned
          ? '<span class="admin-status admin-status-banned"><span class="dot"></span>Забанен</span>'
          : '<span class="admin-status"><span class="dot"></span>Активен</span>'}</td>
        <td class="col-actions">
          <button class="btn-icon btn-icon-ban ${banned ? 'is-active' : ''}" data-ban-user="${i}" aria-label="${banned ? 'Разбанить' : 'Забанить'}" title="${banned ? 'Разбанить' : 'Забанить'}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              ${banned
                ? '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
                : '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M5 5l14 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'}
            </svg>
          </button>
          <button class="btn-icon" data-del-user="${i}" aria-label="Удалить" title="Удалить">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </td>
      </tr>
    `; }).join('');

    // Удаление
    adminTbody.querySelectorAll('[data-del-user]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.delUser, 10);
        const u = users[idx];
        if (!u) return;
        if (!confirm(`Удалить пользователя "${u.nickname}"?`)) return;
        users.splice(idx, 1);
        setUsers(users);
        if (u.email) {
          setBanned(getBanned().filter((e) => (e || '').toLowerCase() !== u.email.toLowerCase()));
        }
        renderAdminTable();
        renderPlayers();
      });
    });

    // Бан / разбан
    adminTbody.querySelectorAll('[data-ban-user]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.banUser, 10);
        const u = users[idx];
        if (!u || !u.email) return;
        const lower = u.email.toLowerCase();
        const list = getBanned();
        const isBanned = list.some((e) => (e || '').toLowerCase() === lower);

        if (isBanned) {
          if (!confirm(`Разбанить "${u.nickname}"?`)) return;
          setBanned(list.filter((e) => (e || '').toLowerCase() !== lower));
          showToast(`«${u.nickname}» разбанен`);
        } else {
          if (!confirm(`Забанить "${u.nickname}" (${u.email})? Игрок пропадёт из публичного списка.`)) return;
          setBanned([...list, u.email]);
          showToast(`«${u.nickname}» забанен`);
        }
        renderAdminTable();
        renderPlayers();
      });
    });
  }

  // Подтягиваем файл для скачивания (если загружали раньше в этом браузере)
  loadClientFile().then((rec) => {
    if (rec && rec.data) clientFile = rec;
    refreshFileCard();
  }).catch(() => refreshFileCard());

  refreshAdminUI();
  renderPlayers();
})();
