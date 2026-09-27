/* ============================================
   NOVA//STUDIO — interactions
   ============================================ */

(() => {
  'use strict';

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
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 40);
    lastY = y;
  }, { passive: true });

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

  // ===== Параллакс для орбов и больших блоков =====
  const orbs = document.querySelectorAll('.orb');
  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    orbs.forEach((orb, i) => {
      const k = (i + 1) * 12;
      orb.style.translate = `${x * k}px ${y * k}px`;
    });
  });

  // ===== Glow на превью карточек =====
  document.querySelectorAll('.work-thumb').forEach((thumb) => {
    thumb.addEventListener('mousemove', (e) => {
      const r = thumb.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      const glow = thumb.querySelector('.thumb-glow');
      if (glow) {
        glow.style.setProperty('--mx', mx + '%');
        glow.style.setProperty('--my', my + '%');
      }
    });
  });

  // ===== Счётчики =====
  const counters = document.querySelectorAll('[data-count]');
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const dur = 1600;
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

  // ===== Имитация отправки формы =====
  window.fakeSubmit = (form) => {
    const btn = form.querySelector('button');
    const original = btn.innerHTML;
    btn.innerHTML = '<span>✓ Отправлено! Ответим в течение 24ч</span>';
    btn.style.background = 'linear-gradient(135deg, #4ade80, #22d3ee)';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.background = '';
      btn.disabled = false;
      form.reset();
    }, 3000);
  };

  // ===== Модалка регистрации =====
  const modal = document.getElementById('registerModal');
  const openBtn = document.getElementById('openRegister');
  const closeBtn = document.getElementById('closeRegister');
  const regForm = document.getElementById('registerForm');
  const togglePass = document.getElementById('togglePass');
  const passInput = document.getElementById('regPassword');
  const eyeIcon = document.getElementById('eyeIcon');
  const toast = document.getElementById('successToast');
  let lastFocus = null;

  const openModal = () => {
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => {
      const first = modal.querySelector('input');
      if (first) first.focus();
    }, 200);
  };
  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    regForm?.reset();
    regForm?.querySelectorAll('.field').forEach((f) => f.classList.remove('has-error'));
    regForm?.querySelectorAll('.field-error').forEach((e) => e.textContent = '');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  };

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal?.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('is-open')) closeModal();
  });

  // Показать/скрыть пароль
  if (togglePass && passInput && eyeIcon) {
    togglePass.addEventListener('click', () => {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      eyeIcon.innerHTML = isPass
        ? '<path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a13 13 0 0 1-3 3.6M6.6 6.6A13 13 0 0 0 2 12s3.5 7 10 7c1.8 0 3.4-.4 4.8-1.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
        : '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>';
    });
  }

  // Валидация и «отправка»
  if (regForm) {
    const showError = (fieldName, msg) => {
      const field = regForm.querySelector(`[name="${fieldName}"]`)?.closest('.field');
      const errEl = regForm.querySelector(`[data-error="${fieldName}"]`);
      if (field) field.classList.add('has-error');
      if (errEl) errEl.textContent = msg;
    };
    const clearError = (fieldName) => {
      const field = regForm.querySelector(`[name="${fieldName}"]`)?.closest('.field');
      const errEl = regForm.querySelector(`[data-error="${fieldName}"]`);
      if (field) field.classList.remove('has-error');
      if (errEl) errEl.textContent = '';
    };

    // Clear error on input
    regForm.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => clearError(input.name));
    });

    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(regForm);
      const nickname = (data.get('nickname') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();
      const password = (data.get('password') || '').toString();
      const agree = regForm.querySelector('#regAgree')?.checked;

      let ok = true;
      regForm.querySelectorAll('.field').forEach((f) => f.classList.remove('has-error'));
      regForm.querySelectorAll('.field-error').forEach((e) => e.textContent = '');

      if (nickname.length < 2) { showError('nickname', 'Никнейм должен быть не короче 2 символов'); ok = false; }
      else if (!/^[a-zA-Zа-яА-Я0-9_\-]+$/.test(nickname)) { showError('nickname', 'Только буквы, цифры, _ и -'); ok = false; }
      else {
        // Проверка уникальности ника (регистронезависимая)
        let existingUsers = [];
        try { existingUsers = JSON.parse(localStorage.getItem('horizon_users') || '[]'); } catch (_) {}
        const nickLower = nickname.toLowerCase();
        const nickTaken = existingUsers.some((u) => (u.nickname || '').toLowerCase() === nickLower);
        if (nickTaken) { showError('nickname', 'Этот никнейм уже занят'); ok = false; }
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('email', 'Введите корректный email'); ok = false; }
      else if (isBannedEmail(email)) { showError('email', 'Этот email заблокирован'); ok = false; }
      else {
        // Проверка уникальности email
        let existingUsers = [];
        try { existingUsers = JSON.parse(localStorage.getItem('horizon_users') || '[]'); } catch (_) {}
        const emailLower = email.toLowerCase();
        const emailTaken = existingUsers.some((u) => (u.email || '').toLowerCase() === emailLower);
        if (emailTaken) { showError('email', 'Этот email уже зарегистрирован. Войдите в аккаунт'); ok = false; }
      }

      if (password.length < 6) { showError('password', 'Пароль должен быть не короче 6 символов'); ok = false; }
      else if (!/[A-Za-zА-Яа-я]/.test(password) || !/\d/.test(password)) { showError('password', 'Пароль должен содержать буквы и цифры'); ok = false; }

      if (!agree) { showError('password', 'Нужно согласиться с политикой конфиденциальности'); ok = false; }

      if (!ok) return;

      const btn = regForm.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.innerHTML = '<span>Создаём аккаунт…</span>';
      btn.disabled = true;

      setTimeout(() => {
        // Считаем UID как следующий порядковый номер среди зарегистрированных
        // Используем глобальный счётчик — он никогда не уменьшается,
        // даже если юзеров удалили или забанили.
        let nextUid = 1;
        try {
          const counter = parseInt(localStorage.getItem('horizon_uid_counter') || '0', 10);
          nextUid = (isNaN(counter) ? 0 : counter) + 1;
          localStorage.setItem('horizon_uid_counter', String(nextUid));
        } catch (_) {}
        // Заодно убедимся, что UID не совпадает с уже существующим (после импорта)
        let existingUsers = [];
        try { existingUsers = JSON.parse(localStorage.getItem('horizon_users') || '[]'); } catch (_) {}
        const existingUids = new Set(existingUsers.map((u) => u.uid));
        while (existingUids.has(String(nextUid).padStart(3, '0'))) {
          nextUid++;
          try { localStorage.setItem('horizon_uid_counter', String(nextUid)); } catch (_) {}
        }
        const uid = String(nextUid).padStart(3, '0');
        const newUser = { uid, nickname, email, createdAt: new Date().toISOString() };
        closeModal();
        btn.innerHTML = original;
        btn.disabled = false;
        if (toast) {
          toast.querySelector('.toast-text').textContent = `Готово, ${nickname}! Аккаунт создан (демо).`;
          toast.classList.add('is-visible');
          setTimeout(() => toast.classList.remove('is-visible'), 3500);
        }
        // Save demo user to localStorage so it persists across reloads (frontend-only)
        try {
          const users = JSON.parse(localStorage.getItem('horizon_users') || '[]');
          users.push(newUser);
          localStorage.setItem('horizon_users', JSON.stringify(users));
          localStorage.setItem('horizon_current_user', JSON.stringify(newUser));
          // Сохраняем пароль для последующего входа
          if (typeof saveLoginCreds === 'function') saveLoginCreds(email, password);
        } catch (_) {}
        // Notify profile UI
        document.dispatchEvent(new CustomEvent('register-success', { detail: newUser }));
      }, 1100);
    });
  }

  // ===== Login modal =====
  const loginModal = document.getElementById('loginModal');
  const openLoginBtn = document.getElementById('openLogin');
  const closeLoginBtn = document.getElementById('closeLogin');
  const loginForm = document.getElementById('loginForm');
  const loginEmailInput = document.getElementById('loginEmailInput');
  const loginPasswordInput = document.getElementById('loginPasswordInput');

  const LOGIN_USERS_KEY = 'horizon_login_users';

  // При регистрации сохраняем email + пароль в отдельный список для входа
  const saveLoginCreds = (email, password) => {
    if (!email || !password) return;
    try {
      const list = JSON.parse(localStorage.getItem(LOGIN_USERS_KEY) || '{}');
      list[email.toLowerCase()] = password;
      localStorage.setItem(LOGIN_USERS_KEY, JSON.stringify(list));
    } catch (_) {}
  };
  const getLoginCred = (email) => {
    try {
      const list = JSON.parse(localStorage.getItem(LOGIN_USERS_KEY) || '{}');
      return list[(email || '').toLowerCase()] || null;
    } catch (_) { return null; }
  };

  const openLoginModal = () => {
    if (!loginModal) return;
    loginModal.classList.add('is-open');
    loginModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => loginEmailInput?.focus(), 200);
  };
  const closeLoginModal = () => {
    if (!loginModal) return;
    loginModal.classList.remove('is-open');
    loginModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    loginForm?.reset();
    loginForm?.querySelectorAll('.field').forEach((f) => f.classList.remove('has-error'));
    loginForm?.querySelectorAll('.field-error').forEach((e) => e.textContent = '');
  };

  if (openLoginBtn) openLoginBtn.addEventListener('click', openLoginModal);
  if (closeLoginBtn) closeLoginBtn.addEventListener('click', closeLoginModal);
  loginModal?.querySelectorAll('[data-close-login]').forEach((el) => {
    el.addEventListener('click', closeLoginModal);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && loginModal?.classList.contains('is-open')) closeLoginModal();
  });

  // Переключение между модалками
  document.querySelectorAll('[data-switch-login]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
      setTimeout(openLoginModal, 200);
    });
  });
  document.querySelectorAll('[data-switch-register]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      closeLoginModal();
      setTimeout(openModal, 200);
    });
  });

  // Submit логина
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(loginForm);
      const email = (data.get('loginEmail') || '').toString().trim();
      const password = (data.get('loginPassword') || '').toString();

      loginForm.querySelectorAll('.field').forEach((f) => f.classList.remove('has-error'));
      loginForm.querySelectorAll('.field-error').forEach((e) => e.textContent = '');

      const emailField = loginEmailInput?.closest('.field');
      const passField = loginPasswordInput?.closest('.field');
      const emailErr = loginForm.querySelector('[data-error="loginEmail"]');
      const passErr = loginForm.querySelector('[data-error="loginPassword"]');

      let ok = true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (emailField) emailField.classList.add('has-error');
        if (emailErr) emailErr.textContent = 'Введите корректный email';
        ok = false;
      }
      if (password.length < 6) {
        if (passField) passField.classList.add('has-error');
        if (passErr) passErr.textContent = 'Пароль должен быть не короче 6 символов';
        ok = false;
      }
      if (!ok) return;

      // Проверка в localStorage
      const savedPass = getLoginCred(email);
      if (!savedPass) {
        if (emailField) emailField.classList.add('has-error');
        if (emailErr) emailErr.textContent = 'Аккаунт с таким email не найден';
        return;
      }
      if (savedPass !== password) {
        if (passField) passField.classList.add('has-error');
        if (passErr) passErr.textContent = 'Неверный пароль';
        return;
      }

      // Проверка на бан
      if (isBannedEmail(email)) {
        if (emailField) emailField.classList.add('has-error');
        if (emailErr) emailErr.textContent = 'Этот email заблокирован';
        return;
      }

      // Найти пользователя в horizon_users по email
      let users = [];
      try { users = JSON.parse(localStorage.getItem('horizon_users') || '[]'); } catch (_) {}
      const user = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
      if (!user) {
        if (emailField) emailField.classList.add('has-error');
        if (emailErr) emailErr.textContent = 'Аккаунт повреждён. Зарегистрируйтесь заново.';
        return;
      }

      // Успешный вход
      const btn = loginForm.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.innerHTML = '<span>Входим…</span>';
      btn.disabled = true;

      setTimeout(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); } catch (_) {}
        closeLoginModal();
        btn.innerHTML = original;
        btn.disabled = false;
        refreshProfileUI();
        refreshDownloadUI();
        if (typeof renderAdminTable === 'function') renderAdminTable();
        if (toast) {
          toast.querySelector('.toast-text').textContent = `Добро пожаловать, ${user.nickname}!`;
          toast.classList.add('is-visible');
          setTimeout(() => toast.classList.remove('is-visible'), 2500);
        }
        // Скроллим к профилю
        setTimeout(() => {
          const target = document.getElementById('profile');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }, 700);
    });
  }

  // ===== Profile =====
  const navProfile = document.getElementById('navProfile');
  const profileSection = document.getElementById('profile');
  const navAvatar = document.getElementById('navAvatar');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');
  const profileHandle = document.getElementById('profileHandle');
  const profileEmail = document.getElementById('profileEmail');
  const profileUid = document.getElementById('profileUid');
  const profileDate = document.getElementById('profileDate');
  const profileCount = document.getElementById('profileCount');
  const profileGreeting = document.getElementById('profileGreeting');
  const logoutBtn = document.getElementById('logoutBtn');

  const STORAGE_KEY = 'horizon_current_user';

  const formatDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (_) { return '—'; }
  };

  // ===== Download section (зависит от логина) =====
  const downloadCta = document.getElementById('downloadCta');

  const refreshDownloadUI = () => {
    if (!downloadCta) return;
    let currentUser = null;
    try { currentUser = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) {}

    if (currentUser && currentUser.nickname) {
      // Залогинен — кнопка «Скоро», по клику покажем тост
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
          if (toast) {
            toast.querySelector('.toast-text').textContent = 'Релиз скоро. Подпишись на Telegram, чтобы узнать первым.';
            toast.classList.add('is-visible');
            setTimeout(() => toast.classList.remove('is-visible'), 3000);
          }
        });
      }
    } else {
      // Не залогинен — замочек
      downloadCta.innerHTML = `
        <button type="button" class="btn-locked" id="downloadLocked">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Скачивание доступно после регистрации</span>
        </button>
        <div class="download-hint">Зарегистрируйся в один клик — кнопка появится автоматически.</div>
      `;
      const btn = document.getElementById('downloadLocked');
      if (btn) {
        btn.addEventListener('click', openModal);
      }
    }
  };

  const refreshProfileUI = () => {
    let current = null;
    try { current = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) {}

    if (current && current.nickname) {
      const initial = current.nickname.charAt(0).toUpperCase();
      if (navAvatar) navAvatar.textContent = initial;
      if (profileAvatar) profileAvatar.textContent = initial;
      if (profileName) profileName.textContent = current.nickname;
      if (profileHandle) {
        const base = '@' + current.nickname.toLowerCase();
        profileHandle.textContent = current.uid ? `${base} · #${current.uid}` : base;
      }
      if (profileEmail) profileEmail.textContent = current.email || '—';
      if (profileDate) profileDate.textContent = formatDate(current.createdAt);
      if (profileUid) profileUid.textContent = current.uid ? `#${current.uid}` : '—';
      if (profileGreeting) profileGreeting.textContent = current.nickname;

      // count
      try {
        const all = JSON.parse(localStorage.getItem('horizon_users') || '[]');
        if (profileCount) profileCount.textContent = all.length || 1;
      } catch (_) {}

      if (navProfile) navProfile.hidden = false;
      if (profileSection) profileSection.hidden = false;
    } else {
      if (navProfile) navProfile.hidden = true;
      if (profileSection) profileSection.hidden = true;
    }
  };

  // After successful registration — save as current user
  // (встроено в submit-handler выше — добавим вызов здесь)
  const origSubmit = regForm?.onsubmit;
  // Вместо перехвата — слушаем событие 'register-success'
  document.addEventListener('register-success', (e) => {
    const user = e.detail;
    if (!user) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); } catch (_) {}
    refreshProfileUI(); refreshDownloadUI();
    if (typeof renderAdminTable === 'function') renderAdminTable();
    if (typeof renderPlayers === 'function') renderPlayers();
  });

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      refreshProfileUI(); refreshDownloadUI();
      // Скроллим наверх
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (toast) {
        toast.querySelector('.toast-text').textContent = 'Вы вышли из аккаунта';
        toast.classList.add('is-visible');
        setTimeout(() => toast.classList.remove('is-visible'), 2500);
      }
    });
  }

  // Initial render
  refreshProfileUI(); refreshDownloadUI();

  // Click на вкладку «Профиль» в навигации — если нет сессии, открываем регистрацию
  if (navProfile) {
    navProfile.addEventListener('click', (e) => {
      try {
        const cur = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (!cur) {
          e.preventDefault();
          openModal();
        }
        // иначе — обычный переход по якорю #profile
      } catch (_) {}
    });
  }

  // ===== Admin Panel =====
  const ADMIN_PASSWORD = 'fssgsdfgds';
  const ADMIN_SESSION = 'horizon_admin_session';

  const adminModal = document.getElementById('adminModal');
  const navAdmin = document.getElementById('navAdmin');
  const adminSection = document.getElementById('adminSection') || document.getElementById('admin');
  const closeAdmin = document.getElementById('closeAdmin');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const adminTbody = document.getElementById('adminTbody');
  const adminTotal = document.getElementById('adminTotal');
  const adminToday = document.getElementById('adminToday');
  const adminLast = document.getElementById('adminLast');
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
    if (navAdmin) navAdmin.hidden = !authed;
    if (adminSection) adminSection.hidden = !authed;
    // Когда админка становится видна — рендерим таблицу
    if (authed && typeof renderAdminTable === 'function') {
      setTimeout(renderAdminTable, 0);
    }
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
      // Сначала проверяем, что пользователь зарегистрирован
      let currentUser = null;
      try { currentUser = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) {}
      if (!currentUser) {
        e.preventDefault();
        if (toast) {
          toast.querySelector('.toast-text').textContent = 'Сначала зарегистрируйтесь';
          toast.classList.add('is-visible');
          setTimeout(() => toast.classList.remove('is-visible'), 2500);
        }
        return;
      }
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
      const data = new FormData(adminLoginForm);
      const pwd = (data.get('adminPassword') || '').toString();

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

      if (toast) {
        toast.querySelector('.toast-text').textContent = 'Доступ к админ-панели открыт';
        toast.classList.add('is-visible');
        setTimeout(() => toast.classList.remove('is-visible'), 2500);
      }

      // Скроллим к админке
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
      const ok = confirm('Точно удалить всех пользователей? Действие необратимо.');
      if (!ok) return;
      try {
        localStorage.removeItem('horizon_users');
        localStorage.removeItem('horizon_current_user');
      } catch (_) {}
      renderAdminTable();
      refreshProfileUI(); refreshDownloadUI();
      if (typeof renderPlayers === 'function') renderPlayers();
      if (toast) {
        toast.querySelector('.toast-text').textContent = 'Список пользователей очищен';
        toast.classList.add('is-visible');
        setTimeout(() => toast.classList.remove('is-visible'), 2500);
      }
    });
  }

  // Заблокировать — выйти из админки
  if (adminLock) {
    adminLock.addEventListener('click', () => {
      setAdminAuth(false);
      refreshAdminUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (toast) {
        toast.querySelector('.toast-text').textContent = 'Админ-панель заблокирована';
        toast.classList.add('is-visible');
        setTimeout(() => toast.classList.remove('is-visible'), 2500);
      }
    });
  }

  // ===== Экспорт / Импорт базы =====
  if (adminExport) {
    adminExport.addEventListener('click', () => {
      if (!isAdminAuth()) return;
      let users = [], loginUsers = {}, banned = [];
      try { users = JSON.parse(localStorage.getItem('horizon_users') || '[]'); } catch (_) {}
      try { loginUsers = JSON.parse(localStorage.getItem('horizon_login_users') || '{}'); } catch (_) {}
      try { banned = JSON.parse(localStorage.getItem('horizon_banned') || '[]'); } catch (_) {}

      const dump = {
        version: 1,
        exportedAt: new Date().toISOString(),
        users,
        loginUsers,
        banned,
      };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `horizon-backup-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (toast) {
        toast.querySelector('.toast-text').textContent = `База сохранена (${users.length} юзеров)`;
        toast.classList.add('is-visible');
        setTimeout(() => toast.classList.remove('is-visible'), 2500);
      }
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
          if (!dump || !Array.isArray(dump.users)) {
            throw new Error('Неверный формат файла');
          }
          const ok = confirm(
            `Найдено ${dump.users.length} пользователей. ` +
            `Текущая база (${(JSON.parse(localStorage.getItem('horizon_users') || '[]')).length} юзеров) будет ЗАМЕНЕНА. ` +
            `\n\nПродолжить?`
          );
          if (!ok) {
            adminImportFile.value = '';
            return;
          }
          try {
            localStorage.setItem('horizon_users', JSON.stringify(dump.users));
            if (dump.loginUsers) localStorage.setItem('horizon_login_users', JSON.stringify(dump.loginUsers));
            if (dump.banned) localStorage.setItem('horizon_banned', JSON.stringify(dump.banned));
            // Перезапустим миграцию на всякий случай
            migrateUsers();
            renderAdminTable();
            refreshProfileUI();
            refreshDownloadUI();
            if (typeof renderPlayers === 'function') renderPlayers();
          } catch (e) {
            alert('Не удалось сохранить: ' + e.message);
            return;
          }
          if (toast) {
            toast.querySelector('.toast-text').textContent = `База восстановлена: ${dump.users.length} юзеров`;
            toast.classList.add('is-visible');
            setTimeout(() => toast.classList.remove('is-visible'), 3000);
          }
        } catch (err) {
          alert('Ошибка чтения файла: ' + err.message);
        } finally {
          adminImportFile.value = '';
        }
      };
      reader.readAsText(file);
    });
  }

  const BANNED_KEY = 'horizon_banned';
  const getBanned = () => {
    try { return JSON.parse(localStorage.getItem(BANNED_KEY) || '[]'); } catch (_) { return []; }
  };
  const setBanned = (arr) => {
    try { localStorage.setItem(BANNED_KEY, JSON.stringify(arr)); } catch (_) {}
  };
  const isBannedEmail = (email) => {
    if (!email) return false;
    return getBanned().some((e) => (e || '').toLowerCase() === email.toLowerCase());
  };

  // ===== Миграция: дописываем uid юзерам, зарегистрированным до фикса =====
  const migrateUsers = () => {
    try {
      const users = JSON.parse(localStorage.getItem('horizon_users') || '[]');
      let changed = false;
      users.forEach((u, i) => {
        if (!u.uid) {
          u.uid = String(i + 1).padStart(3, '0');
          changed = true;
        }
      });
      if (changed) localStorage.setItem('horizon_users', JSON.stringify(users));

      // Инициализация глобального счётчика UID — максимум из существующих
      const maxUid = users.reduce((max, u) => {
        const n = parseInt(u.uid, 10);
        return isNaN(n) ? max : Math.max(max, n);
      }, 0);
      const storedCounter = parseInt(localStorage.getItem('horizon_uid_counter') || '0', 10);
      const finalCounter = Math.max(isNaN(storedCounter) ? 0 : storedCounter, maxUid);
      if (finalCounter > 0) localStorage.setItem('horizon_uid_counter', String(finalCounter));

      // Если есть current_user без uid — тоже допишем
      const cur = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (cur && !cur.uid) {
        const matched = users.find((u) => (u.email || '').toLowerCase() === (cur.email || '').toLowerCase());
        if (matched) {
          cur.uid = matched.uid;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
        }
      }
    } catch (_) {}
  };
  migrateUsers();

  const renderAdminTable = () => {
    if (!adminTbody) return;
    let users = [];
    try { users = JSON.parse(localStorage.getItem('horizon_users') || '[]'); } catch (_) {}

    // Stats
    const todayKey = new Date().toDateString();
    const todayCount = users.filter((u) => u.createdAt && new Date(u.createdAt).toDateString() === todayKey).length;
    const bannedCount = users.filter((u) => isBannedEmail(u.email)).length;
    if (adminTotal) adminTotal.textContent = users.length;
    if (adminToday) adminToday.textContent = todayCount;
    if (adminLast) adminLast.textContent = users.length ? users[users.length - 1].nickname : '—';

    // Обновим третью плитку: «Забанено» (там сейчас «Последний ник»)
    const adminTileLabel = document.querySelector('#admin .admin-stat:last-child .admin-stat-label');
    if (adminTileLabel) adminTileLabel.textContent = 'Забанено';
    const adminTileNum = document.querySelector('#admin .admin-stat:last-child .admin-stat-num');
    if (adminTileNum) adminTileNum.textContent = bannedCount;

    // ===== Список «Новые сегодня» =====
    const todayCard = document.getElementById('adminTodayCard');
    const todayList = document.getElementById('adminTodayList');
    const todayCountEl = document.getElementById('adminTodayListCount');
    if (todayCard && todayList && todayCountEl) {
      const todayUsers = users
        .filter((u) => u.createdAt && new Date(u.createdAt).toDateString() === todayKey)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      todayCountEl.textContent = todayUsers.length;

      if (todayUsers.length === 0) {
        todayCard.hidden = true;
        todayList.innerHTML = '';
      } else {
        todayCard.hidden = false;
        todayList.innerHTML = todayUsers.map((u) => {
          const initial = (u.nickname || '?').charAt(0).toUpperCase();
          const d = new Date(u.createdAt);
          const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
          return `
            <div class="today-row">
              <span class="today-avatar">${escapeHtml(initial)}</span>
              <div class="today-info">
                <div class="today-nick">${escapeHtml(u.nickname || '—')}</div>
                <div class="today-email">${escapeHtml(u.email || '')}</div>
              </div>
              <span class="today-uid">#${escapeHtml(u.uid || '—')}</span>
              <span class="today-time">сегодня в ${time}</span>
            </div>
          `;
        }).join('');
      }
    }

    if (!users.length) {
      adminTbody.innerHTML = '<tr><td colspan="6" class="admin-empty">Пока никого нет. Зарегистрируй первого пользователя через кнопку «Зарегистрироваться» в правом верхнем углу.</td></tr>';
      return;
    }

    adminTbody.innerHTML = users.map((u, i) => {
      const banned = isBannedEmail(u.email);
      return `
      <tr class="${banned ? 'is-banned' : ''}">
        <td class="col-num">#${escapeHtml(u.uid || String(i + 1).padStart(3, '0'))}</td>
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
    `;}).join('');

    adminTbody.querySelectorAll('[data-del-user]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.delUser, 10);
        const u = users[idx];
        if (!u) return;
        if (!confirm(`Удалить пользователя "${u.nickname}"?`)) return;
        users.splice(idx, 1);
        try { localStorage.setItem('horizon_users', JSON.stringify(users)); } catch (_) {}
        // Если удалили текущего — чистим сессию
        try {
          const cur = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
          if (cur && cur.nickname === u.nickname && cur.email === u.email) {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (_) {}
        // Снимем с бана заодно
        if (u.email) {
          const list = getBanned().filter((e) => (e || '').toLowerCase() !== u.email.toLowerCase());
          setBanned(list);
        }
        renderAdminTable();
        refreshProfileUI(); refreshDownloadUI();
        if (typeof renderPlayers === 'function') renderPlayers();
      });
    });

    // Ban / unban
    adminTbody.querySelectorAll('[data-ban-user]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.banUser, 10);
        const u = users[idx];
        if (!u || !u.email) return;
        let list = getBanned();
        const lower = u.email.toLowerCase();
        if (list.some((e) => (e || '').toLowerCase() === lower)) {
          // Разбанить
          if (!confirm(`Разбанить "${u.nickname}"?`)) return;
          list = list.filter((e) => (e || '').toLowerCase() !== lower);
          setBanned(list);
          if (toast) {
            toast.querySelector('.toast-text').textContent = `«${u.nickname}» разбанен`;
            toast.classList.add('is-visible');
            setTimeout(() => toast.classList.remove('is-visible'), 2500);
          }
        } else {
          // Забанить
          if (!confirm(`Забанить "${u.nickname}" (${u.email})? Пользователь не сможет войти.`)) return;
          list.push(u.email);
          setBanned(list);
          // Если забанен текущий пользователь — выкидываем
          try {
            const cur = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (cur && (cur.email || '').toLowerCase() === lower) {
              localStorage.removeItem(STORAGE_KEY);
              setAdminAuth(false);
              refreshAdminUI();
            }
          } catch (_) {}
          if (toast) {
            toast.querySelector('.toast-text').textContent = `«${u.nickname}» забанен`;
            toast.classList.add('is-visible');
            setTimeout(() => toast.classList.remove('is-visible'), 2500);
          }
        }
        renderAdminTable();
        refreshProfileUI(); refreshDownloadUI();
        if (typeof renderPlayers === 'function') renderPlayers();
      });
    });
  };

  const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  // ===== Публичный список игроков (community) =====
  const playersGrid = document.getElementById('playersGrid');
  const playersCountEl = document.getElementById('playersCount');
  const playersNewEl = document.getElementById('playersNew');
  const playersLatestEl = document.getElementById('playersLatest');

  const renderPlayers = () => {
    if (!playersGrid) return;
    let users = [];
    try { users = JSON.parse(localStorage.getItem('horizon_users') || '[]'); } catch (_) {}
    // Фильтруем забаненных — их не показываем публично
    const visible = users.filter((u) => u && u.nickname && !isBannedEmail(u.email));
    // Сортируем по UID (по возрастанию), потом по дате
    visible.sort((a, b) => {
      const an = parseInt(a.uid, 10); const bn = parseInt(b.uid, 10);
      if (!isNaN(an) && !isNaN(bn) && an !== bn) return an - bn;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

    // Статата
    const todayKey = new Date().toDateString();
    const newToday = visible.filter((u) => u.createdAt && new Date(u.createdAt).toDateString() === todayKey).length;
    if (playersCountEl) playersCountEl.textContent = visible.length;
    if (playersNewEl) playersNewEl.textContent = newToday;
    if (playersLatestEl) playersLatestEl.textContent = visible.length ? visible[visible.length - 1].nickname : '—';

    if (!visible.length) {
      playersGrid.innerHTML = '<div class="player-empty">Пока никто не зарегистрировался. Будь первым — нажми «Зарегистрироваться» в правом верхнем углу ✨</div>';
      return;
    }

    playersGrid.innerHTML = visible.map((u) => {
      const initial = (u.nickname || '?').charAt(0).toUpperCase();
      return `
        <div class="player-card">
          <div class="player-avatar">${escapeHtml(initial)}</div>
          <div class="player-info">
            <div class="player-nick">${escapeHtml(u.nickname)}</div>
            <span class="player-uid">#${escapeHtml(u.uid || '—')}</span>
          </div>
        </div>
      `;
    }).join('');
  };

  refreshAdminUI();
  renderPlayers();

  // ===== Лёгкий шейк при hover на service-row =====
  document.querySelectorAll('.service-row').forEach((row) => {
    row.addEventListener('mouseenter', () => {
      const num = row.querySelector('.service-num');
      if (num) {
        num.style.color = 'var(--accent-2)';
        num.style.transition = 'color 0.3s';
      }
    });
    row.addEventListener('mouseleave', () => {
      const num = row.querySelector('.service-num');
      if (num) num.style.color = '';
    });
  });

})();
