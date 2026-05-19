"use client";
import React from "react";
import {
  Mail,
  Phone,
  MapPin,
  FacebookIcon,
  Instagram,
  Linkedin,
  Youtube,
  GraduationCap,
} from "lucide-react";
import { SparklesCore } from "./sparkles";

export const FooterBackgroundGradient = () => {
  return (
    <div
      className="absolute inset-0 z-0"
      style={{
        background:
          "radial-gradient(125% 125% at 50% 10%, hsl(var(--card)/0.3) 50%, hsl(var(--primary)/0.2) 100%)",
      }}
    />
  );
};

function HoverFooter() {
  // Footer link data
  const footerLinks = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Pricing", href: "#pricing" },
        { label: "How It Works", href: "#how-it-works" },
        { label: "Demo", href: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "#" },
        { label: "Support", href: "#" },
        { label: "Blog", href: "#" },
        { label: "Changelog", href: "#" },
      ],
    },
  ];

  // Contact info data
  const contactInfo = [
    {
      icon: <Mail size={18} className="text-primary" />,
      text: "info@teslaacademy.com",
      href: "mailto:info@teslaacademy.com",
    },
    {
      icon: <Phone size={18} className="text-primary" />,
      text: "+1 (555) 123-4567",
      href: "tel:+15551234567",
    },
    {
      icon: <MapPin size={18} className="text-primary" />,
      text: "San Francisco, CA",
    },
  ];

  // Social media icons
  const socialLinks = [
    { icon: <Linkedin size={20} />, label: "LinkedIn", href: "#" },
    { icon: <Instagram size={20} />, label: "Instagram", href: "#" },
    { icon: <FacebookIcon size={20} />, label: "Facebook", href: "#" },
    { icon: <Youtube size={20} />, label: "YouTube", href: "#" },
  ];

  return (
    <footer className="bg-card relative w-full overflow-hidden border-t border-border">
      <div className="max-w-7xl mx-auto p-8 md:p-14 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 lg:gap-16 pb-12">
          {/* Brand section */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="text-primary text-3xl" />
              <span className="text-foreground text-3xl font-bold">
                TeslaAcademy
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Modern Learning Management System for educational institutions.
              Empower educators and engage students.
            </p>
          </div>

          {/* Footer link sections */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-foreground text-lg font-semibold mb-6">
                {section.title}
              </h4>
              <ul className="space-y-3 text-muted-foreground">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact section */}
          <div>
            <h4 className="text-foreground text-lg font-semibold mb-6">
              Contact Us
            </h4>
            <ul className="space-y-4 text-muted-foreground">
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-center space-x-3">
                  {item.icon}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="hover:text-primary transition-colors"
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span className="hover:text-primary transition-colors">
                      {item.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr className="border-t border-border my-8" />

        {/* Footer bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm space-y-4 md:space-y-0">
          {/* Social icons */}
          <div className="flex space-x-6 text-muted-foreground">
            {socialLinks.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="hover:text-primary transition-colors"
              >
                {icon}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-center md:text-left text-muted-foreground">
            &copy; {new Date().getFullYear()} TeslaAcademy. All rights reserved.
          </p>
        </div>
      </div>

      {/* Sparkles effect */}
      <div className="lg:flex hidden h-96 -mt-48 -mb-32 relative pointer-events-none overflow-hidden">
        <h1 className="absolute inset-0 flex items-center justify-center text-6xl md:text-8xl font-bold text-foreground/20 select-none z-10">
          TeslaAcademy
        </h1>
        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1.5}
          particleDensity={800}
          className="w-full h-full"
          particleColor="#3ca2fa"
        />
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
}

export default HoverFooter;
