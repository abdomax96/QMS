# NCR Tracker — تطبيق تتبع حالات عدم المطابقة (QMS NCR Mobile)

تطبيق Android (Flutter) كعميل محمول لنظام إدارة الجودة QMS الموجود على
الويب (https://qms-dev.pages.dev/ncr). يسجّل ويتتبّع تقارير عدم المطابقة
(Non-Conformance Reports — NCR) باستخدام **نفس** قاعدة بيانات Supabase،
ونفس نظام المصادقة (Auth)، ونفس سياسات الأمان على مستوى الصف (RLS)، ونفس
مراحل سير العمل والصلاحيات لكل دور/مرحلة.

> الواجهة بالكامل عربية مع دعم الاتجاه من اليمين لليسار (RTL)، ومصمّمة
> لبيئة المصنع/الجودة.

---

## 🔐 مبادئ الأمان (مهم جدًا)

- **لا يوجد خادم خلفي (backend) خاص بالتطبيق** ولا أي تعديل على قاعدة البيانات.
- **لا يحتوي التطبيق أبدًا على مفتاح `service_role`.** يُستخدم فقط مفتاح
  `anon` العام، وكل القراءة/الكتابة تتم عبر جلسة المستخدم المُصادَق عليها.
- **لا يتم تجاوز سياسات RLS إطلاقًا.** واجهة المستخدم تُخفي الأزرار بحسب
  الصلاحيات، لكن الضمان النهائي للأمان هو RLS على مستوى قاعدة البيانات.
- **لا توجد أسرار مكتوبة في الكود (no hardcoded secrets).** تُمرَّر القيم
  الحسّاسة عبر `--dart-define` وقت البناء/التشغيل.

> ⚠️ **تحذير:** لا تضع مفتاح `service_role` أو أي مفتاح إداري داخل التطبيق
> أو ملفّات المستودع. تسريب هذا المفتاح يعني تجاوزًا كاملًا لسياسات RLS
> وخطرًا أمنيًا جسيمًا.

---

## ⚙️ متطلبات البيئة

- Flutter `3.35.4` / Dart `3.9.2`
- Android SDK (compileSdk من إعداد Flutter، minSdk = 23)

## 🔑 متغيّرات البيئة

| المتغيّر | الوصف |
| --- | --- |
| `SUPABASE_URL` | عنوان مشروع Supabase (مثال: `https://znbjgihtxpoznqmrealq.supabase.co`) |
| `SUPABASE_ANON_KEY` | مفتاح `anon` العام لمشروع Supabase |

تُمرَّر هذه القيم عبر `--dart-define` ولا تُكتب في الكود.

---

## ▶️ التشغيل (Run)

```bash
flutter pub get

flutter run \
  --dart-define=SUPABASE_URL=https://znbjgihtxpoznqmrealq.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
```

## 📦 بناء APK (Build)

```bash
flutter build apk --release \
  --dart-define=SUPABASE_URL=https://znbjgihtxpoznqmrealq.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
```

سيكون الملف الناتج في:
`build/app/outputs/flutter-apk/app-release.apk`

> ℹ️ **ملاحظة عن مفتاح anon:** نسخة APK المرفقة بُنيت بقيمة مؤقتة
> (`PLACEHOLDER_ANON_KEY`) لمتغيّر `SUPABASE_ANON_KEY`. لإصدار نسخة قابلة
> للاتصال الفعلي بقاعدة البيانات، أعد البناء مع تمرير مفتاح `anon`
> الحقيقي عبر `--dart-define=SUPABASE_ANON_KEY=...`. معرّف الحزمة (Android
> applicationId) هو `com.nctracker.ncr`.

## 🧪 الاختبارات (Tests)

```bash
flutter test
```

تغطّي الاختبارات منطق الأعمال البحت (RPN، نطاقات الخطورة، حُرّاس انتقال
المراحل، حارس الإغلاق، تجميع الصلاحيات، التحليل الآمن لـ JSON).

---

## 🧱 البنية المعمارية (Architecture)

بنية نظيفة قائمة على الميزات (feature-first clean architecture):

```
lib/
├── main.dart                 # تهيئة اللغة + Supabase + ProviderScope
├── app.dart                  # MaterialApp.router + RTL + عربية
├── core/                     # config, supabase, theme, router, errors, utils, widgets
└── features/
    ├── auth/                 # تسجيل الدخول، الملف الشخصي، الجلسة
    ├── company/              # تعدد الشركات (multi-tenancy)
    ├── permissions/          # تحميل الصلاحيات من user_roles + ncr_stage_permissions
    ├── settings/             # البيانات المرجعية (catalog العيوب، الأقسام...)
    └── ncr/                  # النماذج، المستودعات، المزودات، الشاشات، الـ widgets
```

### التقنيات المستخدمة
`supabase_flutter` · `flutter_riverpod` · `go_router` ·
`flutter_secure_storage` · `shared_preferences` · `intl` ·
`flutter_localizations` · `image_picker` · `file_picker` ·
`connectivity_plus` · `url_launcher`

---

## 🔄 ملخّص سير العمل (Workflow)

خمس مراحل متسلسلة لكل تقرير NCR:

1. **`initial_report`** — التقرير المبدئي وتسجيل الكمية المحجوزة.
2. **`root_cause_analysis`** — تحليل السبب الجذري واقتراحه ومراجعته
   (موافقة/رفض).
3. **`capa_planning`** — تخطيط الإجراءات التصحيحية/الوقائية (CAPA).
4. **`capa_execution`** — تنفيذ إجراءات CAPA وتحديث حالتها.
5. **`verification_closure`** — التحقّق والإغلاق.

### قواعد أساسية محصّنة في الكود
- **حساب RPN** = (وزن الخطورة) × التكرار × الاكتشاف، مع تصنيف نطاق الخطر
  (حرج / مرتفع / متوسط / منخفض).
- **لا يمكن إغلاق التقرير** إذا كانت **الكمية المحجوزة المتبقية > 0**، أو
  إذا لم يكن التحقّق ناجحًا.
- الانتقال بين المراحل محكوم بحُرّاس بيانات لكل مرحلة + صلاحيات المستخدم.
- **الصلاحيات غير ثابتة في الكود (not hardcoded):** تُحمَّل من
  `user_roles` ثم تُجمَّع من `ncr_stage_permissions` لكل `stage_code`
  (اتحاد `allowed_actions` و OR لـ `can_advance`/`can_return`).

## 📴 الوضع دون اتصال (Offline)

- يدعم **مسوّدات إنشاء NCR فقط** (تُحفظ محليًا عبر `shared_preferences`
  وتُزامَن عند عودة الاتصال).
- جميع إجراءات سير العمل (الموافقات، الانتقالات، CAPA، الإغلاق) **تتطلّب
  اتصالًا بالإنترنت** لضمان احترام RLS وسلامة البيانات.

---

## 📎 المرفقات والتعليقات
- رفع المرفقات إلى Supabase Storage (bucket: `ncr-attachments`) عبر
  الكاميرا/المعرض/منتقي الملفات، وفتحها عبر روابط موقّعة.
- التعليقات على التقارير بزمن حقيقي (Realtime) على جدول `ncr_comments`.
