# نشر QMS (Dev + Prod) بخطة مجانية وعملية

## 1) ملخص التقنيات (حسب ملفات المشروع)

- **Frontend**: React + Vite + TypeScript + Tailwind.
- **Backend/Database**: لا يوجد كود Backend داخل المستودع. التطبيق يتواصل مباشرة مع **Supabase** عبر `@supabase/supabase-js` و REST و RPC (Postgres Functions).
- **Build requirement**: Vite (الإصدار الموجود بالمشروع) يحتاج Node حديث. الملف `.node-version` يثبت نسخة مناسبة للبناء.

## 2) الحل المقترح (مجاني وسهل الصيانة)

### Frontend (Static Hosting)
- **Cloudflare Pages** (مجاني): يستضيف ناتج `vite build` من مجلد `dist` على CDN.

### Backend + Database + Auth + Storage
- **Supabase**: مشروعين منفصلين `dev` و `prod`.

> ملاحظة: على خطة Supabase المجانية قد يتم إيقاف المشاريع قليلة النشاط. كـ Production حقيقي قد تحتاج لاحقاً للترقية حسب الاستخدام.

## 3) إعداد بيئتين منفصلتين (Development / Production)

### 3.1 إنشاء Supabase Projects (Dev/Prod)
1. أنشئ مشروعين:
   - `qms-dev`
   - `qms-prod`
2. من كل مشروع خذ:
   - `Project URL`
   - `anon public key`
3. (لتحكم الوصول) عطّل التسجيل المفتوح في Production إن كنت تريد المستخدمين "بالدعوة فقط".

### 3.2 نقل قاعدة البيانات من Dev إلى Prod (أفضل ممارسة)
الطريقة العملية هي اعتماد **migrations** (ملفات SQL) داخل Git:
1. على جهازك (أو CI) اربط Supabase CLI بمشروع dev.
2. اسحب Schema الحالية إلى migrations:
   - `supabase db pull`
3. طبّق نفس migrations على `qms-prod`:
   - `supabase link --project-ref ...`
   - `supabase db push`

إذا كان لديك مجلد `supabase/` (كان موجوداً بالمشروع سابقاً بحسب git history) فالأفضل استرجاعه لأنه يسهل تشغيل نفس الـ schema على dev/prod بدون نسخ يدوي.

### 3.3 إعداد Cloudflare Pages لمشروعين (Dev/Prod)
الخيار الأسهل للحصول على رابط ثابت لكل بيئة:
1. أنشئ مشروع Cloudflare Pages باسم `qms-dev` مربوط بفرع `develop`.
2. أنشئ مشروع Cloudflare Pages باسم `qms-prod` مربوط بفرع `main`.
3. إعدادات البناء لكليهما:
   - Build command: `npm ci && npm run build`
   - Build output directory: `dist`
   - Node version: استخدم `.node-version` أو اضبط `NODE_VERSION` في إعدادات Pages
4. متغيرات البيئة (Environment Variables):
   - في `qms-dev`:
     - `VITE_SUPABASE_URL` = URL الخاص بـ `qms-dev`
     - `VITE_SUPABASE_ANON_KEY` = anon key الخاص بـ `qms-dev`
   - في `qms-prod`:
     - `VITE_SUPABASE_URL` = URL الخاص بـ `qms-prod`
     - `VITE_SUPABASE_ANON_KEY` = anon key الخاص بـ `qms-prod`

ملاحظة SPA: أضفنا `public/_redirects` حتى تعمل روابط React Router عند عمل refresh على مسارات داخلية.

بديل أسهل إذا لم تستطع ربط GitHub من داخل Cloudflare:
- استخدم GitHub Actions للنشر إلى Cloudflare Pages (بدون ربط repo داخل Cloudflare UI).
- Workflows جاهزة:
  - `.github/workflows/cloudflare-pages-dev.yml` (ينشر تلقائياً عند push على `develop` إلى مشروع Pages اسمه `qms-dev`)
  - `.github/workflows/cloudflare-pages-prod.yml` (ينشر عند push على `main` أو يدوياً عبر `workflow_dispatch` إلى مشروع Pages اسمه `qms-prod`)
- تحتاج GitHub Secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `VITE_SUPABASE_URL_DEV`
  - `VITE_SUPABASE_ANON_KEY_DEV`
  - `VITE_SUPABASE_URL_PROD`
  - `VITE_SUPABASE_ANON_KEY_PROD`

## 4) CI/CD (اختياري لكن موصى به)

### 4.1 Frontend CI (lint/test/build)
تمت إضافة Workflow جاهز:
- `.github/workflows/ci.yml`

يشغل:
- `npm run lint`
- `npm test`
- `npm run build`

### 4.2 DB Migrations CD (Dev ثم Prod)
تمت إضافة Workflows جاهزة (تُشغّل فقط إذا كان `supabase/migrations` موجوداً داخل المستودع):
- `.github/workflows/supabase-migrate-dev.yml` (على `develop`)
- `.github/workflows/supabase-migrate-prod.yml` (يدوياً عبر `workflow_dispatch`)

هذه الـ workflows تشغّل `supabase db push --include-all --include-seed --yes` (يعني ستطبّق migrations + `supabase/seed.sql`).

تحتاج إلى GitHub Secrets بالأسماء التالية:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF_DEV`
- `SUPABASE_DB_PASSWORD_DEV`
- `SUPABASE_PROJECT_REF_PROD`
- `SUPABASE_DB_PASSWORD_PROD`

الفكرة:
- على `develop`: طبّق migrations على `qms-dev`.
- على `main` أو `workflow_dispatch`: طبّق migrations على `qms-prod` بعد موافقة/مراجعة.

> تنبيه: لا تضع Service Role Key في Vite env variables لأن أي متغير يبدأ بـ `VITE_` سيظهر داخل JavaScript bundle.

## 5) التحكم بمن يصل للتطبيق

طبقتان:
1. **داخل التطبيق/البيانات (الأهم)**:
   - Supabase Auth (إيقاف التسجيل المفتوح في Production).
   - Row Level Security (RLS) لكل الجداول وسياسات واضحة حسب `auth.uid()` و/أو `company_id`.
2. **التحكم بالنشر**:
   - Branch protection: لا يتم نشر Production إلا من `main` مع مراجعة.
   - GitHub Environments: اجعل أسرار Production لا تُستخدم إلا بعد approval.

## 6) إصلاح أخطاء Supabase Linter: `rls_references_user_metadata` (مهم)

إذا ظهر لك خطأ مثل:
`RLS references user metadata` فهذا يعني أن سياسة RLS تعتمد على `user_metadata` داخل JWT.
هذه قيمة **قابلة للتعديل من المستخدم** ولا يجب استخدامها في سياق أمني.

تمت إضافة migration جاهزة لإصلاح سياسات جدول `public.variables` واستبدال `user_metadata` بـ
`app_metadata.company_id` (غير قابلة للتعديل من المستخدم):
- `supabase/migrations/20260208220000_fix_variables_rls_remove_user_metadata.sql`

ولأن جدول `public.variables` كان موجوداً في بعض البيئات لكنه لم يكن مُتتبَّعاً داخل `supabase/migrations`،
تمت إضافة migration إضافية لضمان وجود الجدول + إنشاء RLS policies القياسية عند إنشاء بيئة جديدة (مثل Production):
- `supabase/migrations/20260208233000_create_variables_table.sql`

**ملاحظة تشغيلية:** يجب أن يكون لكل مستخدم `app_metadata.company_id` مضبوطاً (UUID كنص).
بعد ضبطه، يجب على المستخدم عمل `sign out / sign in` أو تحديث الجلسة حتى تتحدث الـ JWT claims.

## 7) أوامر سريعة (Git + Supabase CLI)

1. إنشاء/رفع فرع التطوير:
   - `git branch develop` (تم إنشاؤه محلياً بالفعل عندنا)
   - `git push -u origin develop`

2. تشغيل اختبارات وبناء محلي:
   - `npm ci`
   - `npm test`
   - `npm run build`

3. ربط/تطبيق migrations على Supabase (مثال):
   - `supabase login`
   - `supabase link --project-ref <DEV_PROJECT_REF>`
   - `supabase db push`
