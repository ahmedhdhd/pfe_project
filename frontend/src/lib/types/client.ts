export interface Client {
  id: string;
  organizationId: string;
  name: string;
  domain: string; // e.g., "khanacademy.teslaacademy.in"
  subdomain: string; // e.g., "khanacademy"
  basePath: string; // e.g., "teslaacademy"
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  theme: "light" | "dark" | "system";
  isActive: boolean;
  createdAt: string; // ISO 8601 format
  settings: ClientSettings;
}

export interface ClientSettings {
  allowSelfRegistration: boolean;
  maxUsers: number;
  features: string[];
  customBranding: boolean;
  customDomain: boolean;
  analytics: boolean;
  apiAccess: boolean;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
  };
}

export interface ClientHomepage {
  clientId: string;
  title: string;
  tagline: string;
  description: string;
  heroImage: string;
  features: HomepageFeature[];
  testimonials: Testimonial[];
  ctaText: string;
  ctaLink: string;
}

export interface HomepageFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  avatar: string;
}
