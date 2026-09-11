# Supabase OTP testing

The customer app uses Supabase Phone OTP (`signInWithOtp` + `verifyOtp`) for normal customer numbers.

A single development test number can be handled by the `customer-test-otp` Edge Function. The frontend asks the function whether the entered number is a configured test number; if it is not, the app falls back to normal Supabase Phone OTP.

The test phone and fixed code are never committed to GitHub or bundled in the APK. Supabase stores only SHA-256 hashes for the configured test credentials. The test verifier also expires automatically and temporarily locks after repeated invalid attempts.

Remove or disable the test credential before production release.
