import SEODashboard from "@/components/SEODashboard";
import { getTasks, getActivityLog, getSEOScore, getIntegrationStatus, calculateOverallCompletion, calculateCompletion } from "@/app/actions";

// Enable ISR with a revalidation time of 60 seconds
export const revalidate = 60;

// Use Next.js 13+ App Router data fetching
export default async function Home() {
  // Fetch all data server-side
  const tasks = await getTasks();
  const activityLog = await getActivityLog();
  const seoScore = await getSEOScore();
  const integrationStatus = await getIntegrationStatus();
  
  // Calculate completion percentages
  const overallCompletion = await calculateOverallCompletion(tasks);
  
  // Calculate individual category completions
  const categoryCompletions: Record<string, number> = {};
  for (const category of Object.keys(tasks)) {
    categoryCompletions[category] = await calculateCompletion(tasks, category);
  }
  
  return (
    <div className="min-h-screen p-4 pb-20 font-[family-name:var(--font-geist-sans)]">
      <header className="flex flex-col items-center gap-4 py-8">
        <h1 className="text-2xl font-bold text-center">IndianCashback On-Site SEO Implementation Tracker</h1>
      </header>
      
      <SEODashboard 
        initialTasks={tasks}
        initialActivityLog={activityLog}
        initialSeoScore={seoScore}
        initialIntegrationStatus={integrationStatus}
        initialOverallCompletion={overallCompletion}
        initialCategoryCompletions={categoryCompletions}
      />
      
    </div>
  );
}
