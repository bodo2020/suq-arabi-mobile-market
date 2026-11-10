# Google Play listing – سوبر ماركو

Copy each part into Play Console. Text in `[brackets]` is for you to fill in.

---

## 1. Store listing (Main store listing)

**App name** (max 30 characters):
```
سوبر ماركو - ماركت المعداوي
```

**Short description** (max 80 characters):
```
اطلب حاجات السوبر ماركت من ماركت المعداوي وتوصلك لحد باب البيت بسرعة
```

**Full description** (max 4000 characters):
```
سوبر ماركو هو تطبيق ماركت المعداوي: كل حاجات البيت من السوبر ماركت في مكان واحد، بأسعار الفرع، وتوصلك لحد باب البيت بسرعة.

🛒 تسوّق بسهولة
• آلاف المنتجات مقسّمة أقسام واضحة: ألبان وبيض، لحوم ودواجن، خضار وفاكهة، مخبوزات، مجمدات، أغذية معلّبة، منظفات وأكتر.
• ابحث باسم المنتج أو امسح الباركود بالكاميرا وتلاقيه على طول.
• المنتجات بالوزن (زي الخضار والجبن) بتختار الكمية اللي محتاجها بالظبط.
• احفظ المنتجات اللي بتحبها في المفضلة واطلبها تاني بضغطة.

🏷️ عروض كل يوم
• خصومات وعروض متجددة على حاجات البيت.
• صفحة عروض مخصوصة تشوف فيها كل الخصومات مرة واحدة.

⭐ نقاط وكوبونات
• كل طلب بيجمعلك نقاط في بطاقة سوبر ماركو.
• حوّل نقاطك لكوبونات خصم تستخدمها في طلبك الجاي.
• بطاقتك فيها باركود توريه للكاشير وانت بتشتري من الفرع، فتجمع نقاط برضه.

🚚 توصيل سريع وتتبّع لحظي
• احفظ أكتر من عنوان، والتطبيق يحدد الفرع الأقرب ليك.
• تابع طلبك خطوة بخطوة لحد ما يوصلك.
• ادفع كاش عند الاستلام أو بمحفظة إلكترونية (فودافون كاش أو إنستا باي).

🔁 مرتجعات بسهولة
• لو فيه مشكلة في منتج، اطلب استرجاع من التطبيق وتابع حالته.

🌙 مريح للعين
• وضع فاتح وغامق حسب ما يريحك.

بياناتك في أمان: مش بنبيع بياناتك، وتقدر تحذف حسابك من التطبيق في أي وقت.

حمّل سوبر ماركو دلوقتي وخلّي طلبات البيت أسهل.
```

**App category:** Shopping
**Tags:** Groceries, Shopping, Delivery (pick what Play offers)
**Contact details:**
- Phone / WhatsApp: `+201005245096`
- Email (required by Play, shown publicly): `[the store email, e.g. elmadawymarket@gmail.com — confirm]`
- Website (optional): `[the published customer app link]`

**Privacy policy URL:** `[published app link]/privacy.html`

**Graphics:** in the `store-listing` folder next to the release files:
- `icon-512.png`: App icon (512×512)
- `feature-graphic-1024x500.png`: Feature graphic
- `screenshots/`: Phone screenshots (2–8)

---

## 2. App content (Policy → App content)

**Privacy policy:** the `privacy.html` link above.

**Ads:** No, the app does not contain ads.

**App access:** some functionality is restricted (login required).
Add instructions + test account:
```
The app needs a phone number login and a delivery address inside our delivery area.
Phone: [test customer phone]
Password: [test customer password]
The test account already has a saved address in the delivery area, so all screens (products, cart, checkout, orders, points) are reachable. Please do not complete a real order; you can stop at the payment step.
```

**Content rating** (IARC questionnaire): category **Reference, News or Educational → no**; choose **"All other app types"** (shopping).
- Violence, sexual content, profanity, drugs, gambling: **No** to all.
- Does the app let users interact or exchange content with each other? **No**.
- Does the app share the user's location with other users? **No**.
- Does the app allow users to purchase digital goods? **No** (physical groceries only).
- Expected rating: **Everyone / 3+**.

**Target audience:** 18 and over (you can add 13–17 too). **Not** designed for children. "Could the app unintentionally appeal to children?" **No**.

**News app:** No. **COVID-19 tracing:** No. **Government app:** No.
**Financial features:** none of the listed (no loans, banking, crypto, etc.).
**Health:** No.

**Data safety:** see section 3.

**Account deletion URL:** `[published app link]/delete-account.html`

---

## 3. Data safety form

**Does your app collect or share any of the required user data types?** Yes.
**Is all user data encrypted in transit?** Yes.
**Do you provide a way for users to request that their data is deleted?** Yes (in-app: حسابي ← حذف الحساب; web: delete-account.html).

**Shared with third parties?** No for every type below (Supabase, Firebase and OpenStreetMap only process data for us as service providers, which Play does not count as "sharing").

| Data type (Play name) | Collected | Required / optional | Purposes |
|---|---|---|---|
| Personal info → **Name** | Yes | Required | App functionality, Account management |
| Personal info → **Phone number** | Yes | Required | App functionality, Account management, Developer communications |
| Personal info → **Address** | Yes | Required (for delivery) | App functionality |
| Location → **Precise location** | Yes | Optional (only when choosing an address) | App functionality |
| Location → **Approximate location** | Yes | Optional | App functionality |
| Financial info → **Purchase history** | Yes | Required | App functionality, Account management |
| Photos and videos → **Photos** | Yes | Optional (return request photos) | App functionality |
| App activity → **App interactions** | Yes | Required | Analytics, App functionality |
| Device or other IDs → **Device or other IDs** | Yes | Optional (push notifications) | App functionality, Developer communications |

Everything else (email, contacts, messages, files, calendar, health, payment card info, web history, audio, etc.): **not collected**.

For each collected type Play asks "Is this data processed ephemerally?": **No** (except the camera barcode scan, which is not stored and not a listed type).

---

## 4. Permissions the app asks for (for reference if Play asks)

- **Location (foreground only, no background):** pick the delivery address and the nearest branch.
- **Camera:** scan product barcodes in search, attach photos to a return request.
- **Notifications:** order status updates and offers.

---

## 5. Release

- Upload `Desktop\Super Marko releases\SuperMarko-<version>-v<code>.aab` (built with `npm run android:release`).
- Accept **Play App Signing**.
- Release notes (first release):
```
<ar>
أول إصدار من سوبر ماركو: تسوّق من ماركت المعداوي، عروض يومية، نقاط وكوبونات، وتتبّع طلبك لحد باب البيت.
</ar>
```
- Personal developer account created after Nov 2023: run **Closed testing** with at least **12 testers for 14 days** before applying for production.
