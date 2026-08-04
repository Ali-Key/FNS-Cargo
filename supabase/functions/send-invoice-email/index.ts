// send-invoice-email
// Emails an invoice PDF to a customer. Admin-gated: the caller's JWT is verified
// against is_admin() before the function talks to Resend. The PDF is generated
// client-side (the browser already has all the invoice data/layout code) and
// shipped here as base64 — this function only forwards it as an attachment.
//
// Requires two secrets that are NOT auto-provisioned, set once via:
//   supabase secrets set RESEND_API_KEY=... RESEND_FROM_EMAIL="FNS Cargo <invoices@yourdomain.com>"
// RESEND_FROM_EMAIL must be a domain verified in Resend — company_email from
// system_settings is admin-entered data and is very unlikely to be verified,
// so it is only ever used as the reply-to address, never the sender.
//
// Body: { to, subject, message, pdfBase64, filename, replyTo? }  ->  { id }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL')

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Generous ceiling for a text-based invoice PDF — guards against a client bug
// shipping something absurd, not a real-world size limit.
const MAX_PDF_BYTES = 10 * 1024 * 1024

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    return json({ error: 'Email sending is not configured yet. Set RESEND_API_KEY and RESEND_FROM_EMAIL.' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing authorization' }, 401)

  // 1) Verify the caller is a signed-in admin.
  const caller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: isAdmin, error: adminErr } = await caller.rpc('is_admin')
  if (adminErr || !isAdmin) return json({ error: 'Not authorized' }, 403)

  // 2) Validate input.
  let body: {
    to?: string
    subject?: string
    message?: string
    pdfBase64?: string
    filename?: string
    replyTo?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  const to = (body.to ?? '').trim().toLowerCase()
  const subject = (body.subject ?? '').trim()
  const message = body.message ?? ''
  const pdfBase64 = body.pdfBase64 ?? ''
  const filename = (body.filename ?? 'invoice.pdf').trim()
  const replyTo = body.replyTo?.trim() || undefined

  if (!EMAIL_RE.test(to)) return json({ error: 'Enter a valid recipient email address.' }, 400)
  if (!subject) return json({ error: 'Enter a subject line.' }, 400)
  if (!pdfBase64) return json({ error: 'Missing PDF attachment.' }, 400)
  // Base64 inflates size by ~4/3 — this is an approximate but sufficient guard.
  if (pdfBase64.length > MAX_PDF_BYTES * 1.4) return json({ error: 'Attachment is too large.' }, 400)

  // 3) Send via Resend.
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [to],
      reply_to: replyTo,
      subject,
      text: message,
      attachments: [{ filename, content: pdfBase64 }],
    }),
  })

  if (!resendRes.ok) {
    const detail = await resendRes.text().catch(() => '')
    console.error('Resend send failed', resendRes.status, detail)
    return json({ error: 'Could not send the email. Please try again.' }, 502)
  }

  const sent = await resendRes.json().catch(() => ({}))
  return json({ id: sent?.id ?? null }, 200)
})
