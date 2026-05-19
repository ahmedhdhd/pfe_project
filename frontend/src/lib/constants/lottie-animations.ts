/**
 * Lottie Animation URLs Configuration
 *
 * This file contains URLs for Lottie animations used throughout the student site.
 *
 * HOW TO ADD ANIMATIONS:
 *
 * 1. Go to https://lottiefiles.com
 * 2. Search for free animations (e.g., "empty state", "loading", "success", "education")
 * 3. Click on an animation you like
 * 4. Click "Download" and select "Lottie JSON"
 * 5. You have two options:
 *
 *    Option A - Use LottieFiles CDN URL:
 *    - Copy the animation URL from LottieFiles
 *    - Format: https://lottie.host/embed/{animation-id}.json
 *    - Replace the placeholder URLs below
 *
 *    Option B - Use local JSON files:n
 *    - Download the JSON file
 *    - Place it in /public/lottie/ folder
 *    - Use: /lottie/animation-name.json
 *
 * RECOMMENDED FREE ANIMATIONS:
 * - Empty state: https://lottiefiles.com/search?q=empty%20state&category=animations&price=free
 * - Loading: https://lottiefiles.com/search?q=loading&category=animations&price=free
 * - Success: https://lottiefiles.com/search?q=success&category=animations&price=free
 * - Education: https://lottiefiles.com/search?q=education&category=animations&price=free
 *
 * NOTE: The URLs below are placeholders. Replace them with actual animation URLs
 * from LottieFiles for the animations to work properly.
 */

export const LOTTIE_ANIMATIONS = {
  // Empty/No data states - Replace with actual URLs from LottieFiles
  // Leave empty string to show fallback icons until you add valid URLs
  emptyState: "", // Add your empty state animation URL here
  emptyBox: "",
  noData: "",

  // Loading states
  loading: "",
  loadingSpinner: "",

  // Success states
  success: "",
  checkmark: "",

  // Education/Student related
  student: "",
  studying: "",
  books: "",
} as const;
