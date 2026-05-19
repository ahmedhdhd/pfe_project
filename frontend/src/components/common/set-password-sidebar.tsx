"use client";

import { motion } from "framer-motion";
import { CheckCircle, Shield } from "lucide-react";
import Image from "next/image";

interface SetPasswordSidebarProps {
  clientName?: string;
  clientLogo?: string;
}

export function SetPasswordSidebar({
  clientName = "Organization",
  clientLogo = "/images/Logo.png",
}: SetPasswordSidebarProps) {
  return (
    <div className="hidden lg:flex lg:w-2/5 bg-linear-to-br from-primary to-primary/80 flex-col justify-center p-8 text-primary-foreground">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md"
      >
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
              <Image
                src={clientLogo}
                alt={clientName}
                width={96}
                height={96}
                quality={100}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{clientName}</h1>
              <p className="text-primary-foreground/80">Password Setup</p>
            </div>
          </div>
          <p className="text-primary-foreground/80">
            Create a strong password to protect your account with {clientName}.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-4 w-4" />
            </div>
            <span className="text-sm">Account created</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-4 w-4" />
            </div>
            <span className="text-sm">Email verified</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-foreground/30 rounded-full flex items-center justify-center">
              <Shield className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Set secure password</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
