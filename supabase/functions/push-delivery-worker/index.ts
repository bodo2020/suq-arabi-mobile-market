import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/firebase_messaging'

type ClaimedDevice = {
  device_id: string
  token: string
  platform: string
  app_kind: string
  locale?: string
}

type ClaimedItem = {
  queue_id: string
  attempts: number
  delivery_type?: string
  recipient_user_id: string
  notification_id?: string | null
  title?: string | null
  body?: string | null
  action_url?: string | null
  category?: string | null
  severity?: string | null
  event_key?: string | null
  metadata?: Record<string, unknown> | null
  devices: ClaimedDevice[]
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sendFcm(token: string, item: ClaimedItem, headers: Record<string, string>) {
  const data: Record<string, string> = {}
  if (item.action_url) data.action_url = item.action_url
  if (item.notification_id) data.notification_id = item.notification_id
  if (item.event_key) data.event_key = item.event_key
  if (item.category) data.category = item.category

  const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: {
        token,
        notification: {
          title: item.title || 'المعداوي ماركت',
          body: item.body || '',
        },
        data,
        android: {
          priority: 'HIGH',
          notification: {
            channel_id: item.category === 'order' ? 'orders' : item.category === 'offer' ? 'offers' : 'general',
          },
        },
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    const err = new Error(`FCM send failed [${res.status}]: ${text}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const json = await res.json().catch(() => ({}))
  return json?.name as string | undefined
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const lovableKey = Deno.env.get('LOVABLE_API_KEY')
    const fcmKey = Deno.env.get('FIREBASE_MESSAGING_API_KEY')
    if (!supabaseUrl || !serviceKey) return jsonResponse({ error: 'Supabase env not configured' }, 500)
    if (!lovableKey || !fcmKey) return jsonResponse({ error: 'Firebase Messaging connection not configured' }, 500)

    const body = await req.json().catch(() => ({}))
    const workerSecret = typeof body?.secret === 'string' ? body.secret : ''

    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: valid, error: verifyError } = await supabase.rpc('verify_notification_worker_secret_v2', {
      p_secret: workerSecret,
    })
    if (verifyError || !valid) return jsonResponse({ error: 'Unauthorized' }, 401)

    const limit = Number.isInteger(body?.limit) ? Math.min(Math.max(body.limit, 1), 100) : 25
    const { data: batch, error: claimError } = await supabase.rpc('claim_push_delivery_batch_v2', { p_limit: limit })
    if (claimError) return jsonResponse({ error: `Claim failed: ${claimError.message}` }, 500)

    const items = (batch || []) as ClaimedItem[]
    const gatewayHeaders = {
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': fcmKey,
      'Content-Type': 'application/json',
    }

    const results: Array<{ queue_id: string; state: string; error?: string }> = []

    for (const item of items) {
      const devices = (item.devices || []).filter(d => d.token)
      if (devices.length === 0) {
        await supabase.rpc('complete_push_delivery_v2', {
          p_queue_id: item.queue_id,
          p_state: 'suppressed',
          p_error: 'NO_ACTIVE_DEVICES',
        })
        results.push({ queue_id: item.queue_id, state: 'suppressed', error: 'NO_ACTIVE_DEVICES' })
        continue
      }

      let sent = 0
      let lastError = ''
      for (const device of devices) {
        try {
          const reference = await sendFcm(device.token, item, gatewayHeaders)
          sent += 1
          if (reference) lastError = ''
          void reference
        } catch (error) {
          const status = (error as { status?: number })?.status
          const message = String((error as Error)?.message || error)
          lastError = message.slice(0, 500)
          // Stale token: disable the device so future sends skip it.
          if (status === 404 || status === 400) {
            // Supabase query builders are thenables without .catch(); errors come back in { error }.
            const { error: disableError } = await supabase.rpc('disable_push_device_token_v2', { p_device_id: device.device_id })
            if (disableError) console.warn('disable_push_device_token_v2 failed:', disableError.message)
          }
        }
      }

      const state = sent > 0 ? 'sent' : item.attempts >= 6 ? 'failed' : 'retrying'
      await supabase.rpc('complete_push_delivery_v2', {
        p_queue_id: item.queue_id,
        p_state: state,
        p_error: sent > 0 ? null : lastError || 'SEND_FAILED',
        p_metadata: { sent_devices: sent, total_devices: devices.length },
      })
      results.push({ queue_id: item.queue_id, state, error: sent > 0 ? undefined : lastError })
    }

    return jsonResponse({ processed: items.length, results })
  } catch (error) {
    console.error('push-delivery-worker failed:', error)
    return jsonResponse({ error: String((error as Error)?.message || error) }, 500)
  }
})
