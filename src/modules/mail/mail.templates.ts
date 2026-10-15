import { readFileSync } from "node:fs";
import { join } from "node:path";

export type AppointmentDetails = {
  contactName: string;
  companyName: string;
  email: string;
  appointmentType: string;
  date: string;
  time: string;
  timezone: string;
  duration: string;
};

export type MailContent = { subject: string; text: string; html: string };

export type CalendarLinkSet = {
  google: string;
  outlook: string;
  ics: string;
};

export type AppointmentLinks = {
  reschedule: string;
  cancel: string;
  calendar?: CalendarLinkSet;
};

export const LOGO_CID = "north-logo";
export const BRAND_FROM = "NORTH POINT SALES GROUP";

const BRAND = {
  navy: "#001528",
  navySoft: "#112238",
  bronze: "#b17411",
  bronzeSoft: "#C99B31",
  cream: "#FAF9F5",
  white: "#ffffff",
  muted: "#5C5F66",
  border: "#E8E4DC",
  rowAlt: "#F7F5F0",
};

export function getEmailLogoAttachment() {
  return {
    filename: "north-logo.svg",
    content: readFileSync(join(process.cwd(), "assets", "north-logo.svg")),
    cid: LOGO_CID,
    contentType: "image/svg+xml" as const,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function detailRows(rows: { label: string; value: string; href?: string }[]) {
  return rows
    .map((row, index) => {
      const bg = index % 2 === 0 ? BRAND.rowAlt : BRAND.white;
      const valueHtml = row.href
        ? `<a href="${escapeHtml(row.href)}" style="color:${BRAND.bronze};text-decoration:none;font-weight:600;">${escapeHtml(row.value)}</a>`
        : escapeHtml(row.value);

      return `
        <tr>
          <td style="padding:12px 16px;background:${bg};border-bottom:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.muted};width:38%;vertical-align:top;">
            ${escapeHtml(row.label)}
          </td>
          <td style="padding:12px 16px;background:${bg};border-bottom:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:${BRAND.navy};vertical-align:top;">
            ${valueHtml}
          </td>
        </tr>
      `;
    })
    .join("");
}

function actionButtons(
  links: AppointmentLinks,
  options: { showCancel?: boolean; showCalendar?: boolean } = {},
) {
  const { showCancel = true, showCalendar = true } = options;
  const button = (href: string, label: string, secondary = false) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 6px 8px;padding:12px 20px;border-radius:999px;background:${secondary ? BRAND.navy : BRAND.bronze};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">${escapeHtml(label)}</a>`;

  // Must stay table rows: a bare <div> inside <table> is invalid HTML and
  // email clients reflow or drop it.
  const calendar =
    showCalendar && links.calendar
      ? `
    <tr>
      <td style="padding:12px 28px 8px;text-align:center;">
        <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.muted};">Add to your calendar</span>
        <div style="margin-top:8px;">
          ${button(links.calendar.google, "Google Calendar", true)}
          ${button(links.calendar.outlook, "Outlook", true)}
          ${button(links.calendar.ics, "Apple / Other (.ics)", true)}
        </div>
      </td>
    </tr>`
      : "";

  return `
    <tr>
      <td style="padding:20px 28px 8px;text-align:center;">
        ${button(links.reschedule, "Reschedule")}
        ${showCancel ? button(links.cancel, "Cancel") : ""}
      </td>
    </tr>
    ${calendar}
  `;
}

function calendarTextLines(links: AppointmentLinks): string[] {
  if (!links.calendar) return [];
  return [
    "",
    "Add to your calendar:",
    `Google Calendar: ${links.calendar.google}`,
    `Outlook: ${links.calendar.outlook}`,
    `Apple / Other (.ics): ${links.calendar.ics}`,
  ];
}

function emailShell({
  badge,
  heading,
  introHtml,
  detailsHeading,
  rows,
  afterHtml,
  actionsHtml,
  footerNote,
}: {
  badge: string;
  heading: string;
  introHtml: string;
  detailsHeading: string;
  rows: { label: string; value: string; href?: string }[];
  afterHtml?: string;
  actionsHtml?: string;
  footerNote: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.cream};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${BRAND.white};border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border};box-shadow:0 8px 28px rgba(0,21,40,0.08);">
          <tr>
            <td style="background:${BRAND.navy};padding:28px 32px 24px;text-align:center;">
              <img src="cid:${LOGO_CID}" alt="NORTH POINT SALES GROUP" width="220" style="display:block;margin:0 auto 18px;width:220px;max-width:70%;height:auto;border:0;" />
              <div style="display:inline-block;padding:6px 14px;border:1px solid rgba(193,155,49,0.55);border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.bronzeSoft};">
                ${escapeHtml(badge)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:linear-gradient(90deg, ${BRAND.bronze} 0%, ${BRAND.bronzeSoft} 50%, ${BRAND.bronze} 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px;">
              <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;font-weight:700;color:${BRAND.navy};">
                ${escapeHtml(heading)}
              </h1>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${BRAND.muted};">
                ${introHtml}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 8px;">
              <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.bronze};">
                ${escapeHtml(detailsHeading)}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
                ${detailRows(rows)}
              </table>
            </td>
          </tr>
          ${actionsHtml ?? ""}
          ${
            afterHtml
              ? `<tr><td style="padding:20px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:${BRAND.muted};">${afterHtml}</td></tr>`
              : ""
          }
          <tr>
            <td style="padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.navySoft};border-radius:12px;">
                <tr>
                  <td style="padding:20px 22px;text-align:center;">
                    <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:${BRAND.white};">
                      NORTH POINT SALES GROUP
                    </p>
                    <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#C9D1D9;">
                      <a href="mailto:contact@northpointsalesgroup.com" style="color:${BRAND.bronzeSoft};text-decoration:none;">contact@northpointsalesgroup.com</a>
                      &nbsp;·&nbsp;
                      <a href="tel:+18006966971" style="color:${BRAND.bronzeSoft};text-decoration:none;">800-696-6971</a>
                    </p>
                    <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9AA3AD;">
                      ${escapeHtml(footerNote)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8A8F98;text-align:center;">
          Serving clients nationwide · Improving established sales organizations
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function appointmentRows(details: AppointmentDetails) {
  return [
    { label: "Contact Name", value: details.contactName },
    { label: "Company Name", value: details.companyName },
    {
      label: "Business Email",
      value: details.email,
      href: `mailto:${details.email}`,
    },
    { label: "Appointment Type", value: details.appointmentType },
    { label: "Date", value: details.date },
    { label: "Available Time", value: details.time },
    { label: "Time Zone", value: details.timezone },
    { label: "Duration", value: details.duration },
  ];
}

function appointmentText(details: AppointmentDetails) {
  return [
    `Contact Name: ${details.contactName}`,
    `Company Name: ${details.companyName}`,
    `Business Email: ${details.email}`,
    `Appointment Type: ${details.appointmentType}`,
    `Date: ${details.date}`,
    `Available Time: ${details.time}`,
    `Time Zone: ${details.timezone}`,
    `Meeting Duration: ${details.duration}`,
  ].join("\n");
}

export function buildAppointmentEmails(details: AppointmentDetails) {
  const rows = appointmentRows(details);
  const detailsText = appointmentText(details);

  const internalSubject = `New Appointment Request — ${details.companyName}`;
  const internalText = [
    "New appointment request from the NORTH POINT SALES GROUP website:",
    "",
    detailsText,
  ].join("\n");

  const internalHtml = emailShell({
    badge: "New Lead · Website Form",
    heading: "New Appointment Request",
    introHtml: `
      <p style="margin:0 0 10px;">A prospect just submitted the schedule form on the NORTH POINT SALES GROUP website.</p>
      <p style="margin:0;">Review the details below and follow up promptly.</p>
    `,
    detailsHeading: "Request Details",
    rows,
    afterHtml: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:10px;">
        <tr>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:${BRAND.navy};">
            <strong style="color:${BRAND.bronze};">Tip:</strong>
            Reply directly to this email to reach
            <a href="mailto:${escapeHtml(details.email)}" style="color:${BRAND.bronze};text-decoration:none;font-weight:700;">${escapeHtml(details.email)}</a>.
          </td>
        </tr>
      </table>
    `,
    footerNote: "Internal notification from northpointsalesgroup.com",
  });

  const confirmationSubject =
    "We received your appointment request — NORTH POINT SALES GROUP";
  const confirmationText = [
    `Hi ${details.contactName},`,
    "",
    "Thank you for scheduling an appointment with NORTH POINT SALES GROUP.",
    "Your request is confirmed on our side. We look forward to speaking with you.",
    "",
    "Your request details:",
    detailsText,
    "",
    "If you need to make changes, reply to this email or contact us at contact@northpointsalesgroup.com.",
    "",
    "— NORTH POINT SALES GROUP",
  ].join("\n");

  const confirmationHtml = emailShell({
    badge: "Confirmation",
    heading: "We've received your request",
    introHtml: `
      <p style="margin:0 0 10px;">Hi <strong style="color:${BRAND.navy};">${escapeHtml(details.contactName)}</strong>,</p>
      <p style="margin:0 0 10px;">Thank you for scheduling an appointment with <strong style="color:${BRAND.navy};">NORTH POINT SALES GROUP</strong>.</p>
      <p style="margin:0;">Your request is confirmed on our side. We look forward to speaking with you.</p>
    `,
    detailsHeading: "Your Appointment Details",
    rows,
    afterHtml: `
      <p style="margin:0;">Need to change anything? Just reply to this email or reach us at
        <a href="mailto:contact@northpointsalesgroup.com" style="color:${BRAND.bronze};text-decoration:none;font-weight:700;">contact@northpointsalesgroup.com</a>.
      </p>
    `,
    footerNote: "This is an automated confirmation of your website request",
  });

  return {
    internalSubject,
    internalText,
    internalHtml,
    confirmationSubject,
    confirmationText,
    confirmationHtml,
  };
}

export function buildBookingEmails(
  details: AppointmentDetails,
  links: AppointmentLinks,
): { prospect: MailContent; admin: MailContent } {
  const base = buildAppointmentEmails(details);

  return {
    prospect: {
      subject: base.confirmationSubject,
      text: [
        `Hi ${details.contactName},`,
        "",
        "Thank you for scheduling an appointment with NORTH POINT SALES GROUP.",
        "Your request is confirmed on our side. We look forward to speaking with you.",
        "",
        "Your request details:",
        appointmentText(details),
        "",
        `Reschedule your appointment: ${links.reschedule}`,
        `Cancel your appointment: ${links.cancel}`,
        ...calendarTextLines(links),
        "",
        "— NORTH POINT SALES GROUP",
      ].join("\n"),
      html: emailShell({
        badge: "Confirmation",
        heading: "We've received your request",
        introHtml: `
          <p style="margin:0 0 10px;">Hi <strong style="color:${BRAND.navy};">${escapeHtml(details.contactName)}</strong>,</p>
          <p style="margin:0 0 10px;">Thank you for scheduling an appointment with <strong style="color:${BRAND.navy};">NORTH POINT SALES GROUP</strong>.</p>
          <p style="margin:0;">Your request is confirmed on our side. We look forward to speaking with you.</p>
        `,
        detailsHeading: "Your Appointment Details",
        rows: appointmentRows(details),
        actionsHtml: actionButtons(links),
        afterHtml: `
          <p style="margin:0;">Need to change anything? Use the buttons above, or reply to this email or reach us at
            <a href="mailto:contact@northpointsalesgroup.com" style="color:${BRAND.bronze};text-decoration:none;font-weight:700;">contact@northpointsalesgroup.com</a>.
          </p>
        `,
        footerNote: "This is an automated confirmation of your website request",
      }),
    },
    admin: {
      subject: base.internalSubject,
      text: base.internalText,
      html: base.internalHtml,
    },
  };
}

export function buildRescheduleEmails(
  details: AppointmentDetails,
  links: AppointmentLinks,
  changedFrom: string,
): { prospect: MailContent; admin: MailContent } {
  return {
    prospect: {
      subject:
        "Your appointment has been rescheduled — NORTH POINT SALES GROUP",
      text: [
        `Hi ${details.contactName},`,
        "",
        `Your appointment with NORTH POINT SALES GROUP was rescheduled from ${changedFrom} to the details below.`,
        "",
        appointmentText(details),
        "",
        `Reschedule again: ${links.reschedule}`,
        `Cancel your appointment: ${links.cancel}`,
        ...calendarTextLines(links),
        "",
        "— NORTH POINT SALES GROUP",
      ].join("\n"),
      html: emailShell({
        badge: "Rescheduled",
        heading: "Your appointment was rescheduled",
        introHtml: `
          <p style="margin:0 0 10px;">Hi <strong style="color:${BRAND.navy};">${escapeHtml(details.contactName)}</strong>,</p>
          <p style="margin:0 0 10px;">Your appointment with <strong style="color:${BRAND.navy};">NORTH POINT SALES GROUP</strong> was moved.</p>
          <p style="margin:0;">Previous time: <strong style="color:${BRAND.bronze};">${escapeHtml(changedFrom)}</strong>. Here are your updated details:</p>
        `,
        detailsHeading: "Updated Appointment Details",
        rows: appointmentRows(details),
        actionsHtml: actionButtons(links),
        footerNote: "This is an automated reschedule notification",
      }),
    },
    admin: {
      subject: `Appointment rescheduled — ${details.companyName}`,
      text: [
        "An appointment was rescheduled by the prospect.",
        "",
        appointmentText(details),
        `(Previous time: ${changedFrom})`,
      ].join("\n"),
      html: emailShell({
        badge: "Rescheduled · Prospect Action",
        heading: "Appointment Rescheduled",
        introHtml: `
          <p style="margin:0 0 10px;">The prospect <strong style="color:${BRAND.navy};">${escapeHtml(details.contactName)}</strong> rescheduled via the email link.</p>
          <p style="margin:0;">Previous time: <strong style="color:${BRAND.bronze};">${escapeHtml(changedFrom)}</strong>.</p>
        `,
        detailsHeading: "Updated Appointment Details",
        rows: appointmentRows(details),
        footerNote: "Internal notification from northpointsalesgroup.com",
      }),
    },
  };
}

export function buildReminderEmails(
  details: AppointmentDetails,
  links: AppointmentLinks,
  hoursBefore: number,
): { prospect: MailContent } {
  const leadTime = hoursBefore === 1 ? "1 hour" : `${hoursBefore} hours`;

  return {
    prospect: {
      subject: `Reminder: your appointment is in ${leadTime} — NORTH POINT SALES GROUP`,
      text: [
        `Hi ${details.contactName},`,
        "",
        `This is a reminder that your appointment with NORTH POINT SALES GROUP is in ${leadTime}.`,
        "",
        appointmentText(details),
        "",
        `Reschedule your appointment: ${links.reschedule}`,
        `Cancel your appointment: ${links.cancel}`,
        ...calendarTextLines(links),
        "",
        "Need anything before the call? Just reply to this email.",
        "",
        "— NORTH POINT SALES GROUP",
      ].join("\n"),
      html: emailShell({
        badge: `Reminder · ${leadTime}`,
        heading: `Your appointment is in ${leadTime}`,
        introHtml: `
          <p style="margin:0 0 10px;">Hi <strong style="color:${BRAND.navy};">${escapeHtml(details.contactName)}</strong>,</p>
          <p style="margin:0 0 10px;">This is a reminder that your appointment with <strong style="color:${BRAND.navy};">NORTH POINT SALES GROUP</strong> is in <strong style="color:${BRAND.bronze};">${escapeHtml(leadTime)}</strong>.</p>
          <p style="margin:0;">Your confirmed details are below, along with links to reschedule or cancel.</p>
        `,
        detailsHeading: "Your Appointment Details",
        rows: appointmentRows(details),
        actionsHtml: actionButtons(links),
        afterHtml: `
          <p style="margin:0 0 12px;">Need to change the time? Use the buttons above. If anything else comes up, just reply to this email or reach us at
            <a href="mailto:contact@northpointsalesgroup.com" style="color:${BRAND.bronze};text-decoration:none;font-weight:700;">contact@northpointsalesgroup.com</a>.
          </p>
          <p style="margin:0;color:${BRAND.navy};font-weight:600;">We look forward to speaking with you.</p>
        `,
        footerNote: "This is an automated appointment reminder",
      }),
    },
  };
}

export type ContactMessageDetails = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
};

export function buildContactEmail(details: ContactMessageDetails): MailContent {
  const rows = [
    { label: "Name", value: details.name },
    { label: "Email", value: details.email, href: `mailto:${details.email}` },
    ...(details.phone
      ? [
          {
            label: "Phone",
            value: details.phone,
            href: `tel:${details.phone.replace(/[^\d+]/g, "")}`,
          },
        ]
      : []),
    ...(details.company ? [{ label: "Company", value: details.company }] : []),
  ];

  return {
    subject: `New contact message — ${details.name}`,
    text: [
      "New message from the NORTH POINT SALES GROUP website contact form:",
      "",
      `Name: ${details.name}`,
      `Email: ${details.email}`,
      ...(details.phone ? [`Phone: ${details.phone}`] : []),
      ...(details.company ? [`Company: ${details.company}`] : []),
      "",
      "Message:",
      details.message,
    ].join("\n"),
    html: emailShell({
      badge: "Contact Form · Website",
      heading: "New Contact Message",
      introHtml: `<p style="margin:0;">A visitor sent a message through the contact form on the NORTH POINT SALES GROUP website. Reply directly to this email to respond.</p>`,
      detailsHeading: "Sender Details",
      rows,
      afterHtml: `
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.bronze};">Message</p>
        <div style="padding:14px 16px;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:10px;color:${BRAND.navy};white-space:pre-wrap;">${escapeHtml(details.message)}</div>
      `,
      footerNote: "Internal notification from northpointsalesgroup.com",
    }),
  };
}

export function buildCancellationEmails(
  details: AppointmentDetails,
  links: AppointmentLinks,
  reason?: string,
): { prospect: MailContent; admin: MailContent } {
  const cancelledRows = [
    { label: "Contact Name", value: details.contactName },
    { label: "Company Name", value: details.companyName },
    {
      label: "Business Email",
      value: details.email,
      href: `mailto:${details.email}`,
    },
    { label: "Cancellation Reason", value: reason ?? "Not provided" },
  ];

  return {
    prospect: {
      subject: "Your appointment was cancelled — NORTH POINT SALES GROUP",
      text: [
        `Hi ${details.contactName},`,
        "",
        "Your appointment with NORTH POINT SALES GROUP has been cancelled.",
        reason ? `Reason: ${reason}` : "",
        "",
        "If this was a mistake, you can reschedule the same appointment here:",
        links.reschedule,
        "",
        "Or simply reply to this email, or call 800-696-6971, and we'll help.",
        "",
        "— NORTH POINT SALES GROUP",
      ]
        .filter(Boolean)
        .join("\n"),
      html: emailShell({
        badge: "Cancelled",
        heading: "Your appointment was cancelled",
        introHtml: `
          <p style="margin:0 0 10px;">Hi <strong style="color:${BRAND.navy};">${escapeHtml(details.contactName)}</strong>,</p>
          <p style="margin:0 0 10px;">Your appointment with <strong style="color:${BRAND.navy};">NORTH POINT SALES GROUP</strong> has been cancelled.</p>
          <p style="margin:0;color:${BRAND.navy};font-weight:600;">If this was a mistake, use the button below to reschedule the same appointment, reply to this email, or call <a href="tel:+18006966971" style="color:${BRAND.bronze};text-decoration:none;font-weight:700;">800-696-6971</a>.</p>
        `,
        detailsHeading: "Cancelled Appointment",
        rows: cancelledRows,
        actionsHtml: actionButtons(links, {
          showCancel: false,
          showCalendar: false,
        }),
        footerNote: "This is an automated cancellation notification",
      }),
    },
    admin: {
      subject: `Appointment cancelled — ${details.companyName}`,
      text: [
        "An appointment was cancelled by the prospect.",
        "",
        appointmentText(details),
        reason ? `Cancellation reason: ${reason}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      html: emailShell({
        badge: "Cancelled · Prospect Action",
        heading: "Appointment Cancelled",
        introHtml: `
          <p style="margin:0 0 10px;"><strong style="color:${BRAND.navy};">${escapeHtml(details.contactName)}</strong> cancelled via the email link${reason ? ` (reason: <strong style="color:${BRAND.bronze};">${escapeHtml(reason)}</strong>)` : ""}.</p>
          <p style="margin:0;">This appointment moved to the Cancelled view.</p>
        `,
        detailsHeading: "Cancelled Appointment",
        rows: cancelledRows,
        footerNote: "Internal notification from northpointsalesgroup.com",
      }),
    },
  };
}
