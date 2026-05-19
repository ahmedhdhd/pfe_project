"use client";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { useState } from "react";
import Link from "next/link";

export default function ResizableNavbarContainer() {
  const navItems = [
    {
      name: "Features",
      link: "#features",
    },
    {
      name: "How It Works",
      link: "#how-it-works",
    },
    {
      name: "Team",
      link: "#team",
    },
    {
      name: "Testimonials",
      link: "#testimonials",
    },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative w-full">
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="flex items-center gap-4">
            <NavbarButton variant="secondary" as={Link} href="/login">
              Login
            </NavbarButton>
            <NavbarButton
              variant="primary"
              as={Link}
              href="/create-organization"
            >
              Get Started
            </NavbarButton>
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.map((item, idx) => (
              <Link
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="block py-2">{item.name}</span>
              </Link>
            ))}
            <div className="flex w-full flex-col gap-4 pt-4">
              <NavbarButton
                as={Link}
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                variant="secondary"
                className="w-full"
              >
                Login
              </NavbarButton>
              <NavbarButton
                as={Link}
                href="/create-organization"
                onClick={() => setIsMobileMenuOpen(false)}
                variant="primary"
                className="w-full"
              >
                Get Started
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}
