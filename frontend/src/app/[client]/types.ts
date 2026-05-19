export interface ClientHomepageFeature {
  id: number;
  title: string;
  description: string;
  icon: string;
}

export interface ClientHomepageTestimonial {
  id: number;
  name: string;
  role: string;
  content: string;
}

export interface ClientHomepageFAQ {
  id: number;
  question: string;
  answer: string;
}

export interface ClientHomepageData {
  title: string;
  tagline: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  motto: string;
  contactEmail: string;
  contactPhone: string;
  supportEmail: string;
  bannerUrls: string[];
  features: ClientHomepageFeature[];
  testimonials: ClientHomepageTestimonial[];
  faq: ClientHomepageFAQ[];
  socialLinks: Record<string, string>;
}


