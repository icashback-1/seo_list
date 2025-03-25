"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Settings, Search, FileText, Link, Map, BarChart, RefreshCw, Circle } from 'lucide-react';
import { getTasks, toggleTaskCompletion, calculateCompletion, calculateOverallCompletion } from '@/app/actions';

// Define task interface for type safety
interface Task {
  id: number;
  name: string;
  completed: boolean;
  responsible: string;
  description: string;
}

// Define tasks state interface
interface TasksState {
  technical: Task[];
  content: Task[];
  internal: Task[];
  local: Task[];
  analytics: Task[];
  ongoing: Task[];
  seo_analyst: Task[];
  backlinks: Task[];
  [key: string]: Task[]; // Add index signature for string access
}

// Define tab content interface
interface TabContent {
  title: string;
  icon: React.ReactNode;
  description: string;
  implementation: string;
  tasks: Task[];
}

// Define tab content mapping type
type TabContentMapping = {
  [key in keyof TasksState]: TabContent;
};

const SEODashboard = () => {
  const [activeTab, setActiveTab] = useState<keyof TasksState>('technical');
  const [tasks, setTasks] = useState<TasksState | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updatingTask, setUpdatingTask] = useState<{ category: string, taskId: number } | null>(null);
  const [categoryCompletions, setCategoryCompletions] = useState<Record<string, number>>({});
  const [overallCompletion, setOverallCompletion] = useState(0);
  
  // Fetch tasks from Redis on component mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasksData = await getTasks();
        setTasks(tasksData);
        
        // Calculate completion percentages
        await updateCompletionStats(tasksData);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
  }, []);

  // Update completion statistics
  const updateCompletionStats = async (tasksData: TasksState) => {
    try {
      // Calculate overall completion
      const overall = await calculateOverallCompletion(tasksData);
      setOverallCompletion(overall);
      
      // Calculate completion for each category
      const completions: Record<string, number> = {};
      for (const category of Object.keys(tasksData)) {
        completions[category] = await calculateCompletion(tasksData, category);
      }
      setCategoryCompletions(completions);
    } catch (error) {
      console.error('Error calculating completion stats:', error);
    }
  };

  // Handle task completion toggling with server action
  const handleToggleTaskCompletion = async (category: string, taskId: number) => {
    try {
      setUpdating(true);
      setUpdatingTask({ category, taskId });
      const updatedTasks = await toggleTaskCompletion(category, taskId);
      setTasks(updatedTasks);
      
      // Update completion stats with the new data
      await updateCompletionStats(updatedTasks);
    } catch (error) {
      console.error('Error toggling task completion:', error);
    } finally {
      setUpdating(false);
      setUpdatingTask(null);
    }
  };
  
  // Skip rendering until tasks are loaded
  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 bg-gray-50 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-gray-600">Loading SEO tasks...</p>
        </div>
      </div>
    );
  }
  
  if (!tasks) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 bg-gray-50">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error Loading Tasks</h3>
              <p className="text-sm text-red-700 mt-1">
                Unable to load SEO tasks. Please refresh the page or check your Redis connection.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tab content mapping
  const tabContent: TabContentMapping = {
    technical: {
      title: 'Technical SEO',
      icon: <Settings className="h-5 w-5" />,
      description: 'Optimize site architecture, crawlability, and performance',
      implementation: `// Example: robots.txt implementation
User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /

# Sitemap URL
Sitemap: https://example.com/sitemap.xml`,
      tasks: tasks.technical
    },
    content: {
      title: 'Content Optimization',
      icon: <FileText className="h-5 w-5" />,
      description: 'Optimize page metadata and content structure',
      implementation: `// Example: Metadata implementation
<head>
  <title>Primary Keyword | Brand Name</title>
  <meta name="description" content="Compelling description with target keywords">
  <link rel="canonical" href="https://example.com/page" />
</head>`,
      tasks: tasks.content
    },
    internal: {
      title: 'Internal Linking',
      icon: <Link className="h-5 w-5" />,
      description: 'Create logical site structure and navigation',
      implementation: `// Example: Internal linking with descriptive anchor
<a href="/related-page" title="Learn more about this topic">
  Learn more about <strong>keyword-rich anchor text</strong>
</a>`,
      tasks: tasks.internal
    },
    local: {
      title: 'Local SEO',
      icon: <Map className="h-5 w-5" />,
      description: 'Implement local business optimizations',
      implementation: `// Example: Local business schema
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Business Name",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "City",
    "addressRegion": "State",
    "postalCode": "12345",
    "addressCountry": "US"
  },
  "telephone": "(123) 456-7890",
  "url": "https://www.example.com"
}
</script>`,
      tasks: tasks.local
    },
    analytics: {
      title: 'Analytics',
      icon: <BarChart className="h-5 w-5" />,
      description: 'Set up monitoring and tracking',
      implementation: `// Example: Google Analytics implementation
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>`,
      tasks: tasks.analytics
    },
    ongoing: {
      title: 'Ongoing Tasks',
      icon: <RefreshCw className="h-5 w-5" />,
      description: 'Schedule regular maintenance and updates',
      implementation: `// Example: Automated testing setup
const puppeteer = require('puppeteer');

async function testPageSpeed() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');
  
  const performanceMetrics = await page.evaluate(() => {
    return {
      firstContentfulPaint: 
        performance.getEntriesByName('first-contentful-paint')[0].startTime,
      domContentLoaded: 
        performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
    };
  });
  
  console.log('Performance metrics:', performanceMetrics);
  await browser.close();
}

// Run weekly
schedule.scheduleJob('0 0 * * 0', testPageSpeed);`,
      tasks: tasks.ongoing
    },
    seo_analyst: {
      title: 'SEO Analyst Tasks',
      icon: <Search className="h-5 w-5" />,
      description: 'Strategic SEO planning and analysis tasks',
      implementation: `// Example: Keyword research documentation format
{
  "target_keyword": {
    "primary": "wireless bluetooth headphones",
    "search_volume": 110000,
    "keyword_difficulty": 67,
    "cpc": "$1.20",
    "related_terms": [
      "wireless headphones",
      "bluetooth headphones",
      "wireless earbuds"
    ],
    "search_intent": "commercial",
    "content_type": "product category page",
    "recommended_title": "Best Wireless Bluetooth Headphones 2025 | Brand",
    "meta_description": "Shop our collection of premium wireless Bluetooth headphones with noise cancellation and 24-hour battery life. Free shipping on orders over $50."
  }
}`,
      tasks: tasks.seo_analyst
    },
    backlinks: {
      title: 'Backlink Building',
      icon: <Link className="h-5 w-5" />,
      description: 'Develop and implement backlink acquisition strategies',
      implementation: `// Example: Backlink outreach email template
Subject: Content resource for your article on [Topic]

Hi [Name],

I noticed your excellent article about [Topic] at [URL].

I recently published a comprehensive guide on [Related Topic] that includes [Unique Value Proposition - statistics, research, tool, etc.].

Given your interest in [Topic], I thought this might be a valuable resource to share with your readers: [Your URL]

Would you consider adding a link to our resource in your article? I'd be happy to share your updated piece with our audience as well.

Best regards,
[Your Name]`,
      tasks: tasks.backlinks
    }
  };

  // Get the completion percentage for a category
  const getCompletionByCategory = (category: string) => {
    return categoryCompletions[category] || 0;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 bg-gray-50">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">On-Site SEO Dashboard</h1>
            <p className="text-gray-600">Developer implementation tracking</p>
          </div>
          <div className="flex items-center">
            <div className="bg-gray-100 p-2 rounded-lg">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium">SEO Status: </span>
                <span className="font-semibold text-blue-600">{overallCompletion}% Complete</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Overall progress bar */}
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${overallCompletion}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Not Started</span>
            <span>In Progress</span>
            <span>Completed</span>
          </div>
        </div>
      </div>
      
      {/* Category Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6 overflow-x-auto">
        <div className="flex border-b min-w-max">
          {Object.keys(tabContent).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as keyof TasksState)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tabContent[tab as keyof TasksState].icon}
              {tabContent[tab as keyof TasksState].title}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                getCompletionByCategory(tab as string) === 100
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {getCompletionByCategory(tab as string)}%
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Active Tab Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Task List */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-800">
              <div className="flex items-center gap-2">
                {tabContent[activeTab].icon}
                {tabContent[activeTab].title} Tasks
              </div>
            </h2>
            <span className="text-sm text-gray-500">
              {tabContent[activeTab].tasks.filter(t => t.completed).length} of {tabContent[activeTab].tasks.length} complete
            </span>
          </div>
          
          <p className="text-gray-600 mb-4">{tabContent[activeTab].description}</p>
          
          <div className="space-y-3 mt-4">
            {tabContent[activeTab].tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-2 mb-2 border rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex-1">
                  <span className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.name}</span>
                  <p className="text-sm text-gray-500">{task.description}</p>
                  <p className="text-xs text-blue-600">Responsible: {task.responsible}</p>
                </div>
                <button
                  onClick={() => handleToggleTaskCompletion(activeTab as string, task.id)}
                  disabled={updating}
                  className={`p-2 rounded-full ${task.completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'} 
                    hover:bg-opacity-80 transition-colors ${updating && updatingTask?.category === activeTab && updatingTask?.taskId === task.id ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {updating && updatingTask?.category === activeTab && updatingTask?.taskId === task.id ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                  ) : task.completed ? (
                    <CheckCircle size={20} />
                  ) : (
                    <Circle size={20} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right: Implementation Examples */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Implementation Example</h2>
          <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <pre>{tabContent[activeTab].implementation}</pre>
          </div>
          
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Task Division Guide</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800">
                    <strong className="font-medium">Frontend Developer Responsibilities:</strong> Implement technical SEO elements in the codebase including metadata, schema markup, performance optimizations, and structured HTML.
                  </p>
                  <p className="text-sm text-amber-700 mt-2">
                    <strong className="font-medium">SEO Analyst Responsibilities:</strong> Provide keyword research, content strategy, competitive analysis, and backlink acquisition. They also define what needs to be implemented, while developers handle how to implement it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SEODashboard; 
