export default () => ({
  port: parseInt(process.env.PORT ?? "3001", 10),
  app: {
    url: process.env.APP_URL,
    frontendUrl: process.env.FRONTEND_URL,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },
  initialAdmin: {
    email: process.env.INITIAL_ADMIN_EMAIL,
    password: process.env.INITIAL_ADMIN_PASSWORD,
  },
  mail: {
    host: process.env.SMTP_HOST ?? process.env.MAIL_HOST,
    port: parseInt(process.env.SMTP_PORT ?? process.env.MAIL_PORT ?? "587", 10),
    user: process.env.SMTP_USER ?? process.env.MAIL_USER,
    pass: process.env.SMTP_PASS ?? process.env.MAIL_PASS,
    from: process.env.SMTP_FROM ?? process.env.MAIL_FROM,
    notifyTo: process.env.SMTP_TO ?? process.env.MAIL_TO,
    dryRun: process.env.MAIL_DRY_RUN === "true",
  },
  reminders: {
    enabled: process.env.REMINDERS_ENABLED !== "false",
    lookbackMinutes: parseInt(process.env.REMINDER_LOOKBACK_MINUTES ?? "5", 10),
  },
  webhooks: {
    // Base64 PEM (or raw PEM) from SendGrid → Settings → Mail Settings →
    // Event Webhook → Signed Event Webhook Verification Key.
    sendgridPublicKey: process.env.SENDGRID_WEBHOOK_PUBLIC_KEY,
  },
});
