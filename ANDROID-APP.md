# تطبيق العملاء على Android

تم تجهيز مشروع React الحالي للعمل كتطبيق Android Native Shell باستخدام Capacitor.

## الهوية

- App name: `المعداوي ماركت`
- App ID: `com.elmadawy.market.customer`
- Web assets: `dist`
- Production mode: يحمل ملفات React المدمجة داخل التطبيق، وليس رابط الموقع.

## أول تشغيل محلي

```bash
npm ci
npm run android:add
npm run android:open
```

بعد إنشاء مجلد Android مرة واحدة، أي تحديث جديد في React:

```bash
npm run android:sync
npm run android:open
```

وللتشغيل مباشرة على Emulator أو جهاز Android متصل:

```bash
npm run android:run
```

## صلاحيات Android الحالية

السكريبت `scripts/prepare-android.mjs` يضيف تلقائيًا بعد إنشاء/مزامنة المشروع:

- Camera: لقراءة الباركود.
- Fine/Coarse Location: لاختيار وتحديد عنوان العميل.
- `adjustResize`: حتى لا تغطي لوحة المفاتيح حقول التسجيل والدفع.

## Live reload أثناء التطوير

الوضع الطبيعي لا يستخدم أي Remote URL. لو احتجنا Live Reload فقط أثناء التطوير، نمرر:

```bash
CAPACITOR_SERVER_URL=http://YOUR_LAN_IP:5173 npm run android:sync
```

ولا يتم استخدام هذا المتغير في نسخة الإنتاج.

## GitHub Actions

Workflow: `Customer Android Build`

يبني تلقائيًا Debug APK من الفرع الخاص بتجهيز Android، ويتحقق من:

1. React production build.
2. إنشاء مشروع Android.
3. Capacitor sync.
4. إضافة الصلاحيات المطلوبة.
5. Gradle `assembleDebug`.
6. رفع APK كـ GitHub Actions artifact.

## قبل Google Play

قبل إصدار النسخة النهائية نحتاج إكمال:

- App icon وAdaptive icon من هوية المعداوي.
- Splash screen النهائي.
- Firebase `google-services.json` لتفعيل Push Notifications على Android.
- Signing keystore خاص بالمعداوي محفوظ في GitHub Secrets، وليس داخل المستودع.
- Release AAB workflow.
- اختبار تسجيل الدخول، السلة، Checkout، العناوين، الخرائط، الباركود والإشعارات على جهاز Android حقيقي.
