import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

const read = (relativePath) => fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8');
function transpile(path, requireStub = undefined) {
  const javascript = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, require: requireStub };
  vm.runInNewContext(javascript, context, { filename: path });
  return context.exports;
}
const authUi = transpile('../src/utils/authUi.ts');
const egypt = transpile('../src/utils/egyptPhone.ts', (name) => {
  assert.equal(name, '@/utils/authUi');
  return authUi;
});

for (const [input, expected] of [
  ['01012345678', '+201012345678'],
  ['1012345678', '+201012345678'],
  ['+201012345678', '+201012345678'],
  ['201012345678', '+201012345678'],
  ['00201012345678', '+201012345678'],
  ['٠١٠١٢٣٤٥٦٧٨', '+201012345678'],
  ['۰۱۰۱۲۳۴۵۶۷۸', '+201012345678'],
  ['01112345678', '+201112345678'],
  ['01212345678', '+201212345678'],
  ['01512345678', '+201512345678'],
]) {
  assert.equal(egypt.isValidEgyptianMobile(input), true, input);
  assert.equal(egypt.egyptianMobileE164(input), expected, input);
}
for (const input of ['', '01012', '01412345678', '+966501234567', '+971501234567', '010123456789']) {
  assert.equal(egypt.isValidEgyptianMobile(input), false, input);
}

// The first typed digit should be checked immediately without waiting for submit.
for (const entered of ['2', '3', '4', '9', '٥', '٧', ' ٨', '+966501234567']) {
  assert.match(egypt.egyptianPhoneStartError(entered), /0 أو 1/, entered);
}
for (const entered of ['', '0', '01', '1', '10', '٠', '١', '01012345678',
  '+2', '+20', '+201012345678', '00201012345678', '201012345678']) {
  assert.equal(egypt.egyptianPhoneStartError(entered), '', entered);
}

const field = read('../src/components/auth/EgyptPhoneField.tsx');
assert.match(field, /dir="ltr"\s+className=\{cn\(/);
assert.match(field, /role="alert"/);
assert.match(field, /aria-describedby=\{startError/);
assert.match(field, /egyptianPhoneStartError\(currentValue\)/);
assert.ok(field.indexOf('+20') < field.indexOf('<Input'), 'Egypt prefix renders on the visual left in an LTR flex row');
assert.match(field, /px-3 text-left text-base/);
const layout = read('../src/components/layout/AuthLayout.tsx');
assert.match(layout, /<HeaderBrand \/>/);
assert.doesNotMatch(layout, /تصفح كضيف|حسابك في سوبر ماركو|auth-eyebrow|auth-guest|auth-footer/);
const login = read('../src/pages/PhoneLogin.tsx');
assert.match(login, /<AuthHeading title="تسجيل الدخول" \/>/);
assert.doesNotMatch(login, /أهلًا بيك في سوبر ماركو|لو الرقم جديد هنبعت OTP|نسيت الباسورد\? هنأكد رقمك/);
const heading = read('../src/components/auth/AuthHeading.tsx');
assert.doesNotMatch(heading, /auth-feature-icon|<Icon/);
assert.doesNotMatch(layout, /<BrandWordmark|<BrandMark|auth-brand-symbol/);
const css = read('../src/components/layout/auth.css');
assert.match(css, /#e6f9ee/);
assert.match(css, /#edf9f1/);
assert.match(css, /#f4fbf6/);
assert.doesNotMatch(css, /\.auth-brand-symbol/);
assert.doesNotMatch(field, /DropdownMenu|ChevronDown/);

for (const path of ['PhoneLogin', 'PhoneVerify', 'ForgotPassword', 'ChangePhone']) {
  const page = read(`../src/pages/${path}.tsx`);
  assert.match(page, /<EgyptPhoneField/);
  assert.doesNotMatch(page, /<CountryCodeSelector/);
}
const context = read('../src/contexts/UserContext.tsx');
assert.match(context, /isValidEgyptianMobile\(normalizedPhone\)/);
const edge = read('../supabase/functions/customer-auth-route/index.ts');
assert.match(edge, /egypt_phone_only/);
console.log('PASS: Egyptian +20 formats, live first-digit warning, single brand, lean auth copy, fixed left-side +20 and home gradient.');
