import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20261030063000_picker_assignment_offer_conflict_does_not_rollback_checkout.sql');
const payment = read('src/pages/Payment.tsx');
const recovery = read('src/components/CheckoutAttemptRecovery.tsx');
const lib = read('src/lib/checkout.ts');

// Never remove unique offer constraints to "solve" the conflict: the offer
// insert is opportunistic, and must not roll back an already valid checkout.
assert.match(migration, /create or replace function private\.sync_order_picker_assignment_offer_v1/);
assert.match(migration, /security definer/);
assert.match(migration, /set search_path=''/);
assert.match(migration, /on conflict do nothing\s+returning \* into v_offer/);
assert.match(migration, /if v_offer\.id is null then return; end if;/);
assert.match(migration, /private\.notification_events_v2/);
assert.doesNotMatch(migration, /drop index|drop constraint/i);
assert.ok(migration.indexOf('on conflict do nothing') < migration.lastIndexOf('if v_offer.id is null then return; end if;'));
assert.ok(migration.lastIndexOf('if v_offer.id is null then return; end if;') < migration.indexOf('insert into private.notification_events_v2'));

// On an unknown error, check the exact previously persisted request ID. A
// false/unreachable reconciliation never clears it or creates a new ID.
assert.match(payment, /reconcilePendingCheckoutAttempt\(attempt\.requestId\)/);
assert.match(payment, /const attempt = submittedAttempt \|\| pendingCheckout/);
assert.match(payment, /if \(resolved\.exists && resolved\.id\)/);
assert.match(payment, /if \(JSON\.stringify\(attempt\.items\) === serializedLines\) clearCart\(\)/);
assert.match(payment, /void Promise\.allSettled\(\[/);
assert.match(payment, /لسه مش قادرين نتأكد من نتيجة الطلب/);
assert.match(lib, /reconcile_customer_checkout_attempt/);
assert.match(lib, /preparePendingCheckout/);
assert.match(recovery, /if \(result\.exists && result\.id\) \{\s*removePendingCheckout\(user\.id\)/);
assert.match(recovery, /A negative lookup might race a delayed original request/);
assert.doesNotMatch(recovery, /sessionStorage\.setItem\(RECOVERED_FLAG, '1'\);\s*window\.location\.reload\(\);\s*\} catch \(error\)/);

console.log('PASS: picker offers remain unique without aborting checkout; unknown results are reconciled with same request ID.');
