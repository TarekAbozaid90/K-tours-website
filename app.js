(() => {
  const cfg = window.KTOURS_CONFIG || {};
  const waNumber = cfg.WHATSAPP_NUMBER || "201009494068";
  const translations = {
    en: {
      announcement:"Private guided experiences across Egypt · English & Chinese",navAbout:"About",navExperiences:"Experiences",navPlaces:"Destinations",navGallery:"Gallery",navReviews:"Reviews",navContact:"Contact",navCta:"Plan your trip",
      heroEyebrow:"PRIVATE GUIDED EXPERIENCES · EGYPT",heroTitle:"Egypt is more than a destination.<br><em>It's a story waiting to be told.</em>",heroText:"Discover the places, people and stories behind Egypt's extraordinary heritage with Mohamed Kataif — your local guide to a more meaningful journey.",heroPrimary:"Plan your private tour",heroSecondary:"Explore experiences",trustYears:"Years of experience",trustLanguages:"Languages: English & Chinese",trustPrivate:"Personal attention",heroSide:"HISTORY · CULTURE · CONNECTION",scroll:"SCROLL TO DISCOVER",stripLabel:"THE K-TOURS APPROACH",stripText:"Go beyond the guidebook. Explore Egypt through its layers of history, living traditions and the stories that connect them.",
      aboutEyebrow:"MEET YOUR GUIDE",aboutTitle:"The story matters<br>as much as the <em>place.</em>",aboutLead:"I'm Mohamed Saeed Kataif, known as Mohamed Kataif. I help visitors from around the world experience Egypt with context, care and genuine local insight.",aboutBody:"With a degree in Tour Guiding from Helwan University and more than a decade in tourism, I bring Egypt's Pharaonic, Islamic, Coptic and cultural heritage to life — at a pace that feels right for you.",aboutCaption:"A PERSONAL CONNECTION TO EGYPT",credentialEducation:"Tour Guiding Graduate",credentialEducationSub:"Faculty of Tourism & Hotels Management · Helwan University",credentialExperience:"Experienced Tour Guide & Interpreter",credentialExperienceSub:"Private tours, international guests and VIP / diplomatic clients",credentialLanguages:"English & Chinese",credentialLanguagesSub:"Professional communication for international visitors",aboutLink:"Let's plan your Egypt story",
      experienceEyebrow:"SEE EGYPT YOUR WAY",experienceTitle:"Choose the journey.<br><em>I'll bring the stories.</em>",experienceIntro:"From world-famous monuments to quiet corners full of character, shape a day around what fascinates you.",expAncient:"Ancient Egypt",expAncientText:"Pyramids, temples, tombs and the world of the pharaohs.",expIslamic:"Islamic Cairo",expIslamicText:"Mosques, medieval streets and the art of old Cairo.",expCoptic:"Coptic Cairo",expCopticText:"Churches, sacred landmarks and centuries of faith.",expMuseums:"Museums & collections",expMuseumsText:"Discover the objects and details that make history tangible.",expCulture:"Culture & the Nile",expCultureText:"Local life, traditional crafts, river scenes and regional stories.",expNature:"Red Sea & nature",expNatureText:"Coastal escapes, desert landscapes, mountains and oasis life.",
      placesEyebrow:"PLACES THAT STAY WITH YOU",placesTitle:"A country of many<br><em>worlds to discover.</em>",placesIntro:"Explore a few of the journeys we can build together. Every itinerary is flexible and can be tailored to your interests, time and travel style.",tagAncient:"ANCIENT WONDERS",tagPharaohs:"LAND OF THE PHARAOHS",tagIslamic:"ISLAMIC HERITAGE",tagCoptic:"COPTIC HERITAGE",tagMuseums:"MUSEUMS & ART",tagCulture:"CULTURE & NATURE",tagNature:"NATURE & ADVENTURE",tagOasis:"WESTERN DESERT",placeOasis:"Siwa & Western Desert",placeOasisText:"Salt lakes, palm groves, desert landscapes and oasis traditions.",placeGiza:"Giza & Saqqara",placeGizaText:"The pyramids, the Sphinx and the origins of monumental Egypt.",placeLuxor:"Luxor & Aswan",placeLuxorText:"Monumental temples, royal tombs and the timeless Nile.",placeIslamic:"Historic Cairo",placeIslamicText:"Al-Muizz Street, great mosques, markets and old-city lanes.",placeCoptic:"Coptic Cairo",placeCopticText:"A remarkable district of churches, history and heritage.",placeMuseums:"Museums of Egypt",placeMuseumsText:"From the Grand Egyptian Museum to regional collections.",placeCulture:"Alexandria & beyond",placeCultureText:"Mediterranean stories, Nubian traditions and more.",placeNature:"Red Sea & Sinai",placeNatureText:"Coral coastlines, sea life, desert scenery and mountain landscapes.",officialLabel:"OFFICIAL EGYPT TRAVEL & HERITAGE RESOURCES",placesFootnote:"These are starting points, not fixed packages. Tell me what interests you and we'll shape the route together.",quote:"The best way to understand a place is to listen to the stories it has been carrying for centuries.",
      galleryEyebrow:"A VISUAL JOURNEY",galleryTitle:"Moments from<br><em>the journey.</em>",galleryIntro:"A real glimpse of Egypt and the people who explored it with K-tours. More guest photographs can be added from the private dashboard.",galleryNote:"REAL PLACES · REAL GUEST MOMENTS",galleryCaption1:"Historic Cairo",galleryCaption2:"Coptic Heritage",galleryCaption3:"Philae Temple · Aswan",galleryCaption4:"Saqqara · Ancient Egypt",galleryCaption5:"Guests & Memories · Giza",galleryAdminHint:"Once the site is connected to its gallery dashboard, you can add, organize and remove photos without editing the website code.",
      reviewsEyebrow:"GUEST EXPERIENCES",reviewsTitle:"Your story is part<br>of <em>my journey.</em>",reviewsIntro:"Have you explored Egypt with me? Share a few words about your experience. You can also add photographs from your trip.",reviewTrustText:"Every review is checked before it appears publicly.",reviewsEmptyTitle:"Be the first to share your experience.",reviewsEmptyText:"Guest reviews will appear here after approval.",reviewFormEyebrow:"LEAVE A REVIEW",requiredFields:"* Required fields",labelName:"Your name *",labelCountry:"Country",labelRating:"Your rating *",labelReview:"Your experience *",labelPhotos:"Add photos (optional)",photosHint:"Up to 3 images · JPG, PNG or WebP · 5 MB each",submitReview:"Submit your review",reviewPrivacy:"Your review is submitted for moderation. It will only be visible on the website after approval.",reviewConsent:"I agree that my review and selected photos may be published on this website.",
      contactEyebrow:"LET'S MAKE IT PERSONAL",contactTitle:"Your Egypt story<br><em>starts with a conversation.</em>",contactIntro:"Tell me when you're visiting, what you'd love to discover and how you like to travel. We'll take it from there.",contactName:"Your name",contactDate:"Travel date / period",contactInterests:"What would you like to explore?",contactLanguage:"Preferred language",contactMessage:"A little more about your plans",contactSubmit:"Send your enquiry on WhatsApp",contactLocation:"Cairo, Egypt",footerText:"Discover Egypt with curiosity. Leave with stories.",footerMade:"Made for meaningful journeys through Egypt.",backTop:"Back to top ↑",
      localSaved:"Saved in this browser preview only. Connect Supabase to receive public submissions.",sentForApproval:"Thank you! Your review has been sent for approval.",ratingRequired:"Please choose a star rating.",reviewError:"Something went wrong. Please try again or contact me on WhatsApp.",photosLimit:"Please choose no more than 3 photos, up to 5 MB each.",photoType:"Please upload JPG, PNG or WebP images only.",
    },
    ar: {
      announcement:"رحلات خاصة في أنحاء مصر · الإنجليزية والصينية",navAbout:"عنّي",navExperiences:"التجارب",navPlaces:"الوجهات",navGallery:"معرض الصور",navReviews:"آراء العملاء",navContact:"تواصل معي",navCta:"خطط رحلتك",
      heroEyebrow:"جولات سياحية خاصة · مصر",heroTitle:"مصر مش مجرد وجهة سياحية.<br><em>دي حكاية تستاهل تتعاش.</em>",heroText:"اكتشف الأماكن والناس والحكايات اللي ورا تراث مصر الاستثنائي مع محمد كتيف — مرشدك المحلي لتجربة أعمق وأقرب لروح البلد.",heroPrimary:"خطط لجولتك الخاصة",heroSecondary:"اكتشف التجارب",trustYears:"سنوات من الخبرة",trustLanguages:"اللغات: الإنجليزية والصينية",trustPrivate:"اهتمام شخصي",heroSide:"تاريخ · ثقافة · تواصل",scroll:"انزل واكتشف",stripLabel:"أسلوب K-TOURS",stripText:"خلّي تجربتك أبعد من الكتب والأدلة السياحية. اكتشف طبقات التاريخ والتقاليد الحية والحكايات اللي بتربطهم ببعض.",
      aboutEyebrow:"تعرّف على مرشدك",aboutTitle:"الحكاية مهمة<br>زي <em>المكان بالظبط.</em>",aboutLead:"أنا محمد سعيد كتيف، المعروف باسم محمد كتيف. بساعد الزوار من كل أنحاء العالم يكتشفوا مصر بفهم واهتمام ومعرفة حقيقية من قلب البلد.",aboutBody:"معايا بكالوريوس إرشاد سياحي من جامعة حلوان وخبرة أكتر من عشر سنين في مجال السياحة، وبقدّم التراث الفرعوني والإسلامي والقبطي والثقافي بطريقة تناسب اهتماماتك وإيقاع رحلتك.",aboutCaption:"علاقة شخصية بتاريخ مصر",credentialEducation:"خريج إرشاد سياحي",credentialEducationSub:"كلية السياحة وإدارة الفنادق · جامعة حلوان",credentialExperience:"مرشد سياحي ومترجم بخبرة",credentialExperienceSub:"جولات خاصة، زوار من جنسيات مختلفة وعملاء VIP ودبلوماسيون",credentialLanguages:"الإنجليزية والصينية",credentialLanguagesSub:"تواصل مهني مع الزوار من مختلف أنحاء العالم",aboutLink:"يلا نخطط حكايتك في مصر",
      experienceEyebrow:"اكتشف مصر بطريقتك",experienceTitle:"اختار الرحلة.<br><em>وأنا أحكيلك الحكاية.</em>",experienceIntro:"من أشهر المعالم الأثرية لحد الأماكن الهادية المليانة تفاصيل، نقدر نصمم يوم على حسب الحاجات اللي تهمك.",expAncient:"مصر القديمة",expAncientText:"الأهرامات والمعابد والمقابر وعالم الفراعنة.",expIslamic:"القاهرة الإسلامية",expIslamicText:"المساجد والشوارع التاريخية وفنون القاهرة القديمة.",expCoptic:"القاهرة القبطية",expCopticText:"الكنائس والمعالم الروحية وحكايات قرون من التاريخ.",expMuseums:"المتاحف والمقتنيات",expMuseumsText:"اكتشف القطع والتفاصيل اللي بتخلّي التاريخ ملموس.",expCulture:"الثقافة والنيل",expCultureText:"الحياة المحلية والحرف التقليدية ومشاهد النيل وحكايات الأقاليم.",expNature:"البحر الأحمر والطبيعة",expNatureText:"شواطئ مميزة وصحاري وجبال وواحات مصر.",
      placesEyebrow:"أماكن بتفضل في الذاكرة",placesTitle:"بلد مليانة عوالم<br><em>مختلفة تستكشفها.</em>",placesIntro:"دي مجموعة من الرحلات اللي نقدر نبنيها سوا. كل برنامج مرن وممكن يتظبط حسب اهتماماتك ووقتك وطريقة سفرك.",tagAncient:"عجائب العالم القديم",tagPharaohs:"أرض الفراعنة",tagIslamic:"التراث الإسلامي",tagCoptic:"التراث القبطي",tagMuseums:"متاحف وفنون",tagCulture:"ثقافة وطبيعة",tagNature:"طبيعة ومغامرات",tagOasis:"الصحراء الغربية",placeOasis:"واحة سيوة والصحراء الغربية",placeOasisText:"بحيرات الملح وبساتين النخيل والمناظر الصحراوية وتقاليد الواحات.",placeGiza:"الجيزة وسقارة",placeGizaText:"الأهرامات وأبو الهول وبدايات العمارة المصرية الضخمة.",placeLuxor:"الأقصر وأسوان",placeLuxorText:"معابد عظيمة ومقابر ملوك والنيل الخالد.",placeIslamic:"القاهرة التاريخية",placeIslamicText:"شارع المعز والمساجد الكبيرة والأسواق والحارات القديمة.",placeCoptic:"القاهرة القبطية",placeCopticText:"منطقة مميزة من الكنائس والتاريخ والتراث.",placeMuseums:"متاحف مصر",placeMuseumsText:"من المتحف المصري الكبير لمجموعات المتاحف في المحافظات.",placeCulture:"الإسكندرية وما حولها",placeCultureText:"حكايات البحر المتوسط والتقاليد النوبية وتجارب تانية كتير.",placeNature:"البحر الأحمر وسيناء والواحات",placeNatureText:"شواطئ وشعاب مرجانية وصحاري وجبال وثقافة الواحات.",officialLabel:"مصادر رسمية للسياحة والتراث في مصر",placesFootnote:"دي مجرد نقاط بداية مش برامج ثابتة. احكيلي إيه اللي يهمك ونصمم خط السير سوا.",quote:"أحسن طريقة تفهم بيها المكان إنك تسمع الحكايات اللي شايلها من مئات السنين.",
      galleryEyebrow:"رحلة بالصور",galleryTitle:"لحظات من<br><em>رحلتك في مصر.</em>",galleryIntro:"دي لمحات حقيقية من مصر ومن الضيوف اللي عاشوا التجربة مع K-tours. وتقدر تضيف صور جديدة من لوحة الإدارة.",galleryNote:"أماكن حقيقية · ذكريات حقيقية",galleryCaption1:"القاهرة التاريخية",galleryCaption2:"التراث القبطي",galleryCaption3:"معبد فيلة · أسوان",galleryCaption4:"سقارة · مصر القديمة",galleryCaption5:"ضيوف وذكريات · الجيزة",galleryAdminHint:"بعد ربط الموقع بلوحة إدارة المعرض، هتقدر تضيف الصور وترتبها وتحذفها من غير ما تعدّل كود الموقع.",
      reviewsEyebrow:"تجارب الزوار",reviewsTitle:"حكايتك جزء<br>من <em>رحلتي.</em>",reviewsIntro:"هل زرت مصر معايا؟ شاركنا رأيك في التجربة. وتقدر كمان تضيف صور من رحلتك.",reviewTrustText:"كل التقييمات بتتراجع قبل ظهورها للعامة.",reviewsEmptyTitle:"كن أول من يشارك تجربته.",reviewsEmptyText:"آراء العملاء هتظهر هنا بعد الموافقة عليها.",reviewFormEyebrow:"اكتب تقييمك",requiredFields:"* خانات مطلوبة",labelName:"اسمك *",labelCountry:"البلد",labelRating:"تقييمك *",labelReview:"احكيلنا عن تجربتك *",labelPhotos:"أضف صور (اختياري)",photosHint:"حتى 3 صور · JPG أو PNG أو WebP · بحد أقصى 5 ميجا للصورة",submitReview:"إرسال التقييم",reviewPrivacy:"تقييمك هيتبعت للمراجعة، ومش هيظهر على الموقع إلا بعد الموافقة عليه.",reviewConsent:"أوافق على نشر تقييمي والصور اللي اخترت إضافتها على الموقع.",
      contactEyebrow:"خلّي الرحلة على مزاجك",contactTitle:"حكايتك في مصر<br><em>بتبدأ بمحادثة.</em>",contactIntro:"قولّي هتزور مصر إمتى، وإيه الأماكن اللي نفسك تكتشفها، وبتحب تسافر إزاي. ومن هنا نبدأ نرتب التفاصيل.",contactName:"اسمك",contactDate:"ميعاد أو فترة الزيارة",contactInterests:"تحب تستكشف إيه؟",contactLanguage:"اللغة المفضلة",contactMessage:"تفاصيل أكتر عن خططك",contactSubmit:"ابعت استفسارك على واتساب",contactLocation:"القاهرة، مصر",footerText:"اكتشف مصر بفضول، وارجع منها بحكايات.",footerMade:"رحلات بمعنى وتجارب حقيقية في مصر.",backTop:"العودة للأعلى ↑",
      localSaved:"تم الحفظ في معاينة المتصفح دي فقط. اربط Supabase لاستقبال التقييمات على الموقع الفعلي.",sentForApproval:"شكرًا ليك! تم إرسال تقييمك للمراجعة.",ratingRequired:"من فضلك اختار عدد النجوم.",reviewError:"حصلت مشكلة. حاول تاني أو تواصل معايا على واتساب.",photosLimit:"من فضلك اختار 3 صور بحد أقصى، وكل صورة 5 ميجا أو أقل.",photoType:"ارفع صور JPG أو PNG أو WebP فقط."
    }
  };

  let lang = localStorage.getItem("ktours-lang") || "en";
  const applyLanguage = (next) => {
    lang = next;
    localStorage.setItem("ktours-lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.body.classList.toggle("lang-ar", lang === "ar");
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      if (translations[lang][key]) el.innerHTML = translations[lang][key];
    });
    document.querySelectorAll(".lang-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.lang === lang));
  };
  document.querySelectorAll(".lang-btn").forEach(btn => btn.addEventListener("click", () => applyLanguage(btn.dataset.lang)));
  applyLanguage(lang);
  document.getElementById("year").textContent = new Date().getFullYear();

  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");
  navToggle?.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  mainNav?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    mainNav.classList.remove("open"); navToggle?.setAttribute("aria-expanded", "false");
  }));

  const hasSupabase = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase?.createClient);
  const db = hasSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const galleryGrid = document.getElementById("galleryGrid");
  const reviewsList = document.getElementById("reviewsList");
  const reviewForm = document.getElementById("reviewForm");
  const reviewFeedback = document.getElementById("reviewFeedback");
  const selectedFilesInput = document.getElementById("reviewPhotos");
  let chosenRating = 0;
  let selectedFiles = [];

  const safeText = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const dateLabel = value => {
    try { return new Date(value).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { year:"numeric", month:"short" }); }
    catch { return ""; }
  };
  const renderReviews = (items) => {
    if (!items?.length) return;
    reviewsList.innerHTML = items.map(item => `
      <article class="review-item">
        <div class="review-item-head"><strong>${safeText(item.name)}</strong><span class="stars">${"★".repeat(Number(item.rating) || 0)}${"☆".repeat(5-(Number(item.rating)||0))}</span></div>
        <p>${safeText(item.message)}</p>
        <small>${safeText(item.country || "")} ${item.created_at ? "· " + dateLabel(item.created_at) : ""}</small>
        ${(item.photo_urls || []).length ? `<div class="review-item-photos">${item.photo_urls.map(url => `<img src="${safeText(url)}" alt="Guest trip photograph" loading="lazy">`).join("")}</div>` : ""}
      </article>`).join("");
  };
  const renderGallery = (items) => {
    // Keep the four curated launch photographs visible; append owner-approved uploads.
    if (!items?.length) return;
    const uploaded = items.map((item, i) => `
      <figure class="gallery-tile">
        <img src="${safeText(item.image_url)}" alt="${safeText(item.title || "K-tours gallery photograph")}" loading="lazy" decoding="async">
        <figcaption><span>${safeText(item.title || "K-tours journey")}</span><small>${String(i+5).padStart(2,"0")}</small></figcaption>
      </figure>`).join("");
    galleryGrid.insertAdjacentHTML("beforeend", uploaded);
  };
  const loadPublicContent = async () => {
    if (!db) {
      try { const local = JSON.parse(localStorage.getItem("ktours_demo_reviews") || "[]"); renderReviews(local); } catch {}
      return;
    }
    const [reviews, gallery] = await Promise.all([
      db.from("reviews").select("id,name,country,rating,message,photo_urls,created_at").eq("approved", true).order("created_at", { ascending:false }).limit(8),
      db.from("gallery").select("id,title,category,image_url,created_at").eq("visible", true).order("sort_order", { ascending:true }).limit(8)
    ]);
    if (!reviews.error) renderReviews(reviews.data);
    if (!gallery.error) renderGallery(gallery.data);
  };
  loadPublicContent();

  document.querySelectorAll(".rating-picker button").forEach(btn => btn.addEventListener("click", () => {
    chosenRating = Number(btn.dataset.rating);
    document.getElementById("reviewRating").value = chosenRating;
    document.querySelectorAll(".rating-picker button").forEach(star => {
      const active = Number(star.dataset.rating) <= chosenRating;
      star.classList.toggle("selected", active);
      star.textContent = active ? "★" : "☆";
      star.setAttribute("aria-checked", String(Number(star.dataset.rating) === chosenRating));
    });
  }));

  selectedFilesInput.addEventListener("change", () => {
    const files = [...selectedFilesInput.files];
    if (files.length > 3 || files.some(f => f.size > 5 * 1024 * 1024)) {
      reviewFeedback.textContent = translations[lang].photosLimit;
      selectedFilesInput.value = ""; selectedFiles = []; document.getElementById("photoPreviews").innerHTML = ""; return;
    }
    if (files.some(f => !["image/jpeg","image/png","image/webp"].includes(f.type))) {
      reviewFeedback.textContent = translations[lang].photoType;
      selectedFilesInput.value = ""; selectedFiles = []; document.getElementById("photoPreviews").innerHTML = ""; return;
    }
    selectedFiles = files;
    document.getElementById("photoPreviews").innerHTML = "";
    files.forEach(file => {
      const img = document.createElement("img"); img.alt = "Selected guest photo preview";
      const reader = new FileReader(); reader.onload = e => img.src = e.target.result; reader.readAsDataURL(file);
      document.getElementById("photoPreviews").appendChild(img);
    });
    reviewFeedback.textContent = "";
  });

  const uploadReviewPhotos = async files => {
    const urls = [];
    for (const file of files) {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from("tour-reviews").upload(path, file, { contentType:file.type, upsert:false });
      if (error) throw error;
      const { data } = db.storage.from("tour-reviews").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };
  reviewForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (!chosenRating) { reviewFeedback.textContent = translations[lang].ratingRequired; return; }
    const formData = new FormData(reviewForm);
    const entry = { name:String(formData.get("name")).trim(), country:String(formData.get("country") || "").trim(), rating:chosenRating, message:String(formData.get("message")).trim() };
    const submit = reviewForm.querySelector("button[type=submit]");
    submit.disabled = true; submit.style.opacity = ".6";
    reviewFeedback.textContent = "";
    try {
      if (db) {
        const photo_urls = await uploadReviewPhotos(selectedFiles);
        const { error } = await db.from("reviews").insert([{ ...entry, photo_urls, approved:false }]);
        if (error) throw error;
        reviewFeedback.textContent = translations[lang].sentForApproval;
      } else {
        const local = JSON.parse(localStorage.getItem("ktours_demo_reviews") || "[]");
        local.unshift({ ...entry, photo_urls:[], created_at:new Date().toISOString(), demo:true });
        localStorage.setItem("ktours_demo_reviews", JSON.stringify(local.slice(0,8)));
        renderReviews(local.slice(0,8));
        reviewFeedback.textContent = translations[lang].localSaved;
      }
      reviewForm.reset(); chosenRating = 0; selectedFiles = [];
      document.querySelectorAll(".rating-picker button").forEach(star => { star.textContent="☆"; star.classList.remove("selected"); });
      document.getElementById("photoPreviews").innerHTML = "";
    } catch (err) {
      console.error(err); reviewFeedback.textContent = translations[lang].reviewError;
    } finally { submit.disabled = false; submit.style.opacity = "1"; }
  });

  document.getElementById("contactForm").addEventListener("submit", e => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const msg = [
      "Hello Mohamed, I'd like to plan a tour with K-tours.",
      `Name: ${d.get("name")}`,
      `Travel date / period: ${d.get("date") || "Flexible"}`,
      `Interests: ${d.get("interests")}`,
      `Preferred language: ${d.get("language")}`,
      `More details: ${d.get("message") || "Not specified"}`
    ].join("\n");
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  });
})();
