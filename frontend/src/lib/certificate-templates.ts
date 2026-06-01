export const CERTIFICATE_TEMPLATES = [
  {
    id: "prestige-ivory",
    name: "Prestige Ivory",
    description: "Classic parchment look with refined navy and gold framing.",
    defaultPrimaryColor: "#1e3a5f",
    defaultSecondaryColor: "#c9a227",
    previewClass:
      "bg-[#f8f4eb] before:absolute before:inset-2 before:border-2 before:border-[#c9a227]/70 after:absolute after:inset-4 after:border after:border-[#1e3a5f]/30",
    textClass: "text-[#1e3a5f]",
    accentClass: "text-[#c9a227]",
    mutedClass: "text-[#5c6b7a]",
  },
  {
    id: "executive-navy",
    name: "Executive Navy",
    description: "Professional dark navy layout with crisp gold corner accents.",
    defaultPrimaryColor: "#f5d78e",
    defaultSecondaryColor: "#38bdf8",
    previewClass:
      "bg-gradient-to-br from-[#0f2744] via-[#132f52] to-[#0a1a2e] before:absolute before:left-0 before:top-0 before:h-12 before:w-12 before:border-l-4 before:border-t-4 before:border-[#f5d78e] after:absolute after:bottom-0 after:right-0 after:h-12 after:w-12 after:border-b-4 after:border-r-4 after:border-[#f5d78e]",
    textClass: "text-white",
    accentClass: "text-[#f5d78e]",
    mutedClass: "text-white/75",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Clean white certificate with a bold color stripe and modern type.",
    defaultPrimaryColor: "#4f46e5",
    defaultSecondaryColor: "#0ea5e9",
    previewClass:
      "bg-white before:absolute before:left-0 before:top-0 before:h-full before:w-3 before:bg-gradient-to-b before:from-indigo-600 before:to-sky-500",
    textClass: "text-slate-900",
    accentClass: "text-indigo-600",
    mutedClass: "text-slate-500",
  },
  {
    id: "royal-burgundy",
    name: "Royal Burgundy",
    description: "Rich burgundy frame with cream typography and elegant symmetry.",
    defaultPrimaryColor: "#f5efe3",
    defaultSecondaryColor: "#d4af37",
    previewClass:
      "bg-gradient-to-b from-[#5c1224] to-[#3d0c18] before:absolute before:inset-3 before:rounded-sm before:border before:border-[#d4af37]/60",
    textClass: "text-[#f5efe3]",
    accentClass: "text-[#d4af37]",
    mutedClass: "text-[#f5efe3]/80",
  },
] as const;

export type CertificateTemplateId = (typeof CERTIFICATE_TEMPLATES)[number]["id"];

export const DEFAULT_CERTIFICATE_TEMPLATE_ID: CertificateTemplateId = "prestige-ivory";

export const DEFAULT_CERTIFICATE_HEADING = "Certificate of Completion";

const LEGACY_TEMPLATE_ID_MAP: Record<string, CertificateTemplateId> = {
  "classic-border": "prestige-ivory",
  "modern-ribbon": "executive-navy",
  "seal-elegant": "royal-burgundy",
  "minimal-grid": "modern-minimal",
};

export const normalizeCertificateTemplateId = (
  templateId?: string | null
): CertificateTemplateId => {
  if (!templateId) {
    return DEFAULT_CERTIFICATE_TEMPLATE_ID;
  }

  const legacy = LEGACY_TEMPLATE_ID_MAP[templateId];
  if (legacy) {
    return legacy;
  }

  const match = CERTIFICATE_TEMPLATES.find((template) => template.id === templateId);
  return match?.id ?? DEFAULT_CERTIFICATE_TEMPLATE_ID;
};

export const getCertificateTemplate = (templateId?: string | null) => {
  const normalizedId = normalizeCertificateTemplateId(templateId);
  return (
    CERTIFICATE_TEMPLATES.find((template) => template.id === normalizedId) ||
    CERTIFICATE_TEMPLATES[0]
  );
};
