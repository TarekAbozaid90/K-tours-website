(() => {
  const loginPanel = document.getElementById('loginPanel');
  const dashboardPanel = document.getElementById('dashboardPanel');
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const feedback = (id, message) => {
    const element = document.getElementById(id);
    if (element) element.textContent = message;
  };

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: options.body instanceof FormData ? (options.headers || {}) : { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && url !== '/api/admin/login') showLogin('Your admin session has ended. Please sign in again.');
      throw new Error(result.error || `Request failed (${response.status}).`);
    }
    return result;
  }

  function showLogin(message = '') {
    loginPanel.hidden = false;
    dashboardPanel.hidden = true;
    if (message) feedback('loginFeedback', message);
  }

  async function showDashboard() {
    loginPanel.hidden = true;
    dashboardPanel.hidden = false;
    await Promise.all([loadReviews(), loadGallery(), loadVisitors()]);
  }

  async function loadReviews() {
    const wrap = document.getElementById('pendingReviews');
    wrap.innerHTML = '<p class="admin-empty">Loading…</p>';
    try {
      const result = await api('/api/admin/reviews');
      const rows = result.reviews || [];
      document.getElementById('pendingCount').textContent = rows.length;
      if (!rows.length) {
        wrap.innerHTML = '<p class="admin-empty">No reviews are waiting for approval.</p>';
        return;
      }
      wrap.innerHTML = rows.map(row => `
        <article class="admin-review-card" data-id="${safe(row.id)}">
          <div>
            <div class="admin-review-title"><strong>${safe(row.name)}</strong><span>${'★'.repeat(Number(row.rating) || 0)}${'☆'.repeat(5-(Number(row.rating)||0))}</span></div>
            <div class="admin-review-meta">${safe(row.country || 'Country not supplied')} · ${new Date(row.created_at).toLocaleString()}</div>
            <p class="admin-review-text">${safe(row.message)}</p>
            ${(row.photo_urls || []).length ? `<div class="admin-review-photos">${row.photo_urls.map(url => `<a href="${safe(url)}" target="_blank" rel="noopener"><img src="${safe(url)}" alt="Review photo"></a>`).join('')}</div>` : ''}
          </div>
          <div class="admin-review-actions"><button class="approve" data-action="approve" data-id="${safe(row.id)}">Approve</button><button class="delete" data-action="delete-review" data-id="${safe(row.id)}">Delete</button></div>
        </article>`).join('');
    } catch (error) {
      wrap.innerHTML = `<p class="admin-empty">${safe(error.message)}</p>`;
    }
  }

  async function loadGallery() {
    const wrap = document.getElementById('galleryItems');
    wrap.innerHTML = '<p class="admin-empty">Loading…</p>';
    try {
      const result = await api('/api/admin/gallery');
      const rows = result.gallery || [];
      if (!rows.length) {
        wrap.innerHTML = '<p class="admin-empty">Your gallery is empty. Upload your first tour photograph above.</p>';
        return;
      }
      wrap.innerHTML = rows.map(row => `
        <article class="admin-gallery-card">
          <img src="${safe(row.image_url)}" alt="${safe(row.title)}">
          <strong>${safe(row.title)}</strong><small>${safe(row.category || '')}</small>
          <button data-action="delete-gallery" data-id="${safe(row.id)}">Remove photo</button>
        </article>`).join('');
    } catch (error) {
      wrap.innerHTML = `<p class="admin-empty">${safe(error.message)}</p>`;
    }
  }

  async function loadVisitors() {
    const wrap = document.getElementById('visitorTableWrap');
    if (!wrap) return;
    wrap.innerHTML = '<p class="admin-empty">Loading visitor book…</p>';
    try {
      const result = await api('/api/admin/visitors');
      document.getElementById('visitorTotal').textContent = result.total ?? 0;
      document.getElementById('visitorToday').textContent = result.today ?? 0;
      if (!result.enabled) {
        wrap.innerHTML = '<p class="admin-empty">Visitor book is disabled in Render Environment.</p>';
        return;
      }
      const rows = result.visitors || [];
      if (!rows.length) {
        wrap.innerHTML = '<p class="admin-empty">No consented visits have been recorded yet.</p>';
        return;
      }
      wrap.innerHTML = `<table class="visitor-table"><thead><tr><th>Date & time</th><th>IP address</th><th>City / region</th><th>Country</th><th>Device</th><th>Browser / OS</th><th>Page</th></tr></thead><tbody>${rows.map(row => `
        <tr><td>${safe(new Date(row.created_at).toLocaleString())}</td><td><code>${safe(row.ip)}</code></td><td>${safe([row.city, row.region].filter(Boolean).join(', ') || 'Unavailable')}</td><td>${safe(row.country || 'Unavailable')} ${safe(row.country_code || '')}</td><td>${safe(row.device_type || 'Unknown')}</td><td>${safe([row.browser, row.device_os].filter(Boolean).join(' · '))}</td><td><span title="Referrer: ${safe(row.referrer_host || 'Direct')}">${safe(row.page_path || '/')}</span></td></tr>`).join('')}</tbody></table>`;
    } catch (error) {
      wrap.innerHTML = `<p class="admin-empty">${safe(error.message)}</p>`;
    }
  }

  document.getElementById('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    if (!username || !password) {
      feedback('loginFeedback', 'Enter both username and password.');
      return;
    }
    const button = document.getElementById('loginButton');
    button.disabled = true;
    feedback('loginFeedback', 'Checking your credentials…');
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      document.getElementById('loginForm').reset();
      await showDashboard();
    } catch (error) {
      feedback('loginFeedback', error.message || 'Login failed. Check your username and password.');
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('togglePassword').addEventListener('click', event => {
    const input = document.getElementById('adminPassword');
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    event.currentTarget.textContent = visible ? 'Hide' : 'Show';
    event.currentTarget.setAttribute('aria-pressed', String(visible));
  });

  document.getElementById('signOut').addEventListener('click', async () => {
    try { await api('/api/admin/logout', { method: 'POST', body: '{}' }); }
    finally { location.reload(); }
  });
  document.getElementById('refreshReviews').addEventListener('click', loadReviews);
  document.getElementById('refreshVisitors')?.addEventListener('click', loadVisitors);
  document.getElementById('clearVisitors')?.addEventListener('click', async () => {
    if (!confirm('Permanently delete all visitor log entries?')) return;
    try { await api('/api/admin/visitors', { method: 'DELETE', body: '{}' }); await loadVisitors(); }
    catch (error) { alert(error.message || 'Could not clear visitor log.'); }
  });

  document.querySelectorAll('.admin-tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(item => item.classList.toggle('active', item === tab));
    document.getElementById('reviewsPanel').hidden = tab.dataset.tab !== 'reviews';
    document.getElementById('galleryPanel').hidden = tab.dataset.tab !== 'gallery';
    document.getElementById('visitorsPanel').hidden = tab.dataset.tab !== 'visitors';
    if (tab.dataset.tab === 'visitors') loadVisitors();
  }));

  document.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    button.disabled = true;
    try {
      if (button.dataset.action === 'approve') {
        await api(`/api/admin/reviews/${encodeURIComponent(id)}/approve`, { method: 'POST', body: '{}' });
        await loadReviews();
      } else if (button.dataset.action === 'delete-review') {
        if (!confirm('Delete this guest review permanently?')) return;
        await api(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' });
        await loadReviews();
      } else if (button.dataset.action === 'delete-gallery') {
        if (!confirm('Remove this photo from the website gallery?')) return;
        await api(`/api/admin/gallery/${encodeURIComponent(id)}`, { method: 'DELETE' });
        await loadGallery();
      }
    } catch (error) {
      alert(error.message || 'Could not complete that action.');
      button.disabled = false;
    }
  });

  // Admin thumbnails open a larger preview; gallery item names remain available below.
  document.addEventListener('click', event => {
    const img = event.target.closest('.admin-gallery-card img, .admin-review-photos img');
    if (!img) return;
    event.preventDefault();
    let dialog = document.getElementById('adminImagePreview');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'adminImagePreview';
      dialog.className = 'admin-image-preview';
      dialog.innerHTML = '<button type="button" class="admin-image-preview-close" aria-label="Close preview">×</button><img alt=""><p></p><a target="_blank" rel="noopener">Open original image ↗</a>';
      document.body.appendChild(dialog);
      dialog.querySelector('button').addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    }
    const preview = dialog.querySelector('img');
    preview.src = img.currentSrc || img.src;
    preview.alt = img.alt || 'K-tours photo';
    dialog.querySelector('p').textContent = img.alt || 'K-tours photograph';
    dialog.querySelector('a').href = img.currentSrc || img.src;
    if (!dialog.open) dialog.showModal();
  });

  document.getElementById('galleryForm').addEventListener('submit', async event => {
    event.preventDefault();
    const title = document.getElementById('galleryTitle').value.trim();
    const category = document.getElementById('galleryCategory').value;
    const file = document.getElementById('galleryFile').files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 3 * 1024 * 1024) {
      feedback('galleryFeedback', 'Please choose JPG, PNG or WebP up to 3 MB.');
      return;
    }
    const submit = event.currentTarget.querySelector('button[type=submit]');
    submit.disabled = true;
    feedback('galleryFeedback', 'Uploading photograph…');
    try {
      const formData = new FormData();
      formData.set('title', title);
      formData.set('category', category);
      formData.set('photo', file, file.name);
      await api('/api/admin/gallery', { method: 'POST', body: formData });
      event.currentTarget.reset();
      feedback('galleryFeedback', 'Photo added to the website gallery.');
      await loadGallery();
    } catch (error) {
      feedback('galleryFeedback', error.message || 'Upload failed.');
    } finally {
      submit.disabled = false;
    }
  });

  (async () => {
    try {
      await api('/api/admin/session');
      await showDashboard();
    } catch {
      showLogin();
    }
  })();
})();
