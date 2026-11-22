# دليل نقل K-tours إلى قاعدة بيانات Render الداخلية

## النتيجة المطلوبة

بدل Static Site + Supabase، النسخة الجديدة تعمل بهذا الشكل:

1. GitHub لحفظ الكود.
2. Render Web Service لتشغيل الموقع والـAPI ولوحة الإدارة.
3. Render PostgreSQL لحفظ التقييمات وبيانات الصور وجلسات المدير.
4. Render Persistent Disk لحفظ ملفات الصور المرفوعة بصورة دائمة.

قاعدة البيانات ليست ملفًا داخل كود الموقع؛ هي خدمة PostgreSQL مُدارة داخل Render. يتصل بها التطبيق من خلال عنوان Internal URL على الشبكة الخاصة في Render، وقائمة السماح في ملف `render.yaml` مقفولة على الاتصالات الداخلية فقط.

## قبل البدء

- لا تحذف الموقع القديم أو مشروع Supabase الآن.
- احتفظ بنسخة احتياطية من أي تقييمات أو صور موجودة بالفعل في Supabase.
- ارفع محتويات مجلد `k-tours-site` إلى جذر GitHub repository، وتأكد أن `render.yaml` و`package.json` في جذر المستودع، وملفات الواجهة داخل مجلد `public/`.

## 1) تجهيز الخدمة الحالية ثم إنشاء الخدمات الجديدة

قبل رفع الملفات الجديدة إلى نفس مستودع GitHub:

1. افتح خدمة Static Site القديمة في Render.
2. من Settings / Build & Deploy أوقف Auto-Deploy مؤقتًا. لا تحذف الخدمة؛ اترك النسخة الحالية تعمل أثناء الاختبار.
3. بعد التأكد أن النسخة الجديدة تعمل، يمكنك تحويل الدومين المخصص للخدمة الجديدة، أو مشاركة رابط الخدمة الجديدة أولًا.

## 2) إنشاء الخدمات من Blueprint

1. افتح https://dashboard.render.com/.
2. اختر **New +** ثم **Blueprint**.
3. اربط GitHub واختر مستودع K-tours.
4. سيقرأ Render ملف `render.yaml`.
5. راجع الموارد قبل الموافقة:
   - `k-tours-fullstack`: Node.js Web Service.
   - `k-tours-db`: Render PostgreSQL.
   - قرص دائم حجمه 1GB ومساره `/var/data`.
6. وافق على إنشاء الموارد ومزامنة Blueprint.

> مهم: لا يغيّر Blueprint الخدمة القديمة من Static Site إلى Node.js. سيُنشئ خدمة جديدة اسمها `k-tours-fullstack` حتى تستطيع اختبارها قبل تحويل الزوار إليها.

## 3) ضبط بيانات المدير

1. افتح خدمة `k-tours-fullstack` في Render.
2. افتح **Environment**.
3. أضف أو عدّل:
   - `ADMIN_USERNAME`: اسم الدخول الذي تختاره، مثل `admin`.
   - `ADMIN_PASSWORD`: كلمة مرور قوية وفريدة، 10 أحرف على الأقل.
4. تأكد أن `SESSION_SECRET` تم توليده تلقائيًا من Blueprint. لا تضعه في GitHub.
5. اضغط **Save and deploy**.

لتغيير اسم المستخدم أو كلمة المرور فيما بعد، عدّل المتغير المناسب في Environment ثم احفظ وأعد النشر. لا تعدّل `admin.js` أو `config.js` لتغيير بيانات الدخول.

## 4) التأكد من قاعدة البيانات

ملف Blueprint ينشئ Postgres في Frankfurt ويضبط `ipAllowList: []` لمنع الوصول من الإنترنت العام. كما يربط متغير `DATABASE_URL` بعنوان قاعدة البيانات الداخلي تلقائيًا.

بعد اكتمال النشر افتح رابط الموقع ثم:

`https://YOUR-SERVICE.onrender.com/api/health`

النتيجة المتوقعة:

```json
{"ok":true,"database":"connected"}
```

عند بدء تشغيل التطبيق، ينشئ `server.js` جداول `reviews` و`gallery` وجداول الجلسات تلقائيًا.

## 5) اختبارات التشغيل

1. افتح `https://YOUR-SERVICE.onrender.com/` وتأكد أن الصفحة الرئيسية تظهر.
2. افتح `https://YOUR-SERVICE.onrender.com/admin.html`.
3. سجّل الدخول ببيانات `ADMIN_USERNAME` و`ADMIN_PASSWORD` من Render.
4. أرسل تقييمًا تجريبيًا من الموقع العام.
5. افتح لوحة الإدارة، ثم وافق على التقييم.
6. ارجع للموقع العام وتأكد من ظهور التقييم بعد الموافقة.
7. من تبويب Photo Gallery ارفع صورة تجريبية.
8. حدّث الصفحة ثم أعد تشغيل الخدمة/أعد نشرها وتأكد أن الصورة ما زالت موجودة.

## 6) أين تُحفظ البيانات؟

| العنصر | مكان الحفظ |
|---|---|
| تقييمات الزوار وحالة الموافقة | Render PostgreSQL |
| بيانات صور المعرض | Render PostgreSQL |
| جلسة دخول المدير | Render PostgreSQL |
| ملفات الصور نفسها | Persistent Disk على Render في `/var/data/uploads` |
| ملفات الموقع | GitHub ثم نسخة النشر على Render |

لا تحذف القرص الدائم ولا تنقله قبل أخذ نسخة من الصور. نسخة قاعدة البيانات وحدها لا تشمل ملفات الصور على القرص.

## 7) تكلفة واستمرارية الخدمة

- الخطة المجانية لقاعدة Render Postgres تنتهي بعد 30 يومًا؛ النسخة الافتراضية تستخدم خطة مدفوعة حتى لا تتوقف قاعدة البيانات بعد 30 يومًا.
- القرص الدائم يتطلب Web Service مدفوعة. نظام الملفات العادي في خدمات Render مؤقت وتضيع تغييراته عند إعادة النشر أو إعادة التشغيل.
- وجود قرص دائم يعني تشغيل نسخة واحدة من الخدمة، وهو مناسب لحجم الموقع الحالي.
- راجع صفحة الأسعار في Render قبل الموافقة؛ التكلفة النهائية تتغير حسب الخطة والمنطقة والتخزين والضرائب.

## 8) ماذا عن البيانات القديمة في Supabase؟

التحويل البرمجي يجهز قاعدة Render جديدة ولا ينسخ بيانات Supabase السابقة تلقائيًا. احتفظ بمشروع Supabase كما هو حتى تتأكد إن لم تكن هناك تقييمات أو صور تريد الاحتفاظ بها. لو توجد بيانات فعلية، صدّرها ثم انقل السجلات والملفات إلى Render قبل إيقاف Supabase.

## 9) حل المشكلات الشائعة

- **`DATABASE_URL is missing`:** تأكد أن Blueprint ربط `DATABASE_URL` من `k-tours-db` بخدمة `k-tours-fullstack`.
- **`database unavailable`:** تأكد أن خدمة الويب وقاعدة البيانات في نفس المنطقة، وأن Internal URL مستخدم.
- **`ADMIN_PASSWORD` missing:** أضف المتغير في Environment ولا تضعه في ملفات الموقع.
- **الصورة تختفي بعد النشر:** تأكد أن القرص موجود ومسار Mount Path هو `/var/data` وأن `UPLOAD_DIR=/var/data/uploads`.
- **الدخول يرجع 401:** راجع `ADMIN_USERNAME` و`ADMIN_PASSWORD` في إعدادات خدمة الويب ثم احفظ وأعد النشر.
- **صفحة الإدارة تعمل لكن التقييمات لا تظهر:** افحص `/api/health` ثم افتح Logs في Web Service.

## مراجع Render الرسمية

- https://render.com/docs/postgresql-creating-connecting
- https://render.com/tutorials/postgres-on-render/connection-strings
- https://render.com/docs/disks
- https://render.com/docs/free
- https://render.com/docs/blueprint-spec
