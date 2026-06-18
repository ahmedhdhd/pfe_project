"use client";

import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { Facebook, Twitter, Linkedin, Instagram, Youtube } from "@/components/icons";
import type { ClientHomepageData } from "../types";
import type { Client } from "@/lib/types/client";

interface ClientFooterProps {
  homepage: ClientHomepageData;
  client: Client;
}

const socialIconMap: Record<string, ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  x: Twitter,
  facebook: Facebook,
  fb: Facebook,
  linkedin: Linkedin,
  instagram: Instagram,
  insta: Instagram,
  youtube: Youtube,
  yt: Youtube,
};

export function ClientFooter({ homepage, client }: ClientFooterProps) {
  const socialEntries = Object.entries(homepage.socialLinks || {});
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm py-12">
      <div className="px-4">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden ring-1 ring-primary/20">
                <Image
                  src={client.logo}
                  alt={client.name}
                  width={36}
                  height={36}
                  className="object-contain p-0.5"
                />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-base tracking-tight">
                  {client.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {client.domain}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs text-center md:text-left">
              Empowering learners with world-class education technology.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-4">
            {(homepage.contactEmail ||
              homepage.supportEmail ||
              homepage.contactPhone) && (
              <div className="flex flex-col items-center md:items-end gap-1 text-sm text-muted-foreground">
                {(homepage.contactEmail || homepage.supportEmail) && (
                  <a
                    href={`mailto:${
                      homepage.supportEmail || homepage.contactEmail
                    }`}
                    className="hover:text-primary transition-colors"
                  >
                    {homepage.supportEmail || homepage.contactEmail}
                  </a>
                )}
                {homepage.contactPhone && <span>{homepage.contactPhone}</span>}
              </div>
            )}

            {socialEntries.length > 0 && (
              <div className="flex items-center gap-4">
                {socialEntries.map(([platform, url]) => {
                  const key = platform.toLowerCase();
                  const Icon = socialIconMap[key];
                  return (
                    <Link
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                      aria-label={platform}
                    >
                      {Icon ? (
                        <Icon className="h-4 w-4" />
                      ) : (
                        <span className="text-[10px] capitalize font-bold">
                          {platform.slice(0, 1)}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto max-w-6xl mt-12 pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            © {year} {client.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-1">
            <span>Powered by</span>
            <a
              href="https://teslaacademy.com"
              target="_blank"
              rel="noreferrer"
              className="font-semibold hover:text-primary transition-colors"
            >
              TeslaAcademy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
