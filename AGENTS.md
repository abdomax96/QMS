# AGENTS.md (QMS) قواعد عمل AI: Dev → Prod

استخدم هذا الملف كـ **System Prompt** (قواعد تشغيل) لأي مساعد ذكاء يعمل على هذا المشروع.  
أي مخالفة للقواعد "Non Negotiable" = توقف فورًا واطلب توجيه المستخدم.

---

## 📋 معلومات المشروع (ثابتة)

| المكون | القيمة |
|-------|--------|
| **Repository** | `max10296/QMS` |
| **Frontend** | React + Vite + TypeScript + Tailwind (SPA) |
| **Backend/Database/Auth/Storage** | Supabase (لا يوجد كود Backend server داخل هذا الـ repo) |
| **Branch - Development** | `develop` |
| **Branch - Production** | `main` |

---

## 🌍 البيئات (Dev / Prod)

### Development (qms-dev)
- **Git branch:** `develop`
- **Cloudflare Pages project:** `qms-dev`
- **URL:** `https://qms-dev.pages.dev`
- **Supabase Dev URL:** `https://znbjgihtxpoznqmrealq.supabase.co`
- **Env (محلي وغير مرفوع):**
  - `.env.development.local` (مفضل)
  - أو `.env.local` (مسموح لكن انتبه: قد يُقرأ في أوضاع أخرى حسب إعدادات Vite)

### Production (qms-prod)
- **Git branch:** `main`
- **Cloudflare Pages project:** `qms-prod`
- **URL:** `https://qms-prod.pages.dev`
- **Supabase Prod URL:** `https://xoqkyowtmsgitmabrgny.supabase.co`
- **Env (محلي وغير مرفوع):**
  - `.env.production.local` (إجباري للنشر المحلي)
- **مصدر الحقيقة لبيئة Production عند النشر عبر Cloudflare/GitHub:**
  - Environment Variables الخاصة بمشروع Cloudflare Pages (Production)
  - أو GitHub Secrets المستخدمة في CI (حسب مسار النشر)

---

## 🚨 قواعد صارمة (Non Negotiable)

> **⚠️ CRITICAL:** انتهاك أي من هذه القواعد يتطلب إيقاف فوري للعمل وطلب توجيه من المستخدم.

### ✋ ممنوعات مطلقة

1. **ممنوع `push` مباشر على `main`**
   - يجب المرور عبر `develop` أولاً ثم merge بعد المراجعة والموافقة

2. **ممنوع نشر Production أو تطبيق migrations على Production** إلا بعد أن يرسل المستخدم **حرفياً**:
   ```
   APPROVED FOR PROD
   ```

3. **ممنوع رفع أو طباعة Secrets**
   - ممنوع وضع Tokens/Keys/Passwords في git
   - ممنوع طباعتها في الشات أو الـ logs
   - ممنوع مشاركتها في أي شكل

4. **ممنوع استخدام مفاتيح Production في Dev**
   - كل بيئة لها مفاتيحها المنفصلة
   - أي اشتباه في خلط المفاتيح = توقف فوري

5. **ممنوع تشغيل أوامر مدمّرة على Production** مثل:
   - `supabase db reset`
   - أي سكربت يمسح بيانات Prod
   - أي migration عكسية (rollback) بدون موافقة صريحة

### 🔒 قواعد الأمان

1. **Supabase RLS:**
   - ممنوع الاعتماد على `user_metadata` (قابلة للتعديل من المستخدم)
   - استخدم claims موثوقة فقط: `auth.jwt() -> 'app_metadata'`
   - تحقق من RLS policies قبل أي تعديل في الصلاحيات

2. **Environment Variables:**
   - تأكد أن كل بيئة تستخدم متغيراتها الصحيحة
   - راجع القسم التالي للتحقق من البيئة قبل أي عملية

---

## 🔍 قاعدة تشخيص إلزامية: تأكيد البيئة المستخدمة

> **⚡ MANDATORY:** قبل أي قرار/تشخيص متعلق بالبيئة، نفّذ هذه الخطوات:

### خطوات التحقق من البيئة

1. **افتح DevTools → Network**
2. **ابحث عن طلبات `supabase.co`**
3. **تأكد من الدومين:**
   - ✅ Dev يجب أن يطلب: `znbjgihtxpoznqmrealq.supabase.co`
   - ✅ Prod يجب أن يطلب: `xoqkyowtmsgitmabrgny.supabase.co`
4. **إذا وجدت عدم تطابق:** توقف فورًا وابدأ خطوات استكشاف الأخطاء

### اختياري (موصى به جداً): طباعة معلومات البيئة في Console

أضف في بداية التطبيق (بدون Keys):
```javascript
console.log('─────────────────────────────────');
console.log(`🌍 ENV: ${import.meta.env.MODE}`);
console.log(`🔗 SUPABASE URL: ${import.meta.env.VITE_SUPABASE_URL}`);
console.log('─────────────────────────────────');
```

> ✓ طباعة الـ URL ليست Secret ومفيدة جداً لتجنب التباس Dev/Prod.

---

## 🧪 اختبار فصل Dev/Prod (موصى به جدًا)

للتأكد 100% أن البيئتين منفصلتين تماماً:

### سيناريو الاختبار

1. **أنشئ سجلًا مميزًا في Dev فقط:**
   ```
   DEV_ONLY_2026-02-10_TEST_ABC
   ```

2. **أنشئ سجلًا مميزًا في Prod فقط:**
   ```
   PROD_ONLY_2026-02-10_TEST_XYZ
   ```

3. **تحقق:**
   - ✅ السجل Dev يظهر في Dev فقط
   - ✅ السجل Prod يظهر في Prod فقط
   - ❌ إذا ظهر أيّهما في البيئة الأخرى → **مشكلة خطيرة في ENV/نشر/كاش**

4. **في حالة وجود مشكلة:**
   - توقف فوراً عن أي عمل
   - أفرغ cache المتصفح
   - تحقق من Environment Variables
   - أعد الاختبار
   - اطلب مساعدة المستخدم إذا استمرت المشكلة

---

## 🔄 سير عمل أي تغيير (Dev أولاً دائماً)

> **💡 القاعدة الذهبية:** كل شيء يبدأ في Dev، لا استثناءات.

### خطوات التنفيذ

#### 1️⃣ الإعداد والتطوير

```bash
# تأكد أنك على فرع develop
git checkout develop
git pull origin develop

# نفّذ التعديل المطلوب
# ... your changes ...
```

#### 2️⃣ الفحوصات المحلية

```bash
# اختبارات الوحدة
npm test

# Linting (اختياري - قد يفشل بسبب مخالفات قديمة)
npm run lint

# بناء Development
npm run build -- --mode development
```

> ⚠️ إذا فشل `npm run build` → لا تتابع حتى تحل المشكلة

#### 3️⃣ Commit والـ Push

```bash
git add .
git commit -m "feat: وصف واضح للتغيير"
git push origin develop
```

#### 4️⃣ النشر على Dev

**قبل النشر - تأكد من وجود:**
- `CLOUDFLARE_ACCOUNT_ID` (في environment variables)
- `CLOUDFLARE_API_TOKEN` (في environment variables)

**نفّذ النشر:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-pages.ps1 -Target dev
```

#### 5️⃣ المراجعة والانتظار

**شارك مع المستخدم:**
- رابط Dev: `https://qms-dev.pages.dev`
- ما الذي يجب اختباره بالضبط
- أي ملاحظات أو تحذيرات

**ثم توقّف وانتظر:**
- ✋ لا تتابع حتى يراجع المستخدم
- ✋ لا تنشر على Production قبل الموافقة الصريحة

---

## 🚀 الترقية إلى Production (فقط بعد الموافقة)

> **🔐 CHECKPOINT:** لا تنفّذ هذا القسم إلا بعد رسالة صريحة من المستخدم

### الموافقة المطلوبة

يجب أن يرسل المستخدم **حرفياً**:
```
APPROVED FOR PROD
```

### خطوات النشر على Production

#### 1️⃣ Merge إلى main

```bash
# تأكد من أحدث نسخة من develop
git checkout develop
git pull origin develop

# انتقل إلى main وعمل merge
git checkout main
git pull origin main
git merge develop

# Push إلى main
git push origin main
```

> ⚠️ **لا تضيف أي تغييرات جديدة** - Merge فقط

#### 2️⃣ التحقق من Environment Variables

**للنشر المحلي:**
- تأكد من وجود `.env.production.local`
- يجب أن يحتوي على:
  ```env
  VITE_SUPABASE_URL=https://xoqkyowtmsgitmabrgny.supabase.co
  VITE_SUPABASE_ANON_KEY=<prod-anon-key>
  ```

**للنشر عبر Cloudflare/GitHub:**
- تحقق من Environment Variables في Cloudflare Pages (Production)
- أو GitHub Secrets (حسب مسار النشر المستخدم)

#### 3️⃣ البناء والنشر

```bash
# بناء Production (اختياري للتحقق)
npm run build -- --mode production

# النشر على Production
powershell -ExecutionPolicy Bypass -File scripts/deploy-pages.ps1 -Target prod
```

#### 4️⃣ التحقق بعد النشر

**شارك مع المستخدم:**
- رابط Production: `https://qms-prod.pages.dev`
- خطوات تحقق سريعة:
  - ✅ التطبيق يعمل ويتصل بـ Supabase Prod
  - ✅ تسجيل الدخول يعمل
  - ✅ الوظائف الأساسية تعمل
  - ✅ لا توجد أخطاء في Console

**نفّذ اختبار فصل البيئات (انظر القسم السابق)**

---

## 🗄️ قاعدة البيانات (Supabase Migrations)

### قواعد Migrations

1. **كل تعديل = Migration جديد**
   - أنشئ ملف جديد في `supabase/migrations/`
   - استخدم timestamp format: `YYYYMMDDHHMMSS_description.sql`
   - مثال: `20260210153000_add_users_role_column.sql`

2. **اختبار في Dev أولاً (إلزامي)**
   ```bash
   # تطبيق migration على Dev
   supabase db push --project-ref znbjgihtxpoznqmrealq
   
   # تحقق من النتائج
   # اختبر التطبيق في Dev
   # تأكد من عدم وجود أخطاء
   ```

3. **تطبيق على Prod (بعد الموافقة فقط)**
   - انتظر `APPROVED FOR PROD`
   - ثم:
   ```bash
   supabase db push --project-ref xoqkyowtmsgitmabrgny
   ```

### ⚠️ Migrations خطيرة

إذا كانت Migration تتضمن:
- حذف جداول أو أعمدة
- تغيير أنواع البيانات
- تعديل RLS policies
- تغيير في الصلاحيات

**يجب:**
1. إنشاء Backup من Production قبل التطبيق
2. اختبار Migration في Dev عدة مرات
3. توثيق خطة rollback واضحة
4. الحصول على موافقة صريحة من المستخدم

---

## 🔐 التحكم في الوصول (Access Control)

### Production

**المصدر الأساسي للأمان:**
- Supabase Auth (تسجيل الدخول والتحقق)
- RLS Policies (التحكم في الوصول للبيانات)

**قواعد RLS:**
- استخدم `auth.uid()` للمستخدم الحالي
- استخدم `auth.jwt() -> 'app_metadata'` للصلاحيات
- **لا تستخدم** `auth.jwt() -> 'user_metadata'` (قابلة للتزوير)

### Development (اختياري)

يمكن إضافة طبقة حماية إضافية:
- Cloudflare Access (Zero Trust)
- قصر الوصول على حسابات محددة
- مفيد لمنع الوصول العام لبيئة Dev

---

## 🐛 استكشاف الأخطاء المتكررة

### مشكلة: التطبيق يتصل بالبيئة الخاطئة

**الأعراض:**
- Dev يعرض بيانات Production (أو العكس)
- تغييرات Dev تظهر في Prod

**الحل:**
1. تحقق من DevTools → Network (انظر قسم التشخيص)
2. افرغ cache المتصفح كله
3. تحقق من ملفات `.env.*`
4. أعد بناء التطبيق: `npm run build -- --mode development`
5. نفّذ اختبار فصل Dev/Prod

### مشكلة: Environment Variables لا تُقرأ

**الأعراض:**
- `undefined` عند قراءة `import.meta.env.VITE_*`

**الحل:**
1. تأكد أن الملف اسمه صحيح:
   - Dev: `.env.development.local`
   - Prod: `.env.production.local`
2. تأكد أن المتغيرات تبدأ بـ `VITE_`
3. أعد تشغيل dev server: `npm run dev`
4. تحقق من Cloudflare Pages Environment Variables (للنشر على Cloudflare)

### مشكلة: Deployment فشل

**الحل:**
1. تحقق من وجود:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
2. تحقق من صلاحيات API Token
3. راجع لوج الخطأ بعناية
4. تأكد من صحة اسم المشروع في سكربت النشر

---

## 📚 مراجع ووثائق

| الوثيقة | الموقع |
|---------|---------|
| **توثيق النشر** | `docs/DEPLOYMENT.md` |
| **سكربت النشر** | `scripts/deploy-pages.ps1` |
| **Migrations** | `supabase/migrations/` |
| **Environment Files** | `.env.*.local` (local, not in git) |

---

## ✅ Checklist قبل أي عملية

### قبل تعديل كود

- [ ] أنا على فرع `develop`
- [ ] قرأت الـ issue/task بعناية
- [ ] فهمت التأثير على المستخدمين

### قبل النشر على Dev

- [ ] نجحت كل الاختبارات المحلية
- [ ] Build يعمل بدون أخطاء
- [ ] راجعت التغييرات (git diff)
- [ ] `CLOUDFLARE_ACCOUNT_ID` و `CLOUDFLARE_API_TOKEN` موجودين

### قبل النشر على Production

- [ ] حصلت على `APPROVED FOR PROD` من المستخدم
- [ ] التغييرات اُختبرت في Dev بنجاح
- [ ] لا توجد أخطاء في Dev
- [ ] `.env.production.local` صحيح (للنشر المحلي)
- [ ] أو Environment Variables في Cloudflare/GitHub صحيحة
- [ ] عملت Merge من develop إلى main
- [ ] جاهز لاختبار Production فوراً بعد النشر

---

## 🎯 خلاصة القواعد الذهبية

1. **Dev First, Always** - كل شيء يبدأ في Dev
2. **Verify Environment** - تحقق من البيئة قبل أي تشخيص
3. **No Secrets Exposed** - ممنوع طباعة أو رفع Secrets
4. **Wait for Approval** - Production يحتاج `APPROVED FOR PROD`
5. **Test Separation** - نفّذ اختبار فصل البيئات بانتظام
6. **RLS Security** - استخدم `app_metadata` فقط، ليس `user_metadata`
7. **Migrations Carefully** - Dev أولاً، ثم Prod بعد موافقة
8. **Clear Communication** - وضّح للمستخدم ما الذي يجب اختباره وانتظر

---

**آخر تحديث:** 2026-02-10
