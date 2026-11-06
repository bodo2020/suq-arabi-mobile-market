# بانرات الصفحة الرئيسية

مصدر التصميم بتاع البانرات اللي في `public/banners/`.

- المقاس: **١٢٥٢×٨٣٦** (نسبة ٣:٢)، نفس نسبة صور البانرات.
- عشان تطلع صورة PNG بعد التعديل (Chrome headless):

```
chrome --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1252,836 --allow-file-access-from-files --virtual-time-budget=8000 --screenshot=offers.png file:///<المسار>/design/banners/offers.html
```

- الاسم مكتوب بالطريقة الرسمية: ســــــوبـرمــاركو، أبيض وأصفر على الأخضر. شوف `docs/DESIGN.md`.
- نسب الخصم في `offers.html` من العروض اللي كانت شغالة وقت التصميم. لو العروض اتغيرت، عدّلها وطلّع الصورة تاني.
