import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5.9.6';

const FIREBASE_PROJECT_ID = 'elmadawy-c165b';
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);
const ALLOWED_ORIGINS = new Set([
  'https://elmadawymarket.store',
  'https://www.elmadawymarket.store',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://localhost',
  'capacitor://localhost',
]);

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin)
    ? origin
    : 'https://elmadawymarket.store',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });

const randomPassword = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const phoneDigits = (value: string) => value.replace(/\D/g, '');

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return json({ error: 'Origin is not allowed.' }, 403, origin);
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);

  try {
    const { firebaseToken, shouldCreateUser = true } = await req.json();
    if (typeof firebaseToken !== 'string' || !firebaseToken) {
      return json({ error: 'Firebase token is required.' }, 400, origin);
    }
    if (typeof shouldCreateUser !== 'boolean') {
      return json({ error: 'Invalid account creation preference.' }, 400, origin);
    }

    const { payload } = await jwtVerify(firebaseToken, FIREBASE_JWKS, {
      algorithms: ['RS256'],
      audience: FIREBASE_PROJECT_ID,
      issuer: FIREBASE_ISSUER,
    });

    const phone = payload.phone_number;
    const signInProvider = (payload.firebase as { sign_in_provider?: string } | undefined)
      ?.sign_in_provider;
    const authTime = Number(payload.auth_time || 0);
    const now = Math.floor(Date.now() / 1000);

    if (typeof phone !== 'string' || signInProvider !== 'phone') {
      return json({ error: 'A verified Firebase phone identity is required.' }, 401, origin);
    }
    if (!authTime || now - authTime > 10 * 60) {
      return json({ error: 'Firebase authentication is too old. Request a new code.' }, 401, origin);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error('Supabase function environment is incomplete.');
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const publicClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userPage, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) throw listError;

    const normalizedPhone = phoneDigits(phone);
    const existingUser = userPage.users.find(
      (user) => user.phone && phoneDigits(user.phone) === normalizedPhone,
    );
    const password = randomPassword();
    let userId = existingUser?.id;

    if (existingUser) {
      const { data: staffAccount, error: staffLookupError } = await admin
        .from('users')
        .select('id')
        .eq('id', existingUser.id)
        .maybeSingle();
      if (staffLookupError) throw staffLookupError;
      if (staffAccount) {
        return json({ error: 'استخدم تسجيل دخول الموظفين لهذا الرقم.' }, 403, origin);
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
        password,
        phone_confirm: true,
        app_metadata: {
          ...existingUser.app_metadata,
          firebase_uid: payload.sub,
          auth_provider: 'firebase_phone',
        },
      });
      if (updateError) throw updateError;
    } else {
      if (!shouldCreateUser) {
        return json({ error: 'لا يوجد حساب مرتبط برقم الهاتف هذا.' }, 404, origin);
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        phone,
        password,
        phone_confirm: true,
        app_metadata: { firebase_uid: payload.sub, auth_provider: 'firebase_phone' },
      });
      if (createError) throw createError;
      userId = created.user.id;
    }

    const { data: signIn, error: signInError } = await publicClient.auth.signInWithPassword({
      phone,
      password,
    });
    if (signInError || !signIn.session) throw signInError || new Error('Session was not created.');

    return json({
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      expires_at: signIn.session.expires_at,
      user_id: userId,
    }, 200, origin);
  } catch (error) {
    console.error('Firebase auth exchange failed:', error);
    return json({ error: 'تعذر إكمال تسجيل الدخول. حاول مرة أخرى.' }, 401, origin);
  }
});
