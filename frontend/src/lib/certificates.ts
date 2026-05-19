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
  DEFAULT_CERTIFICATE_TEMPLATE_ID,
  getCertificateTemplate,
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

const hexToRgb = (hex?: string | null, fallback = "#4f46e5") => {
  const normalized = (hex && /^#?[0-9a-fA-F]{6}$/.test(hex)
    ? hex.replace("#", "")
    : fallback.replace("#", "")) as string;

  return rgb(
    parseInt(normalized.slice(0, 2), 16) / 255,
    parseInt(normalized.slice(2, 4), 16) / 255,
    parseInt(normalized.slice(4, 6), 16) / 255
  );
};

const lighten = (color: RGB, amount: number) =>
  rgb(
    Math.min(1, color.red + (1 - color.red) * amount),
    Math.min(1, color.green + (1 - color.green) * amount),
    Math.min(1, color.blue + (1 - color.blue) * amount)
  );

const darken = (color: RGB, amount: number) =>
  rgb(
    Math.max(0, color.red * (1 - amount)),
    Math.max(0, color.green * (1 - amount)),
    Math.max(0, color.blue * (1 - amount))
  );

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

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "";

    let image: PDFImage;
    if (contentType.includes("jpeg") || contentType.includes("jpg") || logoUrl.toLowerCase().includes(".jpg") || logoUrl.toLowerCase().includes(".jpeg")) {
      image = await pdfDoc.embedJpg(arrayBuffer);
    } else {
      image = await pdfDoc.embedPng(arrayBuffer);
    }

    const imgDims = image.scale(1);
    const maxWidth = 92;
    const maxHeight = 58;
    const scale = Math.min(maxWidth / imgDims.width, maxHeight / imgDims.height, 1);
    
    return {
      image,
      width: Math.max(1, Math.round(imgDims.width * scale)),
      height: Math.max(1, Math.round(imgDims.height * scale)),
    };
  } catch (err) {
    console.error("Failed to load logo for PDF:", err);
    return null;
  }
};

const drawClassicBorder = (
  page: PDFPage,
  primary: RGB,
  secondary: RGB
) => {
  const width = page.getWidth();
  const height = page.getHeight();

  // Full dark background (Midnight)
  page.drawRectangle({
    x: 0, y: 0, width, height,
    color: rgb(0.05, 0.07, 0.1),
  });

  // Gold borders
  const gold = rgb(0.85, 0.65, 0.13);
  page.drawRectangle({
    x: 14, y: 14, width: width - 28, height: height - 28,
    borderWidth: 4, borderColor: gold, color: undefined
  });
  page.drawRectangle({
    x: 24, y: 24, width: width - 48, height: height - 48,
    borderWidth: 1, borderColor: rgb(0.6, 0.4, 0.1), color: undefined
  });
};

const drawModernRibbon = (
  page: PDFPage,
  primary: RGB,
  secondary: RGB
) => {
  const width = page.getWidth();
  const height = page.getHeight();

  // Ocean Blue background
  page.drawRectangle({
    x: 0, y: 0, width, height,
    color: rgb(0.08, 0.25, 0.45),
  });

  // Cyan geometric ribbon
  page.drawRectangle({
    x: 0, y: height - 60, width, height: 60,
    color: rgb(0.15, 0.75, 0.85),
  });
  page.drawRectangle({
    x: 0, y: 0, width, height: 30,
    color: rgb(0.1, 0.5, 0.7),
  });
};

const drawElegantSeal = (
  page: PDFPage,
  primary: RGB,
  secondary: RGB
) => {
  const width = page.getWidth();
  const height = page.getHeight();

  // Sunset Dark background
  page.drawRectangle({
    x: 0, y: 0, width, height,
    color: rgb(0.15, 0.05, 0.1),
  });

  // Orange/Rose geometric accents
  const rose = rgb(0.9, 0.2, 0.4);
  page.drawCircle({
    x: 0, y: height, size: 200, color: rose, opacity: 0.15
  });
  page.drawCircle({
    x: width, y: 0, size: 300, color: rgb(0.9, 0.5, 0.1), opacity: 0.1
  });
  
  page.drawRectangle({
    x: 24, y: 24, width: width - 48, height: height - 48,
    borderWidth: 2, borderColor: rose, color: undefined
  });
};

const drawMinimalGrid = (
  page: PDFPage,
  primary: RGB,
  secondary: RGB
) => {
  const width = page.getWidth();
  const height = page.getHeight();

  // Emerald Dark background
  page.drawRectangle({
    x: 0, y: 0, width, height,
    color: rgb(0.02, 0.15, 0.08),
  });

  // Emerald green subtle grid lines
  const emeraldLine = rgb(0.1, 0.4, 0.2);
  [100, 200, width - 200, width - 100].forEach((offset) => {
    page.drawLine({
      start: { x: offset, y: 0 },
      end: { x: offset, y: height },
      color: emeraldLine, thickness: 1, opacity: 0.3,
    });
  });

  page.drawRectangle({
    x: 40, y: 40, width: width - 80, height: height - 80,
    borderWidth: 1, borderColor: rgb(0.2, 0.8, 0.4), color: undefined, opacity: 0.5
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
  switch (templateId || DEFAULT_CERTIFICATE_TEMPLATE_ID) {
    case "modern-ribbon":
      drawModernRibbon(page, primary, secondary);
      break;
    case "seal-elegant":
      drawElegantSeal(page, primary, secondary);
      break;
    case "minimal-grid":
      drawMinimalGrid(page, primary, secondary);
      break;
    default:
      drawClassicBorder(page, primary, secondary);
      break;
  }
};

export async function downloadBatchCertificatePdf({
  certificate,
  verificationUrl,
}: {
  certificate: BatchCertificateIssuePayload;
  verificationUrl: string;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(A4_LANDSCAPE);
  const width = page.getWidth();
  const height = page.getHeight();

  const displayFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const serifFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

  const primaryColor = hexToRgb(certificate.primaryColor, "#4f46e5");
  const secondaryColor = hexToRgb(certificate.secondaryColor, "#0ea5e9");
  const template = getCertificateTemplate(certificate.templateId);
  const logo = await loadLogoImage(pdfDoc, certificate.logoUrl);

  // Use crisp white and subtle grey for text since all new templates are dark mode
  const titleColor = rgb(1, 1, 1);
  const mutedColor = rgb(0.8, 0.85, 0.9);
  
  // Custom accent color for the main names depending on the template
  let accentColor = rgb(1, 1, 1);
  if (template.id === "classic-border") accentColor = rgb(0.9, 0.7, 0.2); // Gold
  if (template.id === "modern-ribbon") accentColor = rgb(0.2, 0.8, 0.9); // Cyan
  if (template.id === "seal-elegant") accentColor = rgb(1, 0.5, 0.5); // Rose
  if (template.id === "minimal-grid") accentColor = rgb(0.4, 0.9, 0.6); // Emerald

  applyTemplateChrome({
    page,
    templateId: template.id,
    primary: primaryColor,
    secondary: secondaryColor,
  });

  if (logo) {
    page.drawImage(logo.image, {
      x: (width - logo.width) / 2,
      y: height * 0.855,
      width: logo.width,
      height: logo.height,
    });
  }

  drawCenteredText({
    page,
    text: certificate.organizationName || certificate.issuerName || "TeslaAcademy",
    y: logo ? height * 0.8 : height * 0.84,
    size: 14,
    font: displayFont,
    color: titleColor,
  });

  drawCenteredText({
    page,
    text: "Certificate of Completion",
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
    text: certificate.certificateTitle || `${certificate.batchName} Certificate`,
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
    opacity: 0.6
  });
  page.drawLine({
    start: { x: width - 265, y: 118 },
    end: { x: width - 70, y: 118 },
    color: accentColor,
    thickness: 1.5,
    opacity: 0.6
  });

  page.drawText(certificate.issuerName || certificate.organizationName || "TeslaAcademy", {
    x: 70,
    y: 96,
    size: 12,
    font: displayFont,
    color: titleColor,
  });
  page.drawText("Platform", {
    x: 70,
    y: 80,
    size: 10,
    font: bodyFont,
    color: mutedColor,
  });

  page.drawText(certificate.signerName || "Academic Team", {
    x: width - 265,
    y: 96,
    size: 12,
    font: displayFont,
    color: titleColor,
  });
  page.drawText("Course Creator", {
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
  page.drawText(`Verify: ${verificationUrl}`, {
    x: 44,
    y: 14,
    size: 8,
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
