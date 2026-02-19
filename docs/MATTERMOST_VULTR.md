# Mattermost على Vultr (خطة تنفيذ + دمج QMS)

هذه الوثيقة تشرح نشر Mattermost على VPS في Vultr باستخدام Docker Compose، ثم دمجه داخل تطبيق QMS عبر مسار `/chat`.

## 0) المتطلبات

- حساب Vultr فعّال.
- نطاق (Domain) أو Subdomain مثل `chat.example.com`.
- مفتاح SSH للدخول إلى السيرفر.
- قرار نمط الدمج:
  - `external` (فتح في تبويب جديد، الأكثر أماناً).
  - `iframe` (عرض داخل التطبيق ويتطلب ضبط Frame Ancestors في Mattermost).

## 1) إنشاء سيرفر Vultr

1. أنشئ Vultr Cloud Compute بنظام Ubuntu LTS (مثلاً 22.04).
2. اختر خطة مناسبة كبداية (2 vCPU / 4GB RAM مناسبة لمعظم الاستخدامات الخفيفة).
3. اربط Firewall Group بالسيرفر (الخطوة التالية).

## 2) إعداد Firewall في Vultr

> الفكرة: فتح المنافذ اللازمة فقط.

1. أنشئ Firewall Group جديد من لوحة Vultr.
2. أضف قواعد:
   - **TCP 22** (SSH) من عنوان IP الخاص بك فقط.
   - **TCP 80** (HTTP) من الجميع.
   - **TCP 443** (HTTPS) من الجميع.
   - **TCP 8065** من الجميع إذا قررت النشر بدون NGINX.

مراجع Vultr:
- إنشاء Firewall Group: https://docs.vultr.com/products/network/firewall/provisioning
- إدارة Firewall Groups: https://docs.vultr.com/products/network/firewall/management/groups
- إنشاء Firewall Rules: https://docs.vultr.com/products/network/firewall/management/rules

## 3) إعداد DNS للنطاق

إذا كنت ستستخدم Vultr DNS:
1. أضف النطاق إلى Vultr DNS.
2. أنشئ سجل A للـ subdomain `chat` يشير إلى IP السيرفر.
3. تأكد من ضبط Nameservers على `ns1.vultr.com` و `ns2.vultr.com`.

مرجع Vultr DNS:
- https://docs.vultr.com/vultr-dns-servers

## 4) تثبيت Docker و Docker Compose

على السيرفر:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

# Docker Engine (المستودع الرسمي)
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
```

## 5) نشر Mattermost باستخدام Docker Compose

الطريقة الرسمية من Mattermost:

```bash
git clone https://github.com/mattermost/docker
cd docker
cp env.example .env
```

بديل أسرع (سكريبت جاهز داخل المشروع):
- السكربت موجود محلياً في المشروع: `scripts/setup-mattermost-vultr.sh`.
- انسخه إلى السيرفر ثم شغّله.

عدّل ملف `.env` (على الأقل):
- `DOMAIN=chat.example.com`
- `MM_SERVICESETTINGS_SITEURL=https://chat.example.com`
- (اختياري) `MM_SUPPORTSETTINGS_SUPPORTEMAIL=support@example.com`

أنشئ المجلدات المطلوبة واملأ الصلاحيات:

```bash
mkdir -p ./volumes/app/mattermost/{config,data,logs,plugins,client/plugins,bleve-indexes}
sudo chown -R 2000:2000 ./volumes/app/mattermost
```

**نشر مع NGINX (HTTPS):**

```bash
docker compose -f docker-compose.yml -f docker-compose.nginx.yml up -d
```

**نشر بدون NGINX (HTTP على 8065):**

```bash
docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml up -d
```

مراجع Mattermost الرسمية:
- https://docs.mattermost.com/deployment-guide/server/containers/install-docker.html

## 6) إعدادات مهمة داخل Mattermost

1. سجّل دخول أول مرة وأنشئ System Admin.
2. تأكد من ضبط Site URL:
   - System Console → Environment → Web Server → Site URL
   - أو عبر المتغير `MM_SERVICESETTINGS_SITEURL`.

مرجع Site URL:
- https://docs.mattermost.com/administration-guide/configure/environment-configuration-settings.html

## 7) السماح بالدمج داخل QMS (iframe)

إذا أردت عرض Mattermost داخل التطبيق (`iframe`):
1. System Console → Integrations → Embedding → Frame Ancestors
2. أضف دومين تطبيقك (مثلاً `https://qms-dev.pages.dev` و `https://qms-prod.pages.dev`).
3. اتركها فارغة لتعطيل embedding.

مرجع Frame Ancestors:
- https://docs.mattermost.com/administration-guide/configure/integrations-configuration-settings.html

## 8) دمج Mattermost داخل QMS

في بيئة التطوير:

```env
VITE_CHAT_PROVIDER=mattermost
VITE_MATTERMOST_URL=https://chat.example.com
VITE_MATTERMOST_MODE=iframe
```

في Production (Cloudflare Pages):
ضع نفس المتغيرات داخل Environment Variables للمشروع `qms-prod`.

ملاحظة: لا تنشر Production إلا بعد موافقة `APPROVED FOR PROD`.

## 9) اختبار سريع

1. افتح `/chat` داخل QMS.
2. إذا ظهرت شاشة فارغة:
   - تأكد من Frame Ancestors.
   - تأكد من أن Mattermost يعمل على HTTPS.
   - جرب `VITE_MATTERMOST_MODE=external` للتأكد من الاتصال.
