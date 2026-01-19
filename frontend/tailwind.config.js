/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary - Vibrant Orange
        primary: {
          50: "var(--primary-50)",
          100: "var(--primary-100)",
          200: "var(--primary-200)",
          300: "var(--primary-300)",
          400: "var(--primary-400)",
          500: "var(--primary-500)",
          600: "var(--primary-600)",
          700: "var(--primary-700)",
          800: "var(--primary-800)",
          900: "var(--primary-900)",
        },
        // Secondary - Bright Amber
        secondary: {
          50: "var(--secondary-50)",
          100: "var(--secondary-100)",
          200: "var(--secondary-200)",
          300: "var(--secondary-300)",
          400: "var(--secondary-400)",
          500: "var(--secondary-500)",
          600: "var(--secondary-600)",
          700: "var(--secondary-700)",
          800: "var(--secondary-800)",
          900: "var(--secondary-900)",
        },
        // Tertiary - Purple/Violet
        tertiary: {
          400: "var(--tertiary-400)",
          500: "var(--tertiary-500)",
          600: "var(--tertiary-600)",
        },
        // Accent - Rose
        accent: {
          400: "var(--accent-400)",
          500: "var(--accent-500)",
          600: "var(--accent-600)",
        },
        // Semantic - Success
        success: {
          400: "var(--success-400)",
          500: "var(--success-500)",
          600: "var(--success-600)",
        },
        // Semantic - Warning
        warning: {
          400: "var(--warning-400)",
          500: "var(--warning-500)",
          600: "var(--warning-600)",
        },
        // Semantic - Error
        error: {
          400: "var(--error-400)",
          500: "var(--error-500)",
          600: "var(--error-600)",
        },
        // Surface - Slate
        surface: {
          50: "var(--surface-50)",
          100: "var(--surface-100)",
          200: "var(--surface-200)",
          300: "var(--surface-300)",
          400: "var(--surface-400)",
          500: "var(--surface-500)",
          600: "var(--surface-600)",
          700: "var(--surface-700)",
          800: "var(--surface-800)",
          850: "var(--surface-850)",
          900: "var(--surface-900)",
          950: "var(--surface-950)",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        glow: "var(--shadow-glow)",
        "glow-lg": "0 0 60px -15px var(--primary-500)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease",
        "slide-up": "slideUp 0.3s ease",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px -5px var(--primary-500)" },
          "50%": { boxShadow: "0 0 40px -5px var(--primary-400)" },
        },
      },
    },
  },
  plugins: [],
};
