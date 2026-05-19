export const CERTIFICATE_TEMPLATES = [
  {
    id: "classic-border",
    name: "Midnight Gold",
    description: "Deep luxury background with vibrant golden accents.",
  },
  {
    id: "modern-ribbon",
    name: "Ocean Gradient",
    description: "A stunning, vibrant cyan-to-blue modern gradient.",
  },
  {
    id: "seal-elegant",
    name: "Sunset Glow",
    description: "Rich, warm gradient blend of sunset orange and purple.",
  },
  {
    id: "minimal-grid",
    name: "Emerald Glass",
    description: "Premium dark emerald aesthetic with glassmorphism details.",
  },
] as const;

export type CertificateTemplateId = (typeof CERTIFICATE_TEMPLATES)[number]["id"];

export const DEFAULT_CERTIFICATE_TEMPLATE_ID: CertificateTemplateId =
  "classic-border";

export const getCertificateTemplate = (templateId?: string | null) =>
  CERTIFICATE_TEMPLATES.find((template) => template.id === templateId) ||
  CERTIFICATE_TEMPLATES[0];
