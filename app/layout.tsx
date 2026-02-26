import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  title: {
    default: "세줄여행 - 세 줄로 만나는 대한민국 여행지",
    template: "%s | 세줄여행",
  },
  description:
    "복잡한 설명 없이, 세 줄로 핵심만 담은 대한민국 여행 큐레이션 서비스입니다.",
  keywords: ["여행", "국내여행", "여행지 추천", "세줄여행", "대한민국 여행"],
  authors: [{ name: "세줄여행" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://threelinetrip.com",
    siteName: "세줄여행",
    title: "세줄여행 - 세 줄로 만나는 대한민국 여행지",
    description:
      "복잡한 설명 없이, 세 줄로 핵심만 담은 대한민국 여행 큐레이션 서비스입니다.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "세줄여행 - 세 줄로 만나는 대한민국 여행지",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "세줄여행 - 세 줄로 만나는 대한민국 여행지",
    description:
      "복잡한 설명 없이, 세 줄로 핵심만 담은 대한민국 여행 큐레이션 서비스입니다.",
    images: ["/og-image.png"],
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
