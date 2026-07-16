const nodemailer = require('nodemailer');

// SMTP transport. Credentials come from backend/.env (never commit them).
// For Gmail, SMTP_PASS must be a Google "App Password", not the account password.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: (process.env.SMTP_SECURE || 'true') === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const FROM = () => `"DocP" <${process.env.SMTP_USER}>`;

function otpEmailHtml(name, otp) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border:1px solid #e6e9ee;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#0d1117;padding:20px 28px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.2px;">
                  <span style="color:#2f81f7;">&#9670;</span> DocP
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px;">
                <h1 style="margin:0 0 6px;font-size:20px;color:#1f2328;">Verify your sign-in</h1>
                <p style="margin:0;color:#57606a;font-size:14px;line-height:1.6;">
                  Hi ${name || 'there'}, use the verification code below to finish signing in to your DocP account.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;">
                <div style="background:#f6f8fa;border:1px solid #e6e9ee;border-radius:10px;padding:18px;text-align:center;">
                  <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0d1117;font-family:'SFMono-Regular',Consolas,monospace;">${otp}</div>
                </div>
                <p style="margin:14px 0 0;color:#8c959f;font-size:13px;text-align:center;">
                  This code expires in 10 minutes.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <p style="margin:0;color:#57606a;font-size:13px;line-height:1.6;border-top:1px solid #eef1f4;padding-top:16px;">
                  If you didn't try to sign in, you can safely ignore this email — your account remains secure. Never share this code with anyone; DocP will never ask you for it.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f6f8fa;padding:16px 28px;border-top:1px solid #eef1f4;">
                <p style="margin:0;color:#8c959f;font-size:12px;">© ${new Date().getFullYear()} DocP · Automated security message, please do not reply.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function noticeEmailHtml(name, heading, body) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border:1px solid #e6e9ee;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#0d1117;padding:20px 28px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;"><span style="color:#2f81f7;">&#9670;</span> DocP</span>
          </td></tr>
          <tr><td style="padding:32px 28px;">
            <h1 style="margin:0 0 10px;font-size:20px;color:#1f2328;">${heading}</h1>
            <p style="margin:0;color:#57606a;font-size:14px;line-height:1.6;">Hi ${name || 'there'}, ${body}</p>
          </td></tr>
          <tr><td style="background:#f6f8fa;padding:16px 28px;border-top:1px solid #eef1f4;">
            <p style="margin:0;color:#8c959f;font-size:12px;">© ${new Date().getFullYear()} DocP · Automated security message, please do not reply.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function sendOtpEmail(to, otp, name) {
  return transporter.sendMail({
    from: FROM(),
    replyTo: process.env.SMTP_USER,
    xMailer: false,
    to,
    subject: 'Your DocP verification code',
    text: `Your DocP verification code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: otpEmailHtml(name, otp),
  });
}

async function send2faEnabledEmail(to, name) {
  return transporter.sendMail({
    from: FROM(),
    replyTo: process.env.SMTP_USER,
    xMailer: false,
    to,
    subject: 'Two-step verification is on',
    text: `Two-step verification has been enabled on your DocP account. You'll now enter a one-time code from your email each time you sign in.`,
    html: noticeEmailHtml(
      name,
      'Two-step verification is on',
      "two-step verification has been enabled on your DocP account. From now on you'll enter a one-time code sent to this email each time you sign in. If this wasn't you, sign in and disable it from Settings right away."
    ),
  });
}

module.exports = { sendOtpEmail, send2faEnabledEmail, transporter };
