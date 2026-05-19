"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface BrandingSidebarProps {
  title?: string;
  subtitle?: string;
  features?: string[];
  logo?: string;
  logoAlt?: string;
  logoWidth?: number;
  logoHeight?: number;
  className?: string;
}

export function BrandingSidebar({
  title = "",
  subtitle = "",
  features = [
    "Multi-tenant architecture",
    "Custom domain support",
    "Scalable infrastructure",
  ],
  logo = "/images/Logo.png",
  logoAlt = "TeslaAcademy Logo",
  logoWidth = 400,
  logoHeight = 300,
  className = "",
}: BrandingSidebarProps) {
  return (
    <div
      className={`hidden lg:flex lg:w-2/5 bg-linear-to-br from-primary/10 to-primary/5 flex-col justify-center p-12 relative ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center h-full flex flex-col justify-center"
      >
        <div className="mb-12">
          <div className="mx-auto mb-8 flex h-32 max-w-[280px] items-center justify-center">
            <Image
              src={logo}
              alt={logoAlt}
              width={logoWidth}
              height={logoHeight}
              className="max-h-32 w-auto max-w-full object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl font-bold mb-6">{title}</h1>
          <p className="text-xl text-muted-foreground">{subtitle}</p>
        </div>

        <div className="space-y-6 text-left">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="h-3 w-3 bg-primary rounded-full"></div>
              <span className="text-base">{feature}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default BrandingSidebar;
