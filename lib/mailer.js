import nodemailer from 'nodemailer'

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  const host = process.env.EMAIL_HOST
  const port = Number(process.env.EMAIL_PORT) || 465
  const secure = process.env.EMAIL_SECURE === 'true' || port === 465
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASSWORD

  if (!host || !user || !pass) {
    console.error(
      '[mailer] Missing email configuration. Please set EMAIL_HOST, EMAIL_PORT, EMAIL_USER and EMAIL_PASSWORD in your environment.'
    )
    return null
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  })

  return transporter
}

export async function sendEmail({ to, subject, text, html }) {
  const activeTransporter = getTransporter()

  if (!activeTransporter) {
    console.error('[mailer] Transporter not initialized, email not sent.')
    return
  }

  const fromName =
    process.env.EMAIL_FROM_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Talio HRMS'
  const fromEmail = process.env.EMAIL_FROM_EMAIL || process.env.EMAIL_USER

  if (!fromEmail) {
    console.error('[mailer] EMAIL_FROM_EMAIL or EMAIL_USER is not set, email not sent.')
    return
  }

  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail

  const mailOptions = {
    from,
    to,
    subject,
    text,
    html: html || (text ? `<p>${text.replace(/\n/g, '<br />')}</p>` : undefined),
  }

  await activeTransporter.sendMail(mailOptions)
}

export async function sendLoginAlertEmail({
  to,
  name,
  loginTime,
  userAgent,
  ipAddress,
}) {
  if (!to) {
    console.error('[mailer] Missing recipient email for login alert.')
    return
  }

  const time =
    loginTime || new Date()

  const timeString = time.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
  })

  const greetingName = name ? ` ${name}` : ''

  const subject = 'New login to Talio HRMS'

  const textLines = [
    `Hi${greetingName},`,
    '',
    `You just logged in to Talio HRMS on ${timeString}.`,
  ]

  if (userAgent) {
    textLines.push(`Device: ${userAgent}`)
  }

  if (ipAddress) {
    textLines.push(`IP Address: ${ipAddress}`)
  }

  textLines.push(
    '',
    'If this was not you, please contact your HR/administrator immediately.',
    '',
    'Thanks,',
    'Talio HRMS'
  )

  const text = textLines.join('\n')

  const htmlParts = [
    `<p>Hi${greetingName},</p>`,
    `<p>You just logged in to <strong>Talio HRMS</strong> on ${timeString}.</p>`,
  ]

  if (userAgent) {
    htmlParts.push(`<p><strong>Device:</strong> ${userAgent}</p>`)
  }

  if (ipAddress) {
    htmlParts.push(`<p><strong>IP Address:</strong> ${ipAddress}</p>`)
  }

  htmlParts.push(
    '<p>If this was not you, please contact your HR/administrator immediately.</p>',
    '<p>Thanks,<br/>Talio HRMS</p>'
  )

  const html = htmlParts.join('\n')

  await sendEmail({ to, subject, text, html })
}

