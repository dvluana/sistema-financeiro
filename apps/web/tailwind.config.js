/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rosa: {
          DEFAULT: "#FF385C",
          hover: "#E31C5F",
          pressed: "#D70466",
          light: "#FFF0F3",
        },
        verde: {
          DEFAULT: "#008A05",
          hover: "#006B04",
          light: "#22C55E",
          bg: "#E8F5E9",
        },
        azul: {
          DEFAULT: "#2563EB",
          light: "#3B82F6",
          bg: "#EFF6FF",
        },
        vermelho: {
          DEFAULT: "#D93025",
          bg: "#FFEBEE",
        },
        neutro: {
          900: "#222222",
          600: "#717171",
          400: "#9CA3AF",
          300: "#DDDDDD",
          200: "#EBEBEB",
          100: "#F7F7F7",
          0: "#FFFFFF",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
      fontSize: {
        "titulo-mes": ["24px", { fontWeight: "600", lineHeight: "1.2" }],
        "titulo-card": ["18px", { fontWeight: "600", lineHeight: "1.3" }],
        "corpo": ["16px", { fontWeight: "400", lineHeight: "1.5" }],
        "corpo-medium": ["16px", { fontWeight: "500", lineHeight: "1.5" }],
        "pequeno": ["14px", { fontWeight: "400", lineHeight: "1.4" }],
        "pequeno-medium": ["14px", { fontWeight: "500", lineHeight: "1.4" }],
        "micro": ["13px", { fontWeight: "400", lineHeight: "1.3" }],
        "destaque": ["24px", { fontWeight: "700", lineHeight: "1.2" }],
        "botao": ["16px", { fontWeight: "600", lineHeight: "1" }],
      },
      borderRadius: {
        card: "12px",
        botao: "9999px",
        input: "12px",
        bottomsheet: "24px",
        status: "9999px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        touch: "48px",
        "touch-lg": "56px",
      },
      minHeight: {
        touch: "48px",
        "touch-lg": "56px",
      },
      minWidth: {
        touch: "48px",
        "touch-lg": "56px",
      },
      keyframes: {
        "scale-pop": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "scale-pop": "scale-pop 300ms ease-out",
        "fade-in": "fade-in 200ms ease-out",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
