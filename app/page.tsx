import { db, auth } from "@/lib/firebase";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-950 text-white">
      <div className="max-w-2xl text-center space-y-4">
        <h1 className="text-5xl font-extrabold tracking-tight text-white">
          LAZAROPH <span className="text-blue-500">v2</span>
        </h1>
        <p className="text-xl text-gray-400">
          Next.js 14 App Router + TypeScript + Tailwind CSS + Firebase
        </p>
        <div className="pt-6 flex justify-center gap-4">
          <div className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-sm font-medium text-green-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            Firebase Initialized
          </div>
        </div>
      </div>
    </main>
  );
}
