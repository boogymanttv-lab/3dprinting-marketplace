// Email notifications via Resend
// Install: npm install resend
// Docs: https://resend.com/docs

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? '3DPrintingBG'
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL  ?? 'https://3dprintingbg.com'
const FROM     = `${APP_NAME} <noreply@3dprintingbg.com>`

// Lazy-load Resend so the app works even without the package installed yet
async function getResend() {
  try {
    const { Resend } = await import('resend')
    return new Resend(process.env.RESEND_API_KEY)
  } catch {
    return null
  }
}

// ─── Templates ───────────────────────────────────────

function orderConfirmationBuyer(data: {
  buyerName: string
  shopName: string
  listingTitle: string
  quantity: number
  total: number
  orderId: string
}) {
  return {
    subject: `✅ Поръчката ти е получена — ${data.listingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0f0f13; color: #f1f0f7; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="font-size: 36px;">🖨️</div>
          <h1 style="font-size: 22px; font-weight: 900; margin: 8px 0; color: #f97316;">${APP_NAME}</h1>
        </div>
        <h2 style="font-size: 18px; margin-bottom: 8px;">Здравей, ${data.buyerName}!</h2>
        <p style="color: #8884a0; margin-bottom: 24px;">Поръчката ти беше получена успешно. Продавачът ще потвърди скоро.</p>
        <div style="background: #1a1a24; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #2a2a3a;">
          <p style="font-size: 13px; color: #8884a0; margin: 0 0 8px;">ПРОДУКТ</p>
          <p style="font-weight: 700; margin: 0 0 4px;">${data.listingTitle}</p>
          <p style="color: #8884a0; font-size: 14px; margin: 0 0 12px;">Количество: ${data.quantity} бр.</p>
          <p style="color: #8884a0; font-size: 13px; margin: 0 0 4px;">Магазин: ${data.shopName}</p>
          <p style="font-size: 22px; font-weight: 900; color: #f97316; margin: 12px 0 0;">€ ${data.total.toFixed(2)}</p>
        </div>
        <a href="${APP_URL}/dashboard/orders" style="display: block; text-align: center; background: #f97316; color: #fff; padding: 14px 24px; border-radius: 10px; text-decoration: none; font-weight: 700;">Виж поръчката</a>
        <p style="text-align: center; font-size: 12px; color: #8884a0; margin-top: 24px;">${APP_NAME} · Маркетплейс за 3D принтиране</p>
      </div>
    `,
  }
}

function orderNotificationSeller(data: {
  shopName: string
  buyerName: string
  listingTitle: string
  quantity: number
  total: number
  orderId: string
}) {
  return {
    subject: `🛒 Нова поръчка — ${data.listingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0f0f13; color: #f1f0f7; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="font-size: 36px;">🛒</div>
          <h1 style="font-size: 22px; font-weight: 900; margin: 8px 0; color: #f97316;">Нова поръчка!</h1>
        </div>
        <p style="color: #8884a0; margin-bottom: 24px;">Здравей, <strong>${data.shopName}</strong>! Имаш нова поръчка от <strong>${data.buyerName}</strong>.</p>
        <div style="background: #1a1a24; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #2a2a3a;">
          <p style="font-weight: 700; margin: 0 0 4px;">${data.listingTitle}</p>
          <p style="color: #8884a0; font-size: 14px; margin: 0 0 12px;">Количество: ${data.quantity} бр.</p>
          <p style="font-size: 22px; font-weight: 900; color: #f97316; margin: 0;">€ ${data.total.toFixed(2)}</p>
        </div>
        <a href="${APP_URL}/dashboard" style="display: block; text-align: center; background: #f97316; color: #fff; padding: 14px 24px; border-radius: 10px; text-decoration: none; font-weight: 700;">Отиди в Dashboard</a>
      </div>
    `,
  }
}

function orderStatusUpdate(data: {
  buyerName: string
  listingTitle: string
  status: string
  statusLabel: string
  orderId: string
}) {
  const statusEmoji: Record<string, string> = {
    accepted: '✅', shipped: '🚚', completed: '🎉', cancelled: '❌',
  }

  return {
    subject: `${statusEmoji[data.status] ?? '📦'} Поръчката ти: ${data.statusLabel}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0f0f13; color: #f1f0f7; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 48px;">${statusEmoji[data.status] ?? '📦'}</div>
          <h2 style="font-size: 20px; font-weight: 900; margin: 8px 0;">${data.statusLabel}</h2>
        </div>
        <p style="color: #8884a0; text-align: center; margin-bottom: 24px;">
          Здравей <strong>${data.buyerName}</strong>! Поръчката ти за <strong>${data.listingTitle}</strong> е с нов статус: <strong style="color: #f97316;">${data.statusLabel}</strong>.
        </p>
        ${data.status === 'completed' ? `
          <div style="background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); border-radius: 10px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <p style="color: #22c55e; font-weight: 700; margin: 0;">Поръчката е завършена! Моля, остави ревю.</p>
          </div>
        ` : ''}
        <a href="${APP_URL}/dashboard/orders" style="display: block; text-align: center; background: #f97316; color: #fff; padding: 14px 24px; border-radius: 10px; text-decoration: none; font-weight: 700;">Виж поръчката</a>
      </div>
    `,
  }
}

// ─── Send functions ───────────────────────────────────

export async function sendOrderConfirmation(
  buyerEmail: string,
  sellerEmail: string,
  data: {
    buyerName: string
    shopName: string
    listingTitle: string
    quantity: number
    total: number
    orderId: string
  }
) {
  const resend = await getResend()
  if (!resend) return

  const buyerTpl  = orderConfirmationBuyer(data)
  const sellerTpl = orderNotificationSeller({ ...data, shopName: data.shopName })

  await Promise.all([
    resend.emails.send({ from: FROM, to: buyerEmail,  ...buyerTpl  }),
    resend.emails.send({ from: FROM, to: sellerEmail, ...sellerTpl }),
  ])
}

export async function sendStatusUpdate(
  buyerEmail: string,
  data: {
    buyerName: string
    listingTitle: string
    status: string
    statusLabel: string
    orderId: string
  }
) {
  const resend = await getResend()
  if (!resend) return

  const tpl = orderStatusUpdate(data)
  await resend.emails.send({ from: FROM, to: buyerEmail, ...tpl })
}
