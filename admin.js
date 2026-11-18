(() => {
  const cfg = window.KTOURS_CONFIG || {};
  const ready = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase?.createClient);
  const loginPanel = document.getElementById("loginPanel");
  const dashboardPanel = document.getElementById("dashboardPanel");
  const loginFeedback = document.getElementById("loginFeedback");
  if (!ready) {
    loginFeedback.textContent = "Supabase is not configured yet. Add the project URL and anon key in config.js, then run supabase/schema.sql.";
    document.getElementById("loginForm").addEventListener("submit", e => { e.preventDefault(); loginFeedback.textContent = "Connect Supabase first. See README.md for setup steps."; });
    return;
  }
  const db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const adminEmail = (cfg.ADMIN_EMAIL || "").toLowerCase();
  const safe = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const feedback = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const showDashboard = async session => {
    const email = session?.user?.email?.toLowerCase();
    if (!email || email !== adminEmail) {
      loginPanel.hidden = false; dashboardPanel.hidden = true;
      loginFeedback.textContent = `This account (${email || "unknown"}) is not the configured administrator.`;
      return;
    }
    loginPanel.hidden = true; dashboardPanel.hidden = false;
    await Promise.all([loadReviews(), loadGallery()]);
  };
  const loadReviews = async () => {
    const wrap = document.getElementById("pendingReviews"); wrap.innerHTML = '<p class="admin-empty">Loading…</p>';
    const { data, error } = await db.from("reviews").select("id,name,country,rating,message,photo_urls,created_at,approved").eq("approved", false).order("created_at", { ascending:false });
    if (error) { wrap.innerHTML = `<p class="admin-empty">${safe(error.message)}</p>`; return; }
    document.getElementById("pendingCount").textContent = data.length;
    if (!data.length) { wrap.innerHTML = '<p class="admin-empty">No reviews are waiting for approval.</p>'; return; }
    wrap.innerHTML = data.map(row => `
      <article class="admin-review-card" data-id="${safe(row.id)}">
        <div><div class="admin-review-title"><strong>${safe(row.name)}</strong><span>${"★".repeat(row.rating)}${"☆".repeat(5-row.rating)}</span></div>
        <div class="admin-review-meta">${safe(row.country || "Country not supplied")} · ${new Date(row.created_at).toLocaleString()}</div>
        <p class="admin-review-text">${safe(row.message)}</p>
        ${(row.photo_urls || []).length ? `<div class="admin-review-photos">${row.photo_urls.map(url => `<a href="${safe(url)}" target="_blank" rel="noopener"><img src="${safe(url)}" alt="Review photo"></a>`).join("")}</div>` : ""}</div>
        <div class="admin-review-actions"><button class="approve" data-action="approve" data-id="${safe(row.id)}">Approve</button><button class="delete" data-action="delete-review" data-id="${safe(row.id)}">Delete</button></div>
      </article>`).join("");
  };
  const loadGallery = async () => {
    const wrap = document.getElementById("galleryItems"); wrap.innerHTML = '<p class="admin-empty">Loading…</p>';
    const { data, error } = await db.from("gallery").select("id,title,category,image_url,storage_path,sort_order").order("sort_order", { ascending:true });
    if (error) { wrap.innerHTML = `<p class="admin-empty">${safe(error.message)}</p>`; return; }
    if (!data.length) { wrap.innerHTML = '<p class="admin-empty">Your gallery is empty. Upload your first tour photograph above.</p>'; return; }
    wrap.innerHTML = data.map(row => `<article class="admin-gallery-card"><img src="${safe(row.image_url)}" alt="${safe(row.title)}"><strong>${safe(row.title)}</strong><small>${safe(row.category || "")}</small><button data-action="delete-gallery" data-id="${safe(row.id)}" data-path="${safe(row.storage_path || "")}">Remove photo</button></article>`).join("");
  };
  document.getElementById("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("adminEmail").value.trim().toLowerCase();
    if (email !== adminEmail) { loginFeedback.textContent = "Use the administrator email configured in config.js."; return; }
    loginFeedback.textContent = "Sending secure sign-in link…";
    const { error } = await db.auth.signInWithOtp({ email, options:{ emailRedirectTo:window.location.href.split("?")[0] } });
    loginFeedback.textContent = error ? error.message : "Check your email for the secure sign-in link.";
  });
  document.getElementById("signOut").addEventListener("click", async () => { await db.auth.signOut(); location.reload(); });
  document.getElementById("refreshReviews").addEventListener("click", loadReviews);
  document.querySelectorAll(".admin-tab").forEach(tab => tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach(t => t.classList.toggle("active", t === tab));
    document.getElementById("reviewsPanel").hidden = tab.dataset.tab !== "reviews";
    document.getElementById("galleryPanel").hidden = tab.dataset.tab !== "gallery";
  }));
  document.addEventListener("click", async e => {
    const btn = e.target.closest("button[data-action]"); if (!btn) return;
    const id = btn.dataset.id; btn.disabled = true;
    try {
      if (btn.dataset.action === "approve") {
        const { error } = await db.from("reviews").update({ approved:true }).eq("id", id); if (error) throw error; await loadReviews();
      } else if (btn.dataset.action === "delete-review") {
        if (!confirm("Delete this guest review permanently?")) return;
        const { error } = await db.from("reviews").delete().eq("id", id); if (error) throw error; await loadReviews();
      } else if (btn.dataset.action === "delete-gallery") {
        if (!confirm("Remove this photo from the website gallery?")) return;
        const path = btn.dataset.path;
        const { error } = await db.from("gallery").delete().eq("id", id); if (error) throw error;
        if (path) await db.storage.from("gallery").remove([path]);
        await loadGallery();
      }
    } catch (err) { alert(err.message || "Could not complete that action."); btn.disabled = false; }
  });
  document.getElementById("galleryForm").addEventListener("submit", async e => {
    e.preventDefault();
    const title = document.getElementById("galleryTitle").value.trim();
    const category = document.getElementById("galleryCategory").value;
    const file = document.getElementById("galleryFile").files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) { feedback("galleryFeedback", "Please choose JPG, PNG or WebP up to 8 MB."); return; }
    const submit = e.currentTarget.querySelector("button[type=submit]"); submit.disabled = true; feedback("galleryFeedback", "Uploading photograph…");
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await db.storage.from("gallery").upload(path, file, { contentType:file.type, upsert:false });
      if (uploadError) throw uploadError;
      const { data } = db.storage.from("gallery").getPublicUrl(path);
      const { count } = await db.from("gallery").select("id", { count:"exact", head:true });
      const { error } = await db.from("gallery").insert([{ title, category, image_url:data.publicUrl, storage_path:path, visible:true, sort_order:count || 0 }]);
      if (error) throw error;
      e.currentTarget.reset(); feedback("galleryFeedback", "Photo added to the website gallery."); await loadGallery();
    } catch (err) { console.error(err); feedback("galleryFeedback", err.message || "Upload failed. Check storage policies."); }
    finally { submit.disabled = false; }
  });
  db.auth.getSession().then(({ data }) => data.session ? showDashboard(data.session) : null);
  db.auth.onAuthStateChange((_event, session) => { if (session) showDashboard(session); else { dashboardPanel.hidden = true; loginPanel.hidden = false; } });
})();
