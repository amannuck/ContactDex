import { Pixelify_Sans } from "next/font/google";

/** Pixel-style UI type — [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) */
export const fontPixelify = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pixelify",
});
