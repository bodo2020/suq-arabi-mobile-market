# Supabase OTP testing

The customer app uses Supabase Phone OTP (`signInWithOtp` + `verifyOtp`).

For development, use Supabase Auth test OTP configuration so the test phone number and fixed OTP remain server-side and are not committed to GitHub or bundled in the APK.

Do not hard-code a personal phone number or fixed OTP in React source.
