"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { GraduationCap, Phone, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface AuthLayoutProps {
  client: {
    name: string;
    logo: string;
  };
  step: "phone" | "otp" | "username";
  children: ReactNode;
  countryCode?: string;
  phoneNumber?: string;
}

const stepTitles: Record<string, string> = {
  phone: "Sign In / Register",
  otp: "Enter OTP",
  username: "Choose Username",
};

const getStepDescription = (
  step: string,
  countryCode?: string,
  phoneNumber?: string
): string => {
  switch (step) {
    case "phone":
      return "Enter your phone number to get started";
    case "otp":
      return `We've sent a 6-digit OTP to ${countryCode || ""} ${phoneNumber || ""
        }`;
    case "username":
      return "Choose a username for your account";
    default:
      return "";
  }
};

export function AuthLayout({
  client,
  step,
  children,
  countryCode,
  phoneNumber,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-linear-to-br from-background to-muted/20 flex">
      {/* Left Side - Client Branding */}
      <div className="hidden lg:flex lg:w-2/5 bg-linear-to-br from-primary to-primary/80 flex-col justify-center p-8 text-white">
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
                  src={client.logo}
                  alt={client.name}
                  width={96}
                  height={96}
                  quality={100}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{client.name}</h1>
                <p className="text-primary-foreground/80">Learning Platform</p>
              </div>
            </div>
            <p className="text-primary-foreground/80">
              Welcome to {client.name}&apos;s learning platform. Sign in with
              OTP to access your courses.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Phone className="h-4 w-4" />
              </div>
              <span className="text-sm">Quick OTP login</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
              <span className="text-sm">Secure authentication</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="text-sm">Access your courses</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 lg:w-3/5 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                <Image
                  src={client.logo}
                  alt={client.name}
                  width={80}
                  height={80}
                  quality={100}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold">{client.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Learning Platform
                </p>
              </div>
            </div>
          </div>

          {/* Auth Form Card */}
          <Card>
            <CardHeader>
              <CardTitle>{stepTitles[step]}</CardTitle>
              <CardDescription>
                {getStepDescription(step, countryCode, phoneNumber)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {children}

              <div className="mt-6 pt-6 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    New users will be automatically registered
                  </p>
                  <Button variant="ghost" asChild>
                    <Link href="/">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Home
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
