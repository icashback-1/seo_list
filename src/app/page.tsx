import Image from "next/image";
import SEODashboard from "@/components/SEODashboard";

export default function Home() {
  return (
    <div className="min-h-screen p-4 pb-20 font-[family-name:var(--font-geist-sans)]">
      <header className="flex flex-col items-center gap-4 py-8">
        <h1 className="text-2xl font-bold text-center">On-Site SEO Implementation Tracker</h1>
      </header>
      
      <SEODashboard />
      
    </div>
  );
}
