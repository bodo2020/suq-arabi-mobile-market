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

const field = read('../src/components/auth/EgyptPhoneField.tsx');
assert.match(field, /dir="rtl"/);
assert.ok(field.indexOf('+20') < field.indexOf('<Input'), 'Egypt prefix renders before phone input in RTL');
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
console.log('PASS: Egyptian +20 phone normalization, invalid numbers rejected, fixed RTL field, shared auth screens.');
