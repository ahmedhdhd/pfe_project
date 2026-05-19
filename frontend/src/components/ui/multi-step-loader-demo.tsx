"use client";
import React, { useState } from "react";
import { MultiStepLoader as Loader } from "@/components/ui/multi-step-loader";
import { IconSquareRoundedX } from "@tabler/icons-react";

const loadingStates = [
  {
    text: "Setting up your account",
  },
  {
    text: "Configuring your organization",
  },
  {
    text: "Creating your dashboard",
  },
  {
    text: "Setting up courses",
  },
  {
    text: "Preparing your content",
  },
  {
    text: "Welcome to TeslaAcademy!",
  },
];

export default function MultiStepLoaderDemo() {
  const [loading, setLoading] = useState(false);
  return (
    <div className="w-full h-[60vh] flex items-center justify-center">
      {/* Core Loader Modal */}
      <Loader loadingStates={loadingStates} loading={loading} duration={1500} />

      {/* The buttons are for demo only, remove it in your actual code ⬇️ */}
      <button
        onClick={() => setLoading(true)}
        className="bg-primary hover:bg-primary/90 text-primary-foreground mx-auto text-sm md:text-base transition font-medium duration-200 h-10 rounded-lg px-8 flex items-center justify-center"
        style={{
          boxShadow:
            "0px -1px 0px 0px #ffffff40 inset, 0px 1px 0px 0px #ffffff40 inset",
        }}
      >
        Click to load
      </button>

      {loading && (
        <button
          className="fixed top-4 right-4 text-foreground z-[120]"
          onClick={() => setLoading(false)}
        >
          <IconSquareRoundedX className="h-10 w-10" />
        </button>
      )}
    </div>
  );
}
