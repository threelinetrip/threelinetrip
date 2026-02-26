import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans-kr",
});

const TITLE = "세줄여행 - 세 줄로 만나는 여행지";
const DESCRIPTION = "세 줄로 기록되는 여행지 정보를 확인하세요!";
const OG_IMAGE = "/og-image.png";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: {
    default: TITLE,
    template: "%s | 세줄여행",
  },
  description: DESCRIPTION,
  keywords: ["여행", "국내여행", "여행지 추천", "세줄여행", "대한민국 여행"],
  authors: [{ name: "세줄여행" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://threelinetrip.com",
    siteName: "세줄여행",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={notoSansKR.variable}>
      <body className="antialiased min-h-screen bg-white text-slate-900 font-sans">
        <Header />
        {children}
      </body>
    </html>
  );
}
