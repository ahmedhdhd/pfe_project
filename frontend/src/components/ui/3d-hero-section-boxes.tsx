"use client";

import React, { useEffect, useRef } from "react";
import Spline from "@splinetool/react-spline";
import Link from "next/link";

function HeroSplineBackground() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        pointerEvents: "auto",
        overflow: "hidden",
      }}
    >
      <Spline
        style={{
          width: "100%",
          height: "100vh",
          pointerEvents: "auto",
        }}
        scene="https://prod.spline.design/dJqTIQ-tE3ULUPMi/scene.splinecode"
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100vh",
          background: `
            linear-gradient(to right, rgba(0, 0, 0, 0.8), transparent 30%, transparent 70%, rgba(0, 0, 0, 0.8)),
            linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.9))
          `,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function ScreenshotSection({
  screenshotRef,
}: {
  screenshotRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section className="relative z-10 container mx-auto px-4 md:px-6 lg:px-8 mt-11 md:mt-12">
      <div
        ref={screenshotRef}
        className="bg-card rounded-xl overflow-hidden shadow-2xl border-2 border-primary/20 w-full md:w-[80%] lg:w-[70%] mx-auto"
      >
        <div>
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&auto=format&fit=crop&q=80"
            alt="TeslaAcademy LMS Dashboard"
            className="w-full h-auto block rounded-lg mx-auto"
          />
        </div>
      </div>
    </section>
  );
}

function HeroContent() {
  return (
    <div className="text-foreground px-4 max-w-7xl mx-auto w-full flex flex-col lg:flex-row justify-between items-start lg:items-center py-16">
      <div className="w-full lg:w-1/2 pr-0 lg:pr-8 mb-8 lg:mb-0">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight tracking-wide text-white drop-shadow-lg">
          Your Institute
          <br />
          <span className="bg-linear-to-r from-primary to-chart-3 bg-clip-text text-transparent">
            One Platform
          </span>
          <br />
          <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white">
            Infinite Learning
          </span>
        </h1>
        <div className="text-sm text-gray-200 opacity-90 mt-4 font-medium">
          UNIFIED LMS \ MULTI-TENANT \ SCALABLE \ SECURE
        </div>
      </div>

      <div className="w-full lg:w-1/2 pl-0 lg:pl-8 flex flex-col items-start">
        <p className="text-base sm:text-lg opacity-90 mb-6 max-w-md text-gray-100">
          The all-in-one learning management platform that unifies your entire
          educational ecosystem. Manage courses, students, content, and
          analytics from one powerful system.
        </p>
        <div className="flex pointer-events-auto flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-3">
          <Link
            href="/create-organization"
            className="pointer-events-auto bg-primary text-primary-foreground font-semibold py-2.5 sm:py-3.5 px-6 sm:px-8 rounded-full transition duration-300 hover:bg-primary/90 hover:scale-105 flex items-center justify-center w-full sm:w-auto shadow-lg"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4C11.4477 4 11 4.44772 11 5V11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H11V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V13H19C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11H13V5C13 4.44772 12.5523 4 12 4Z"
                fill="currentColor"
              />
            </svg>
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}

const HeroSection = () => {
  const screenshotRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (screenshotRef.current && heroContentRef.current) {
        requestAnimationFrame(() => {
          const scrollPosition = window.pageYOffset;

          if (screenshotRef.current) {
            screenshotRef.current.style.transform = `translateY(-${
              scrollPosition * 0.5
            }px)`;
          }

          const maxScroll = 400;
          const opacity = 1 - Math.min(scrollPosition / maxScroll, 1);
          if (heroContentRef.current) {
            heroContentRef.current.style.opacity = opacity.toString();
          }
        });
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative">
      <div className="relative min-h-screen">
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <HeroSplineBackground />
        </div>

        <div
          ref={heroContentRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <HeroContent />
        </div>
      </div>

      <div
        className="bg-background relative z-10"
        style={{ marginTop: "-10vh" }}
      >
        <ScreenshotSection screenshotRef={screenshotRef} />
        <div className="container mx-auto text-foreground">
          <h2 className="text-4xl font-bold text-center mb-8 bg-linear-to-r from-primary to-chart-3 bg-clip-text text-transparent">
            Everything Your Institution Needs
          </h2>
          <p className="text-center max-w-2xl mx-auto opacity-80 text-muted-foreground text-lg">
            A complete learning management solution that grows with you. From
            small academic departments to enterprise-level educational networks.
          </p>
        </div>
      </div>
    </div>
  );
};

export { HeroSection };
