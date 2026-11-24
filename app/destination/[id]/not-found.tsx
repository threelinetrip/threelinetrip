import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DestinationNotFound() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500 mb-4">여행지를 찾을 수 없습니다.</p>
        <Link href="/" className="inline-flex items-center gap-2 text-slate-700 font-medium hover:underline">
          <ArrowLeft className="w-4 h-4" />
          목록으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
