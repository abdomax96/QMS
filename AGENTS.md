
# AGENTS.md (QMS) قواعد عمل AI: Dev -> Prod

استخدم هذا الملف كـ **System Prompt** (قواعد تشغيل) لأي مساعد ذكاء يعمل على هذا المشروع.

## معلومات المشروع (ثابتة)

- Repo: `max10296/QMS`
- Frontend: React + Vite + TypeScript + Tailwind (SPA)
- Backend/Database/Auth/Storage: Supabase (لا يوجد كود Backend server داخل هذا الـ repo)
- Branches:
  - Development: `develop`
  - Production: `main`

## البيئات (Dev / Prod)

Development (qms-dev)
- Git branch: `develop`
- Cloudflare Pages project: `qms-dev`
- URL: `https://qms-dev.pages.dev`
- Supabase Dev URL: `https://znbjgihtxpoznqmrealq.supabase.co`
- Env (محلي وغير مرفوع):
  - `.env.development.local` (مفضل)
  - أو `.env.local` (مسموح، لكن انتبه أنه يُقرأ في كل المودات)

Production (qms-prod)
- Git branch: `main`
- Cloudflare Pages project: `qms-prod`
- URL: `https://qms-prod.pages.dev`
- Supabase Prod URL: `https://xoqkyowtmsgitmabrgny.supabase.co`
- Env (محلي وغير مرفوع):
  - `.env.production.local` (إجباري للنشر)

## قواعد صارمة (Non‑Negotiable)

- ممنوع `push` مباشر على `main`.
- ممنوع نشر Production وممنوع تطبيق migrations على Production إلا بعد أن يرسل المستخدم حرفياً:
  - `APPROVED FOR PROD`
- أي تعديل يجب أن يبدأ في Dev (`develop` + `qms-dev`) ثم تجربة/مراجعة.
- ممنوع رفع أو طباعة Secrets (Tokens/Keys). ممنوع وضعها في git. ممنوع طباعتها في الشات/الـ logs.
- Supabase RLS ممنوع يعتمد على `user_metadata` (قابلة للتعديل من المستخدم). استخدم claims موثوقة مثل:
  - `auth.jwt() -> 'app_metadata'`

## سير عمل أي تغيير (Dev أولاً دائماً)

1. اعمل على فرع `develop` (checkout).
2. نفّذ التعديل المطلوب.
3. شغّل فحوصات محلية:
   - `npm test`
   - `npm run lint` (اختياري: حالياً قد يفشل بسبب مخالفات قديمة في المشروع)
   - `npm run build -- --mode development`
4. انشر على Dev للمراجعة:
   - تأكد من وجود متغيرات البيئة على الجهاز (بدون طباعتها):
     - `CLOUDFLARE_ACCOUNT_ID`
     - `CLOUDFLARE_API_TOKEN`
   - نفّذ:
     - `powershell -ExecutionPolicy Bypass -File scripts/deploy-pages.ps1 -Target dev`
5. شارك رابط Dev وما الذي يجب اختباره تحديداً، ثم توقّف وانتظر قرار المستخدم.

## الترقية إلى Production (فقط بعد الموافقة)

عند وصول رسالة المستخدم بالضبط:
- `APPROVED FOR PROD`

1. اعمل Merge من `develop` إلى `main` (بدون تغيير إضافي).
2. تأكد أن `.env.production.local` موجود وفيه:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. انشر على Production:
   - `powershell -ExecutionPolicy Bypass -File scripts/deploy-pages.ps1 -Target prod`
4. شارك رابط Production وخطوات تحقق سريعة بعد النشر.

## قاعدة البيانات (Supabase migrations)

- أي تعديل في قاعدة البيانات يجب أن يكون Migration SQL جديد داخل `supabase/migrations/` (timestamp).
- طبّق migrations على Supabase Dev أولاً وتأكد أنها تعمل؛ بعد الموافقة فقط طبّقها على Supabase Prod.

## التحكم في الوصول (Who can access)

- Production: التحكم الأساسي يكون عبر Supabase Auth + RLS (هذا هو المصدر الصحيح للأمان).
- Dev (اختياري): يمكن إضافة بوابة إضافية عبر Cloudflare Access (Zero Trust) لقصر الوصول على حسابات محددة.

## ملاحظات

- توثيق النشر: `docs/DEPLOYMENT.md`
- سكربت النشر المباشر: `scripts/deploy-pages.ps1`
