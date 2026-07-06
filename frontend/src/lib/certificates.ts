import {
  PDFDocument,
  PDFPage,
  PDFFont,
  StandardFonts,
  rgb,
  type PDFImage,
  type RGB,
} from "pdf-lib";
import type { BatchCertificateIssuePayload } from "@/hooks/api";
import {
  DEFAULT_CERTIFICATE_HEADING,
  getCertificateTemplate,
  normalizeCertificateTemplateId,
} from "@/lib/certificate-templates";

const A4_LANDSCAPE: [number, number] = [842, 595];

const drawCenteredText = ({
  page,
  text,
  y,
  size,
  font,
  color,
}: {
  page: PDFPage;
  text: string;
  y: number;
  size: number;
  font: PDFFont;
  color: RGB;
}) => {
  const width = font.widthOfTextAtSize(text, size);
  const x = Math.max((page.getWidth() - width) / 2, 36);
  page.drawText(text, { x, y, size, font, color });
};

const hexToRgb = (hex?: string | null, fallback = "#1e3a5f") => {
  const normalized = (hex && /^#?[0-9a-fA-F]{6}$/.test(hex)
    ? hex.replace("#", "")
    : fallback.replace("#", "")) as string;

  return rgb(
    parseInt(normalized.slice(0, 2), 16) / 255,
    parseInt(normalized.slice(2, 4), 16) / 255,
    parseInt(normalized.slice(4, 6), 16) / 255
  );
};

const getCertificateFileName = (certificate: BatchCertificateIssuePayload) =>
  `${certificate.batchName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-certificate.pdf`;

const loadLogoImage = async (
  pdfDoc: PDFDocument,
  logoUrl?: string | null
): Promise<{ image: PDFImage; width: number; height: number } | null> => {
  if (!logoUrl || typeof window === "undefined") {
    return null;
  }

  try {
    const response = await fetch(logoUrl, { cache: "no-store", mode: "cors" });
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    // Render the organization logo into a circular canvas so it appears
    // rounded on the certificate, whatever its original shape.
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.clip();

    const inner = size * 0.82;
    const scale = Math.min(inner / bitmap.width, inner / bitmap.height);
    const drawWidth = bitmap.width * scale;
    const drawHeight = bitmap.height * scale;
    ctx.drawImage(
      bitmap,
      (size - drawWidth) / 2,
      (size - drawHeight) / 2,
      drawWidth,
      drawHeight
    );

    const pngBlob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("Canvas export failed")),
        "image/png"
      )
    );
    const image = await pdfDoc.embedPng(await pngBlob.arrayBuffer());

    const displaySize = 60;
    return { image, width: displaySize, height: displaySize };
  } catch (err) {
    console.error("Failed to load logo for PDF:", err);
    return null;
  }
};

const drawPrestigeIvory = (page: PDFPage, primary: RGB, secondary: RGB) => {
  const width = page.getWidth();
  const height = page.getHeight();

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.97, 0.96, 0.93),
  });

  page.drawRectangle({
    x: 18,
    y: 18,
    width: width - 36,
    height: height - 36,
    borderWidth: 3,
    borderColor: secondary,
    color: undefined,
  });
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderWidth: 1,
    borderColor: primary,
    color: undefined,
    opacity: 0.35,
  });
};

const drawExecutiveNavy = (page: PDFPage, primary: RGB, secondary: RGB) => {
  const width = page.getWidth();
  const height = page.getHeight();

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.06, 0.12, 0.22),
  });

  page.drawRectangle({
    x: 0,
    y: height - 8,
    width,
    height: 8,
    color: secondary,
    opacity: 0.85,
  });

  const corner = 56;
  page.drawLine({
    start: { x: 24, y: height - 24 },
    end: { x: 24 + corner, y: height - 24 },
    color: primary,
    thickness: 3,
  });
  page.drawLine({
    start: { x: 24, y: height - 24 },
    end: { x: 24, y: height - 24 - corner },
    color: primary,
    thickness: 3,
  });
  page.drawLine({
    start: { x: width - 24, y: 24 },
    end: { x: width - 24 - corner, y: 24 },
    color: primary,
    thickness: 3,
  });
  page.drawLine({
    start: { x: width - 24, y: 24 },
    end: { x: width - 24, y: 24 + corner },
    color: primary,
    thickness: 3,
  });
};

const drawModernMinimal = (page: PDFPage, primary: RGB, secondary: RGB) => {
  const width = page.getWidth();
  const height = page.getHeight();

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(1, 1, 1),
  });

  page.drawRectangle({
    x: 0,
    y: 0,
    width: 18,
    height,
    color: primary,
  });

  page.drawRectangle({
    x: 0,
    y: height - 6,
    width,
    height: 6,
    color: secondary,
    opacity: 0.9,
  });

  page.drawRectangle({
    x: 36,
    y: 36,
    width: width - 72,
    height: height - 72,
    borderWidth: 1,
    borderColor: rgb(0.88, 0.9, 0.93),
    color: undefined,
  });
};

const drawRoyalBurgundy = (page: PDFPage, primary: RGB, secondary: RGB) => {
  const width = page.getWidth();
  const height = page.getHeight();

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.22, 0.05, 0.1),
  });

  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    borderWidth: 2,
    borderColor: secondary,
    color: undefined,
    opacity: 0.9,
  });

  page.drawRectangle({
    x: 40,
    y: 40,
    width: width - 80,
    height: height - 80,
    borderWidth: 1,
    borderColor: primary,
    color: undefined,
    opacity: 0.25,
  });
};

const applyTemplateChrome = ({
  page,
  templateId,
  primary,
  secondary,
}: {
  page: PDFPage;
  templateId?: string | null;
  primary: RGB;
  secondary: RGB;
}) => {
  const normalized = normalizeCertificateTemplateId(templateId);

  switch (normalized) {
    case "executive-navy":
      drawExecutiveNavy(page, primary, secondary);
      break;
    case "modern-minimal":
      drawModernMinimal(page, primary, secondary);
      break;
    case "royal-burgundy":
      drawRoyalBurgundy(page, primary, secondary);
      break;
    default:
      drawPrestigeIvory(page, primary, secondary);
      break;
  }
};

const getTemplateTextColors = (templateId: string) => {
  switch (normalizeCertificateTemplateId(templateId)) {
    case "executive-navy":
      return {
        title: rgb(1, 1, 1),
        muted: rgb(0.82, 0.87, 0.94),
        accentFromPrimary: true,
      };
    case "royal-burgundy":
      return {
        title: rgb(0.96, 0.94, 0.9),
        muted: rgb(0.9, 0.86, 0.82),
        accentFromPrimary: true,
      };
    case "modern-minimal":
      return {
        title: rgb(0.1, 0.12, 0.16),
        muted: rgb(0.38, 0.42, 0.5),
        accentFromPrimary: false,
      };
    default:
      return {
        title: rgb(0.12, 0.18, 0.28),
        muted: rgb(0.36, 0.42, 0.5),
        accentFromPrimary: false,
      };
  }
};

export async function downloadBatchCertificatePdf({
  certificate,
}: {
  certificate: BatchCertificateIssuePayload;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(A4_LANDSCAPE);
  const width = page.getWidth();
  const height = page.getHeight();

  const displayFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const serifFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

  const template = getCertificateTemplate(certificate.templateId);
  const primaryColor = hexToRgb(
    certificate.primaryColor,
    template.defaultPrimaryColor
  );
  const secondaryColor = hexToRgb(
    certificate.secondaryColor,
    template.defaultSecondaryColor
  );
  const logo = await loadLogoImage(pdfDoc, certificate.logoUrl);
  const textColors = getTemplateTextColors(template.id);
  const titleColor = textColors.title;
  const mutedColor = textColors.muted;
  const accentColor = textColors.accentFromPrimary
    ? primaryColor
    : secondaryColor;

  applyTemplateChrome({
    page,
    templateId: template.id,
    primary: primaryColor,
    secondary: secondaryColor,
  });

  const heading =
    certificate.heading?.trim() || DEFAULT_CERTIFICATE_HEADING;

  if (logo) {
    page.drawImage(logo.image, {
      x: (width - logo.width) / 2,
      y: height * 0.825,
      width: logo.width,
      height: logo.height,
    });
  }

  drawCenteredText({
    page,
    text:
      certificate.organizationName ||
      certificate.issuerName ||
      "TeslaAcademy",
    y: logo ? height * 0.8 : height * 0.84,
    size: 14,
    font: displayFont,
    color: titleColor,
  });

  drawCenteredText({
    page,
    text: heading,
    y: height * 0.76,
    size: 29,
    font: displayFont,
    color: titleColor,
  });

  drawCenteredText({
    page,
    text: "This certifies that",
    y: height * 0.675,
    size: 14,
    font: bodyFont,
    color: mutedColor,
  });

  drawCenteredText({
    page,
    text: certificate.recipientName,
    y: height * 0.585,
    size: Math.min(Math.max(width * 0.04, 30), 40),
    font: serifFont,
    color: accentColor,
  });

  drawCenteredText({
    page,
    text: "has successfully completed the course",
    y: height * 0.505,
    size: 14,
    font: bodyFont,
    color: mutedColor,
  });

  drawCenteredText({
    page,
    text:
      certificate.certificateTitle ||
      `${certificate.batchName} Certificate`,
    y: height * 0.43,
    size: 22,
    font: displayFont,
    color: accentColor,
  });

  drawCenteredText({
    page,
    text: certificate.batchName,
    y: height * 0.38,
    size: 13,
    font: bodyFont,
    color: mutedColor,
  });

  drawCenteredText({
    page,
    text: `Issued on ${new Date(certificate.issuedAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`,
    y: height * 0.31,
    size: 12,
    font: bodyFont,
    color: mutedColor,
  });

  page.drawLine({
    start: { x: 70, y: 118 },
    end: { x: 265, y: 118 },
    color: accentColor,
    thickness: 1.5,
    opacity: 0.6,
  });
  page.drawLine({
    start: { x: width - 265, y: 118 },
    end: { x: width - 70, y: 118 },
    color: accentColor,
    thickness: 1.5,
    opacity: 0.6,
  });

  const issuerLabel =
    certificate.issuerName ||
    certificate.organizationName ||
    "TeslaAcademy";
  const signerLabel = certificate.signerName || "Academic Team";
  const signerRole = certificate.signerTitle || "Course Creator";

  page.drawText(issuerLabel, {
    x: 70,
    y: 96,
    size: 12,
    font: displayFont,
    color: titleColor,
  });
  page.drawText("Issuer", {
    x: 70,
    y: 80,
    size: 10,
    font: bodyFont,
    color: mutedColor,
  });

  page.drawText(signerLabel, {
    x: width - 265,
    y: 96,
    size: 12,
    font: displayFont,
    color: titleColor,
  });
  page.drawText(signerRole, {
    x: width - 265,
    y: 80,
    size: 10,
    font: bodyFont,
    color: mutedColor,
  });

  page.drawText(`Credential ID: ${certificate.credentialId}`, {
    x: 44,
    y: 28,
    size: 9,
    font: bodyFont,
    color: mutedColor,
  });

  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = getCertificateFileName(certificate);
  link.click();
  window.URL.revokeObjectURL(blobUrl);
}
