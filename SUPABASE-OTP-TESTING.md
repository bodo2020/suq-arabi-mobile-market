# Supabase OTP testing

The customer app uses Supabase Phone OTP (`signInWithOtp` + `verifyOtp`) for normal customer numbers.

The development test-OTP edge function (`customer-test-otp`) is retired in production: it returns `410 customer_test_otp_retired`. The frontend no longer calls it — `src/contexts/UserContext.tsx` sends and verifies OTP with regular Supabase Phone OTP only.

If a test number is ever needed again, configure it in Supabase rather than reintroducing a custom edge function.
