import nodemailer from 'nodemailer';
import prisma from './prisma';
import { logger } from './logger';

type MailTransportConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure?: boolean;
};

type AnnouncementMailInput = {
  organizationId: string;
  recipients: string[];
  subject: string;
  html: string;
};

type LiveSessionCreatedMailInput = {
  organizationId: string;
  recipients: string[];
  title: string;
  description?: string;
  scheduledAt: Date | string;
  duration: number;
  courseName?: string;
  actionUrl?: string;
};

type AssignmentResultMailInput = {
  organizationId: string;
  to: string;
  studentName?: string;
  assignmentTitle: string;
  courseName?: string;
  topicName?: string;
  score?: number | null;
  maxScore?: number | null;
  feedback?: string | null;
  actionUrl?: string;
};

type EmailBranding = {
  organizationName: string;
  logoUrl: string;
  supportEmail: string;
  primaryColor: string;
  secondaryColor: string;
};

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const LEGACY_FROM_NAMES = new Set(['queztlearn', 'quztlearn']);

const normalizeFromAddress = (value: string): string => {
  const from = normalizeString(value);

  if (!from) {
    return '';
  }

  const match = from.match(/^(.*?)\s*<(.+)>$/);

  if (!match) {
    return LEGACY_FROM_NAMES.has(from.toLowerCase()) ? 'TeslaAcademy' : from;
  }

  const [, rawName, email] = match;
  const name = normalizeString(rawName).replace(/^"(.*)"$/, '$1');

  if (!LEGACY_FROM_NAMES.has(name.toLowerCase())) {
    return from;
  }

  return `TeslaAcademy <${email.trim()}>`;
};

const safeColor = (value: unknown, fallback: string) => {
  const color = normalizeString(value);
  return color || fallback;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getEnvMailConfig = (): MailTransportConfig | null => {
  const host = normalizeString(process.env.SMTP_HOST || 'smtp.gmail.com');
  const user = normalizeString(process.env.SMTP_USER || 'ahmedhdhd6122001@gmail.com');
  const pass = normalizeString(process.env.SMTP_PASS || 'nqjj xpbg uzcq tthp');
  const from = normalizeFromAddress(process.env.SMTP_FROM || 'TeslaAcademy <ahmedhdhd6122001@gmail.com>');
  const port = Number(process.env.SMTP_PORT) || 587;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    user,
    pass,
    from,
    secure: port === 465,
  };
};

const parseOrganizationMailConfig = (
  value: unknown
): MailTransportConfig | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const config = value as Record<string, unknown>;
  const host = normalizeString(config.host);
  const user = normalizeString(config.user);
  const pass = normalizeString(config.pass);
  const from = normalizeFromAddress(String(config.from || ''));
  const port = Number(config.port) || 587;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    user,
    pass,
    from,
    secure: port === 465,
  };
};

const createTransporter = (config: MailTransportConfig) =>
  nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure ?? false,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

const getEmailBranding = async (
  organizationId?: string
): Promise<EmailBranding> => {
  if (!organizationId) {
    return {
      organizationName: 'TeslaAcademy',
      logoUrl: '',
      supportEmail: '',
      primaryColor: '#0f172a',
      secondaryColor: '#64748b',
    };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      config: {
        select: {
          logoUrl: true,
          supportEmail: true,
          themeJson: true,
        },
      },
    },
  });

  const theme =
    organization?.config?.themeJson &&
    typeof organization.config.themeJson === 'object' &&
    !Array.isArray(organization.config.themeJson)
      ? (organization.config.themeJson as Record<string, unknown>)
      : null;

  return {
    organizationName: normalizeString(organization?.name) || 'TeslaAcademy',
    logoUrl: normalizeString(organization?.config?.logoUrl),
    supportEmail: normalizeString(organization?.config?.supportEmail),
    primaryColor: safeColor(theme?.primaryColor, '#0f172a'),
    secondaryColor: safeColor(theme?.secondaryColor, '#64748b'),
  };
};

const getMailConfigForOrganization = async (
  organizationId?: string
): Promise<MailTransportConfig> => {
  if (organizationId) {
    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId },
      select: { smtpConfigJson: true },
    });

    const organizationMailConfig = parseOrganizationMailConfig(
      config?.smtpConfigJson
    );

    if (organizationMailConfig) {
      return organizationMailConfig;
    }
  }

  const envMailConfig = getEnvMailConfig();

  if (!envMailConfig) {
    throw new Error(
      'SMTP is not configured. Add SMTP details in organization settings or backend environment variables.'
    );
  }

  return envMailConfig;
};

const sendMail = async ({
  organizationId,
  to,
  subject,
  html,
}: {
  organizationId?: string;
  to: string | string[];
  subject: string;
  html: string;
}) => {
  const config = await getMailConfigForOrganization(organizationId);
  const transporter = createTransporter(config);

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    html,
  });
};

const renderActionButton = (label: string, href: string, color: string) => `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 0;">
    <tr>
      <td style="border-radius:999px; background:${color};">
        <a href="${href}" style="display:inline-block; padding:14px 24px; font-size:15px; font-weight:600; line-height:1; color:#ffffff; text-decoration:none;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>
`;

const renderFallbackLink = (href: string, color: string) => `
  <div style="margin-top:28px; padding-top:20px; border-top:1px solid #e5e7eb;">
    <div style="font-size:12px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#94a3b8; margin-bottom:10px;">
      Direct link
    </div>
    <div style="font-size:13px; line-height:1.7; color:#475569; word-break:break-word;">
      If the button does not work, copy and paste this link into your browser:<br />
      <a href="${href}" style="color:${color}; text-decoration:none;">${href}</a>
    </div>
  </div>
`;

const buildEmailShell = ({
  brand,
  preheader,
  eyebrow,
  title,
  intro,
  bodyHtml,
  note,
}: {
  brand: EmailBranding;
  preheader?: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  bodyHtml: string;
  note?: string;
}) => {
  const supportLine = brand.supportEmail
    ? `
      <div style="margin-top:6px;">
        Need help? Contact
        <a href="mailto:${brand.supportEmail}" style="color:${brand.primaryColor}; text-decoration:none;">${brand.supportEmail}</a>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0; padding:0; background:#f5f7fa; color:#0f172a;">
        <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
          ${escapeHtml(preheader || intro || title)}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f7fa; margin:0; padding:24px 0;">
          <tr>
            <td align="center" style="padding:0 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; background:#ffffff; border:1px solid #e5e7eb; border-radius:20px; overflow:hidden;">
                <tr>
                  <td style="padding:24px 28px 18px; border-top:4px solid ${brand.primaryColor};">
                    ${
                      brand.logoUrl
                        ? `<img src="${brand.logoUrl}" alt="${escapeHtml(
                            brand.organizationName
                          )} logo" style="display:block; height:40px; max-width:160px; object-fit:contain;" />`
                        : `<div style="font-size:20px; font-weight:700; color:${brand.primaryColor};">${escapeHtml(
                            brand.organizationName
                          )}</div>`
                    }
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 32px;">
                    ${
                      eyebrow
                        ? `<div style="font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${brand.secondaryColor}; margin-bottom:14px;">${escapeHtml(
                            eyebrow
                          )}</div>`
                        : ''
                    }
                    <h1 style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:30px; line-height:1.2; font-weight:700; color:#0f172a;">
                      ${escapeHtml(title)}
                    </h1>
                    ${
                      intro
                        ? `<p style="margin:16px 0 0; font-size:15px; line-height:1.75; color:#475569;">${escapeHtml(
                            intro
                          )}</p>`
                        : ''
                    }
                    <div style="margin-top:24px; font-size:15px; line-height:1.75; color:#334155;">
                      ${bodyHtml}
                    </div>
                    ${
                      note
                        ? `<div style="margin-top:24px; padding:16px 18px; border-radius:14px; background:#f8fafc; border:1px solid #e2e8f0; font-size:14px; line-height:1.7; color:#475569;">
                            ${escapeHtml(note)}
                          </div>`
                        : ''
                    }
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 28px 24px; border-top:1px solid #e5e7eb; background:#fcfcfd; font-size:13px; line-height:1.7; color:#64748b;">
                    <div style="font-weight:600; color:#0f172a;">${escapeHtml(
                      brand.organizationName
                    )}</div>
                    ${supportLine}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const sendActionEmail = async ({
  organizationId,
  to,
  subject,
  preheader,
  eyebrow,
  title,
  intro,
  actionLabel,
  actionUrl,
  note,
  bodyLead,
}: {
  organizationId?: string;
  to: string;
  subject: string;
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  actionLabel: string;
  actionUrl: string;
  note: string;
  bodyLead: string;
}) => {
  const brand = await getEmailBranding(organizationId);

  await sendMail({
    organizationId,
    to,
    subject,
    html: buildEmailShell({
      brand,
      preheader,
      eyebrow,
      title,
      intro,
      bodyHtml: `
        <div>${escapeHtml(bodyLead)}</div>
        ${renderActionButton(actionLabel, actionUrl, brand.primaryColor)}
        ${renderFallbackLink(actionUrl, brand.primaryColor)}
      `,
      note,
    }),
  });
};

export const sendVerificationEmail = async (
  to: string,
  token: string,
  frontendUrl: string,
  organizationId?: string
) => {
  const brand = await getEmailBranding(organizationId);
  const link = `${frontendUrl}/verify-email?token=${token}`;

  await sendActionEmail({
    organizationId,
    to,
    subject: `Verify your email - ${brand.organizationName}`,
    preheader: 'Confirm your email address to activate your account.',
    eyebrow: 'Account verification',
    title: 'Verify your email',
    intro: 'Please confirm your email address to finish setting up your account.',
    actionLabel: 'Verify Email',
    actionUrl: link,
    bodyLead: 'This verification link will expire in 24 hours.',
    note: 'If you did not create an account, you can safely ignore this email.',
  });

  logger.info(`Verification email sent to ${to}`);
};

export const sendInviteEmail = async (
  to: string,
  token: string,
  orgName: string,
  frontendUrl: string,
  organizationId?: string,
  role: 'TEACHER' | 'ADMIN' = 'TEACHER'
) => {
  const brand = await getEmailBranding(organizationId);
  const link = `${frontendUrl}/verify-email?token=${token}`;
  const roleLabel = role === 'ADMIN' ? 'Admin' : 'Teacher';

  await sendMail({
    organizationId,
    to,
    subject: `Invitation to join ${orgName} as ${roleLabel}`,
    html: buildEmailShell({
      brand,
      preheader: `You've been invited to join ${orgName} as ${roleLabel.toLowerCase()}.`,
      eyebrow: 'Invitation',
      title: `Join ${orgName}`,
      intro: `You have been invited to join the platform as ${roleLabel.toLowerCase()}.`,
      bodyHtml: `
        <div><strong>Organization:</strong> ${escapeHtml(orgName)}</div>
        <div><strong>Role:</strong> ${roleLabel}</div>
        <div style="margin-top:10px;">Use the link below to accept the invitation and complete your account setup.</div>
        ${renderActionButton('Accept Invitation', link, brand.primaryColor)}
        ${renderFallbackLink(link, brand.primaryColor)}
      `,
      note: 'If you were not expecting this invitation, you can ignore this message.',
    }),
  });
};

export const sendPasswordResetEmail = async (
  to: string,
  token: string,
  frontendUrl: string,
  organizationId?: string
) => {
  const brand = await getEmailBranding(organizationId);
  const link = `${frontendUrl}/set-password?token=${token}`;

  await sendActionEmail({
    organizationId,
    to,
    subject: `Set your password - ${brand.organizationName}`,
    preheader: 'Create your password to finish account setup.',
    eyebrow: 'Account setup',
    title: 'Set your password',
    intro: 'Choose a password to activate your account and start using the platform.',
    actionLabel: 'Set Password',
    actionUrl: link,
    bodyLead: 'This link will expire in 1 hour.',
    note: 'If you did not request this, you can ignore this email.',
  });
};

export const sendStudentVerificationEmail = async (
  to: string,
  token: string,
  frontendUrl: string,
  slug: string,
  organizationId?: string
) => {
  const brand = await getEmailBranding(organizationId);
  const baseUrl = frontendUrl.replace(/(https?:\/\/)/, `$1${slug}.`);
  const link = `${baseUrl}/verify-email?token=${token}`;

  await sendActionEmail({
    organizationId,
    to,
    subject: `Verify your email - ${brand.organizationName}`,
    preheader: 'Confirm your student account email address.',
    eyebrow: 'Student account',
    title: 'Verify your email',
    intro:
      'Thanks for signing up. Please confirm your email address to activate your student account.',
    actionLabel: 'Verify Email',
    actionUrl: link,
    bodyLead: 'This verification link will expire in 24 hours.',
    note: 'If you did not sign up for this account, you can ignore this email.',
  });

  logger.info(`Student verification email sent to ${to} for org ${slug}`);
};

export const sendStudentPasswordResetEmail = async (
  to: string,
  token: string,
  frontendUrl: string,
  slug: string,
  organizationId?: string
) => {
  const brand = await getEmailBranding(organizationId);
  const baseUrl = frontendUrl.replace(/(https?:\/\/)/, `$1${slug}.`);
  const link = `${baseUrl}/reset-password?token=${token}`;

  await sendActionEmail({
    organizationId,
    to,
    subject: `Reset your password - ${brand.organizationName}`,
    preheader: 'Reset your student account password.',
    eyebrow: 'Password reset',
    title: 'Reset your password',
    intro:
      'We received a request to reset your password. Use the link below to choose a new one.',
    actionLabel: 'Reset Password',
    actionUrl: link,
    bodyLead: 'This reset link will expire in 1 hour.',
    note: 'If you did not request a password reset, you can ignore this email.',
  });

  logger.info(`Student password reset email sent to ${to} for org ${slug}`);
};

export const sendAdminPasswordResetEmail = async (
  to: string,
  token: string,
  frontendUrl: string,
  slug: string,
  organizationId?: string
) => {
  const brand = await getEmailBranding(organizationId);
  const link = `${frontendUrl}/admin/reset-password?token=${token}&slug=${slug}`;

  await sendActionEmail({
    organizationId,
    to,
    subject: `Reset your password - ${brand.organizationName}`,
    preheader: 'Reset your admin or teacher account password.',
    eyebrow: 'Password reset',
    title: 'Reset your password',
    intro:
      'We received a request to reset your password. Use the link below to choose a new one.',
    actionLabel: 'Reset Password',
    actionUrl: link,
    bodyLead: 'This reset link will expire in 1 hour.',
    note: 'If you did not request a password reset, you can ignore this email.',
  });

  logger.info(`Admin password reset email sent to ${to} for org ${slug}`);
};

export const sendAnnouncementEmail = async ({
  organizationId,
  recipients,
  subject,
  html,
}: AnnouncementMailInput) => {
  if (recipients.length === 0) {
    return;
  }

  const config = await getMailConfigForOrganization(organizationId);
  const transporter = createTransporter(config);

  await transporter.sendMail({
    from: config.from,
    to: config.from,
    bcc: recipients,
    subject,
    html,
  });

  logger.info(
    `Announcement email sent to ${recipients.length} recipients for organization ${organizationId}`
  );
};

export const sendLiveSessionCreatedEmail = async ({
  organizationId,
  recipients,
  title,
  description,
  scheduledAt,
  duration,
  courseName,
  actionUrl,
}: LiveSessionCreatedMailInput) => {
  if (recipients.length === 0) {
    return;
  }

  const brand = await getEmailBranding(organizationId);
  const config = await getMailConfigForOrganization(organizationId);
  const transporter = createTransporter(config);
  const startsAt = new Date(scheduledAt);
  const formattedDate = Number.isNaN(startsAt.getTime())
    ? String(scheduledAt)
    : new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(startsAt);
  const audienceLabel = courseName || 'Organization-wide live session';

  await transporter.sendMail({
    from: config.from,
    to: config.from,
    bcc: recipients,
    subject: `New live session: ${title}`,
    html: buildEmailShell({
      brand,
      preheader: `A new live session has been scheduled${courseName ? ` for ${courseName}` : ''}.`,
      eyebrow: 'Live session',
      title: 'A new live session is ready',
      intro: `A new live session has just been scheduled${courseName ? ` for ${courseName}` : ''}.`,
      bodyHtml: `
        <div style="display:grid; gap:14px;">
          <div style="padding:16px 18px; border-radius:16px; background:#ffffff; border:1px solid #e5e7eb;">
            <div style="font-size:20px; font-weight:700; color:#0f172a;">${escapeHtml(title)}</div>
            ${
              description
                ? `<div style="margin-top:10px; color:#475569;">${escapeHtml(description)}</div>`
                : ''
            }
          </div>
          <div style="padding:18px; border-radius:16px; background:#f8fafc; border:1px solid #e2e8f0;">
            <div style="display:grid; gap:8px;">
              <div><strong>Audience:</strong> ${escapeHtml(audienceLabel)}</div>
              <div><strong>Starts:</strong> ${escapeHtml(formattedDate)}</div>
              <div><strong>Duration:</strong> ${escapeHtml(`${duration} minutes`)}</div>
            </div>
          </div>
          ${
            actionUrl
              ? `${renderActionButton('Open Live Session', actionUrl, brand.primaryColor)}${renderFallbackLink(
                  actionUrl,
                  brand.primaryColor
                )}`
              : ''
          }
        </div>
      `,
      note:
        'You can join from your student portal once the session opens. If the session is for a course, it will also appear inside that course.',
    }),
  });

  logger.info(
    `Live session email sent to ${recipients.length} recipients for organization ${organizationId}`
  );
};

export const sendAssignmentResultEmail = async ({
  organizationId,
  to,
  studentName,
  assignmentTitle,
  courseName,
  topicName,
  score,
  maxScore,
  feedback,
  actionUrl,
}: AssignmentResultMailInput) => {
  const brand = await getEmailBranding(organizationId);
  const scoreLine =
    typeof score === 'number'
      ? `${score}${typeof maxScore === 'number' ? ` / ${maxScore}` : ''}`
      : 'Available now';
  const intro = studentName
    ? `Hi ${studentName}, your assignment result has been published.`
    : 'Your assignment result has been published.';

  await sendMail({
    organizationId,
    to,
    subject: `Assignment result: ${assignmentTitle}`,
    html: buildEmailShell({
      brand,
      preheader: `Your result for ${assignmentTitle} is now available.`,
      eyebrow: 'Assignment result',
      title: 'Your result is ready',
      intro,
      bodyHtml: `
        <div style="display:grid; gap:14px;">
          <div style="padding:16px 18px; border-radius:16px; background:#ffffff; border:1px solid #e5e7eb;">
            <div style="font-size:20px; font-weight:700; color:#0f172a;">${escapeHtml(assignmentTitle)}</div>
            ${
              courseName
                ? `<div style="margin-top:10px; color:#475569;"><strong>Course:</strong> ${escapeHtml(courseName)}</div>`
                : ''
            }
            ${
              topicName
                ? `<div style="margin-top:6px; color:#475569;"><strong>Topic:</strong> ${escapeHtml(topicName)}</div>`
                : ''
            }
          </div>
          <div style="padding:18px; border-radius:16px; background:#f8fafc; border:1px solid #e2e8f0;">
            <div style="display:grid; gap:8px;">
              <div><strong>Score:</strong> ${escapeHtml(scoreLine)}</div>
              ${
                feedback
                  ? `<div><strong>Feedback:</strong> ${escapeHtml(feedback)}</div>`
                  : ''
              }
            </div>
          </div>
          ${
            actionUrl
              ? `${renderActionButton('View Result', actionUrl, brand.primaryColor)}${renderFallbackLink(
                  actionUrl,
                  brand.primaryColor
                )}`
              : ''
          }
        </div>
      `,
      note:
        'You can review the published result in your student assignment page. If you have questions, contact your teacher.',
    }),
  });

  logger.info(`Assignment result email sent to ${to} for organization ${organizationId}`);
};
