'use server';

import { redis } from '@/lib/redis';

// Define the task interface
interface Task {
    id: number;
    name: string;
    completed: boolean;
    responsible: string;
    description: string;
}

// Define the tasks state interface
interface TasksState {
    technical: Task[];
    content: Task[];
    internal: Task[];
    local: Task[];
    analytics: Task[];
    ongoing: Task[];
    seo_analyst: Task[];
    backlinks: Task[];
    indiancashback: Task[];
    india_specific: Task[];
    indiancashback_backlinks: Task[];
    indiancashback_technical: Task[];
    [key: string]: Task[]; // Index signature for string keys
}

// Define the key for storing tasks in Redis
const TASKS_KEY = 'seo:tasks';

// Additional keys for new features
const ACTIVITY_LOG_KEY = 'seo:activity_log';
const SEO_SCORE_KEY = 'seo:score';
const INTEGRATION_STATUS_KEY = 'seo:integrations';

// Define the activity log interface
interface ActivityLogEntry {
    type: string;
    message: string;
    timestamp: number;
}

// Define the SEO score interface
interface SEOScore {
    overall: number;
    content: number;
    links: number;
    performance: number;
    mobile: number;
    lastUpdated: string;
}

// Define the integration status interface
interface IntegrationStatus {
    google: boolean;
    ahrefs: boolean;
    semrush: boolean;
    analytics: boolean;
}

// Function to initialize Redis with default data if not already present
export async function initializeRedisData(): Promise<void> {
    try {
        // Check if tasks exist
        const tasksExist = await redis.exists(TASKS_KEY);

        if (!tasksExist) {
            console.log('Seeding default SEO tasks to Redis...');
            await redis.set(TASKS_KEY, getDefaultTasks());

            // Initialize activity log
            await redis.set(ACTIVITY_LOG_KEY, [
                {
                    id: 1,
                    timestamp: new Date().toISOString(),
                    action: 'SYSTEM_INIT',
                    description: 'SEO Dashboard initialized with default tasks',
                    user: 'System'
                }
            ]);

            // Initialize SEO score
            await redis.set(SEO_SCORE_KEY, {
                overall: 55,
                technical: 40,
                content: 60,
                backlinks: 45,
                performance: 65,
                lastUpdated: new Date().toISOString()
            });

            // Initialize integration status
            await redis.set(INTEGRATION_STATUS_KEY, {
                googleSearchConsole: { connected: false, lastSync: null },
                googleAnalytics: { connected: false, lastSync: null },
                ahrefs: { connected: false, lastSync: null },
                semrush: { connected: false, lastSync: null },
                screaming_frog: { connected: false, lastSync: null }
            });
        }
    } catch (error) {
        console.error('Error initializing Redis data:', error);
    }
}

// Function to get all tasks from Redis
export async function getTasks(): Promise<TasksState> {
    try {
        // Initialize Redis data if needed
        await initializeRedisData();

        // Simplified Redis get call with type casting
        const tasks = await redis.get(TASKS_KEY) as TasksState | null;
        return tasks || getDefaultTasks();
    } catch (error) {
        console.error('Error fetching tasks from Redis:', error);
        return getDefaultTasks();
    }
}

// Function to get activity log
export async function getActivityLog(): Promise<ActivityLogEntry[]> {
    try {
        await initializeRedisData();
        const log = await redis.get(ACTIVITY_LOG_KEY) as ActivityLogEntry[] | null;
        return log || [];
    } catch (error) {
        console.error('Error fetching activity log:', error);
        return [];
    }
}

// Function to add activity to log
export async function addActivityLog(action: string, description: string): Promise<void> {
    try {
        const log = await getActivityLog();
        const newEntry = {
            type: action,
            message: description,
            timestamp: Date.now()
        };

        await redis.set(ACTIVITY_LOG_KEY, [newEntry, ...log.slice(0, 19)]); // Keep only 20 most recent entries
    } catch (error) {
        console.error('Error adding to activity log:', error);
    }
}

// Function to get SEO score
export async function getSEOScore(): Promise<SEOScore> {
    try {
        await initializeRedisData();
        const score = await redis.get(SEO_SCORE_KEY) as SEOScore | null;
        if (score) return score;

        // More realistic default SEO score data
        const defaultScore: SEOScore = {
            overall: 68,
            content: 72,
            links: 65,
            performance: 82,
            mobile: 54,
            lastUpdated: new Date().toISOString()
        };

        await redis.set(SEO_SCORE_KEY, defaultScore);
        return defaultScore;
    } catch (error) {
        console.error('Error fetching SEO score:', error);
        return {
            overall: 68,
            content: 72,
            links: 65,
            performance: 82,
            mobile: 54,
            lastUpdated: new Date().toISOString()
        };
    }
}

// Function to get integration status
export async function getIntegrationStatus(): Promise<IntegrationStatus> {
    try {
        await initializeRedisData();
        const status = await redis.get(INTEGRATION_STATUS_KEY) as IntegrationStatus | null;
        if (status) return status;

        // Default integration status
        const defaultStatus: IntegrationStatus = {
            google: false,
            ahrefs: false,
            semrush: false,
            analytics: false
        };

        await redis.set(INTEGRATION_STATUS_KEY, defaultStatus);
        return defaultStatus;
    } catch (error) {
        console.error('Error fetching integration status:', error);
        return {
            google: false,
            ahrefs: false,
            semrush: false,
            analytics: false
        };
    }
}

// Function to toggle task completion status
export async function toggleTaskCompletion(category: string, taskId: number): Promise<TasksState> {
    try {
        const tasks = await getTasks();

        // Find the task
        const task = tasks[category]?.find((t: Task) => t.id === taskId);
        if (!task) {
            throw new Error(`Task not found: category=${category}, id=${taskId}`);
        }

        // Update the task completion status
        const updatedTasks: TasksState = {
            ...tasks,
            [category]: tasks[category]?.map((task: Task) =>
                task.id === taskId ? { ...task, completed: !task.completed } : task
            ) || []
        };

        // Simplified Redis set call
        await redis.set(TASKS_KEY, updatedTasks);

        // Add to activity log
        const newStatus = !task.completed;
        await addActivityLog(
            newStatus ? 'TASK_COMPLETED' : 'TASK_REOPENED',
            `${newStatus ? 'Completed' : 'Reopened'} task: ${task.name} in ${category}`
        );

        return updatedTasks;
    } catch (error) {
        console.error('Error toggling task completion:', error);
        throw new Error('Failed to update task status');
    }
}

// Function to calculate completion percentage for a category
export async function calculateCompletion(tasks: TasksState, category: string): Promise<number> {
    if (!tasks || !tasks[category]) return 0;

    const totalTasks = tasks[category].length;
    const completedTasks = tasks[category].filter((task: Task) => task.completed).length;
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
}

// Function to calculate overall completion
export async function calculateOverallCompletion(tasks: TasksState): Promise<number> {
    if (!tasks) return 0;

    const allTasks = Object.values(tasks).flat() as Task[];
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((task: Task) => task.completed).length;
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
}

// Default tasks for initialization
function getDefaultTasks(): TasksState {
    return {
        indiancashback: [
            {
                id: 1,
                name: 'Optimize cashback category pages',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Enhance category pages (Fashion, Home, Electronics, etc.) with unique descriptions, relevant keywords, and proper H1-H6 structure. Improves topical relevance and user engagement for IndianCashback\'s core offerings.'
            },
            {
                id: 2,
                name: 'Implement merchant-specific schema markup',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Add structured data for cashback offers, store ratings, and merchant information. Enables rich snippets in search results showing cashback percentages and merchant ratings to improve CTR.'
            },
            {
                id: 3,
                name: 'Create merchant comparison content',
                completed: false,
                responsible: 'Content Writer',
                description: 'Develop in-depth comparison content between popular merchants (e.g., Amazon vs Flipkart cashback). Target high-value keywords that shoppers use when comparing cashback options.'
            },
            {
                id: 4,
                name: 'Optimize site for "cashback + [store name]" keywords',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Audit and optimize individual store pages for high-volume "cashback + [store name]" searches (e.g., "Amazon cashback", "Flipkart cashback"). Focus on title tags, meta descriptions, and content.'
            },
            {
                id: 5,
                name: 'Create seasonal cashback guides',
                completed: false,
                responsible: 'Content Writer',
                description: 'Develop content for seasonal shopping events (Diwali, Republic Day, End of Season) showcasing highest cashback offers. Target seasonal shopping keywords to capture time-specific traffic.'
            },
            {
                id: 6,
                name: 'Implement FAQ schema for cashback questions',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Add FAQ schema markup to answer common cashback questions. Improves chances of appearing in Google\'s featured snippets and "People also ask" sections for cashback-related queries.'
            },
            {
                id: 7,
                name: 'Create mobile app promotion structure',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Optimize app download pages with structured data and app indexing. Improves visibility of IndianCashback\'s mobile app in search results and enables app-specific search features.'
            },
            {
                id: 8,
                name: 'Implement user review schema',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Add schema markup for user reviews and ratings of IndianCashback service. Generates star ratings in search results to improve credibility and click-through rates.'
            }
        ],
        india_specific: [
            {
                id: 1,
                name: 'Optimize for India-specific search engines',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'While Google dominates the Indian market, ensure visibility on other platforms like Yahoo India. Different search engines may prioritize different ranking factors.'
            },
            {
                id: 2,
                name: 'Implement hreflang for regional targeting',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Add hreflang tags to specify that content is targeted for Indian users (hi-IN, en-IN). Helps search engines serve the appropriate version of the site to users based on language and location.'
            },
            {
                id: 3,
                name: 'Create Hindi language content',
                completed: false,
                responsible: 'Content Writer',
                description: 'Develop key pages in Hindi to reach broader Indian audience. Focus on popular shopping categories and cashback explanation content to improve visibility in Hindi-language searches.'
            },
            {
                id: 4,
                name: 'Register with Webmaster tools for Indian search engines',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Submit sitemaps to Google India and other relevant local search platforms. Ensures proper indexing and monitoring of site performance in Indian search results.'
            },
            {
                id: 5,
                name: 'Target India-specific shopping festivals',
                completed: false,
                responsible: 'Content Writer',
                description: 'Create SEO content targeting major Indian shopping events like Great Indian Festival, Big Billion Days, and Diwali sales. Optimize for festival-specific shopping keyword combinations.'
            },
            {
                id: 6,
                name: 'Optimize for mobile search',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'India is primarily a mobile-first market with over 700 million smartphone users. Ensure site is fully responsive, loads quickly on slower connections, and passes mobile-friendly tests.'
            },
            {
                id: 7,
                name: 'Build location-specific landing pages',
                completed: false,
                responsible: 'Content Writer',
                description: 'Create optimized pages for major Indian cities (Delhi, Mumbai, Bangalore, etc.) with locally relevant cashback offers. Target "[city] + cashback" keywords to capture location-specific searches.'
            },
            {
                id: 8,
                name: 'Optimize for voice search in Indian English',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Implement natural language patterns common in Indian English for voice search queries. Target long-tail conversational queries like "What is the best cashback for Flipkart in Delhi?"'
            }
        ],
        indiancashback_backlinks: [
            {
                id: 1,
                name: 'Analyze Indian cashback competitor backlinks',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Conduct thorough analysis of backlink profiles for competing cashback sites like CashKaro, GrabOn, and PaisaWapas. Identify high-quality backlink sources to target for IndianCashback.'
            },
            {
                id: 2,
                name: 'Create partner outreach program',
                completed: false,
                responsible: 'Marketing',
                description: 'Develop outreach strategy for Indian finance bloggers, deal sites, and shopping communities. Create partnership opportunities with mutual benefits to secure relevant backlinks.'
            },
            {
                id: 3,
                name: 'Build relationships with Indian e-commerce reviewers',
                completed: false,
                responsible: 'Marketing',
                description: 'Connect with bloggers and YouTubers who review Indian e-commerce platforms. Provide exclusive cashback offers or affiliate partnerships in exchange for mentions and links.'
            },
            {
                id: 4,
                name: 'Develop shareable cashback infographics',
                completed: false,
                responsible: 'Content Writer',
                description: 'Create data-driven infographics about Indian online shopping trends, cashback savings statistics, or festival shopping guides that will attract backlinks from news sites and blogs.'
            },
            {
                id: 5,
                name: 'Guest post on Indian personal finance sites',
                completed: false,
                responsible: 'Content Writer',
                description: 'Identify top Indian personal finance blogs and pitch valuable content about saving money through cashback while shopping online. Focus on educational content with natural links to IndianCashback.'
            },
            {
                id: 6,
                name: 'Create a merchant-specific resource center',
                completed: false,
                responsible: 'Content Writer',
                description: 'Develop comprehensive guides for maximizing cashback from major Indian retailers. Create link-worthy resources that shopping blogs and deal sites will reference and link to.'
            },
            {
                id: 7,
                name: 'Implement HARO strategy for Indian media',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Utilize Help A Reporter Out (HARO) to connect with Indian journalists writing about e-commerce, online shopping, or personal finance. Provide expert quotes on cashback topics to earn media mentions and links.'
            },
            {
                id: 8,
                name: 'Create broken link building campaign',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Identify broken links on Indian shopping, finance, and deal websites that point to defunct cashback resources. Create replacement content and reach out to webmasters with your solution.'
            }
        ],
        indiancashback_technical: [
            {
                id: 1,
                name: 'Optimize merchant page URL structure',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Implement SEO-friendly URLs for merchant pages (e.g., indiancashback.com/amazon instead of indiancashback.com/store?id=12345). Clean, keyword-rich URLs improve both rankings and user trust.'
            },
            {
                id: 2,
                name: 'Implement cashback offer pagination',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Add proper rel="next" and rel="prev" pagination for category pages with many cashback offers. Helps search engines understand content relationship and index offers efficiently.'
            },
            {
                id: 3,
                name: 'Optimize site for Core Web Vitals',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Ensure LCP, FID, and CLS scores meet Google\'s standards on both mobile and desktop. Page experience is particularly important for cashback sites where users compare multiple offers.'
            },
            {
                id: 4,
                name: 'Implement price range schema',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Add schema markup for cashback percentage ranges on category pages. Helps search engines understand offer values and can enhance rich snippets in search results.'
            },
            {
                id: 5,
                name: 'Create dynamic sitemap for offers',
                completed: false,
                responsible: 'Backend Developer',
                description: 'Implement dynamically generated sitemap that updates with new cashback offers and merchants. Ensures search engines can discover and index new offers quickly.'
            },
            {
                id: 6,
                name: 'Fix merchant page duplicate content',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Audit and fix duplicate content issues across similar merchant pages. Implement unique content templates and canonical tags to prevent dilution of ranking signals.'
            },
            {
                id: 7,
                name: 'Optimize cashback tracking parameters',
                completed: false,
                responsible: 'Backend Developer',
                description: 'Ensure affiliate tracking parameters don\'t create duplicate content issues. Configure URL parameters in Google Search Console and implement proper canonicalization.'
            },
            {
                id: 8,
                name: 'Implement Progressive Web App',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Convert site to PWA to improve mobile experience and enable offline functionality. PWAs typically have better engagement metrics, which indirectly improve SEO performance.'
            }
        ],
        technical: [
            {
                id: 1,
                name: 'Configure robots.txt',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Tells search engines which pages to crawl and which to ignore. Improves crawl efficiency and prevents indexing of sensitive or duplicate content. Directly impacts which pages appear in search results.'
            },
            {
                id: 2,
                name: 'Fix broken links',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Prevents users from encountering 404 errors. Search engines penalize sites with broken links as they indicate poor maintenance. Improves user experience and preserves link equity throughout the site.'
            },
            {
                id: 3,
                name: 'Implement SSL certificate',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Enables HTTPS, which is a direct ranking factor. Secures data transmission and builds user trust. Google Chrome marks non-HTTPS sites as "Not Secure," potentially increasing bounce rates.'
            },
            {
                id: 4,
                name: 'Create XML sitemap',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Provides search engines with a complete map of all pages on your site. Increases crawling efficiency and ensures important pages are discovered and indexed. Required for Google Search Console submission.'
            },
            {
                id: 5,
                name: 'Minify CSS/JS files',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Reduces file sizes by removing unnecessary characters. Improves page load speed, which is a direct ranking factor. Better speed improves user experience metrics like Time to First Byte (TTFB).'
            },
            {
                id: 6,
                name: 'Enable GZIP compression',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Compresses web files before sending them to the browser. Can reduce transfer size by up to 70%, significantly improving load speeds. Better speed directly impacts Core Web Vitals metrics used for ranking.'
            },
            {
                id: 7,
                name: 'Implement lazy loading',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Defers loading of off-screen images until users scroll to them. Improves initial page load speed and Core Web Vitals metrics (LCP, CLS). Reduces bandwidth usage for users who don\'t scroll the entire page.'
            },
            {
                id: 8,
                name: 'Fix 404 pages',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Creates custom 404 pages that guide users back to functioning content. Reduces bounce rates when users encounter broken links. Preserves user experience and prevents search engines from indexing error pages.'
            }
        ],
        content: [
            {
                id: 1,
                name: 'Implement title tags',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Primary ranking factor that tells search engines what the page is about. Appears as the clickable headline in search results. Properly optimized titles with primary keywords improve CTR and rankings.'
            },
            {
                id: 2,
                name: 'Add meta descriptions',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Provides a summary of page content in search results. While not a direct ranking factor, well-crafted descriptions with keywords improve click-through rates, which indirectly affects rankings.'
            },
            {
                id: 3,
                name: 'Structure header tags',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Creates a hierarchical structure for content (H1-H6). Helps search engines understand content organization and importance. H1 tags with target keywords significantly impact relevance for those keywords.'
            },
            {
                id: 4,
                name: 'Optimize image alt attributes',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Provides text alternatives for images that search engines can read. Improves accessibility and helps pages rank in image search. Descriptive alt text with relevant keywords improves content relevance signals.'
            },
            {
                id: 5,
                name: 'Implement schema markup',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Adds structured data that helps search engines understand content context. Enables rich snippets in search results (ratings, prices, etc.). Increases visibility and click-through rates with enhanced SERP listings.'
            },
            {
                id: 6,
                name: 'Add canonical tags',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Tells search engines which version of duplicate or similar pages is the primary one. Prevents duplicate content penalties by consolidating ranking signals to the canonical URL. Essential for sites with parameter-based URLs or pagination.'
            }
        ],
        internal: [
            {
                id: 1,
                name: 'Create navigation structure',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Provides clear pathways for users and search engines to find content. Improves crawlability and passes link equity to important pages. Well-structured navigation reduces bounce rates and improves user experience metrics.'
            },
            {
                id: 2,
                name: 'Implement breadcrumbs',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Shows users their location within the site hierarchy. Improves navigation and reduces bounce rates. Can appear as rich snippets in search results, improving click-through rates and conveying site structure to search engines.'
            },
            {
                id: 3,
                name: 'Add descriptive anchor text',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Uses relevant keywords in link text instead of generic phrases like "click here." Helps search engines understand what the linked page is about. Descriptive anchor text is a significant ranking factor for the linked page.'
            },
            {
                id: 4,
                name: 'Fix orphaned pages',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Identifies and links to pages that have no internal links pointing to them. Improves crawlability and ensures all valuable content is discoverable. Prevents valuable content from being excluded from search indexes due to lack of internal links.'
            }
        ],
        local: [
            {
                id: 1,
                name: 'Implement local business schema',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Adds structured data specific to local businesses. Enables rich results with business information in search. Improves visibility in local searches and Google Maps with precise business details that search engines can understand.'
            },
            {
                id: 2,
                name: 'Create store locator page',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Provides users with an interactive way to find physical locations. Improves user experience for location-based searches. Pages with location data help businesses rank higher in local search results.'
            },
            {
                id: 3,
                name: 'Add embedded Google Maps',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Visually displays business location(s) for users. Improves user experience by providing interactive directions. Sends strong location signals to search engines, improving local search rankings and visibility in map results.'
            }
        ],
        analytics: [
            {
                id: 1,
                name: 'Install Google Analytics',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Tracks user behavior, traffic sources, and conversions. Provides data to make informed SEO decisions. Enables measurement of SEO campaign effectiveness and identification of high-performing content.'
            },
            {
                id: 2,
                name: 'Set up Google Search Console',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Monitors site\'s presence in Google search results. Identifies issues affecting search performance. Provides data on keywords driving traffic, click-through rates, and index coverage problems that need to be addressed.'
            },
            {
                id: 3,
                name: 'Configure event tracking',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Tracks specific user interactions like downloads or form submissions. Measures engagement beyond pageviews. Data helps identify which content elements drive user engagement and conversions to inform SEO strategy.'
            },
            {
                id: 4,
                name: 'Set up performance monitoring',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Continuously tracks Core Web Vitals and other performance metrics. Alerts to issues affecting user experience and rankings. Essential for maintaining good performance scores that directly impact search rankings.'
            }
        ],
        ongoing: [
            {
                id: 1,
                name: 'Create content update schedule',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Establishes a regular cadence for refreshing existing content. Fresh content signals site activity to search engines. Regular updates improve relevance and can trigger ranking reconsiderations for previously published content.'
            },
            {
                id: 2,
                name: 'Set up automated testing',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Creates scripts to regularly check for SEO issues. Prevents regression when new features are deployed. Automated testing ensures consistent compliance with SEO best practices across all site updates.'
            },
            {
                id: 3,
                name: 'Configure performance alerts',
                completed: false,
                responsible: 'Frontend Developer',
                description: 'Sets up notifications for sudden drops in page speed or other metrics. Enables quick response to performance issues. Prevents long-term ranking impacts from undetected performance degradation.'
            }
        ],
        seo_analyst: [
            {
                id: 1,
                name: 'Conduct keyword research',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Identifies high-value search terms with optimal search volume and competition levels. Forms the foundation of all SEO efforts by determining target keywords. Directly impacts which terms the site can realistically rank for based on competition analysis.'
            },
            {
                id: 2,
                name: 'Perform competitor analysis',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Identifies top-ranking competitors and analyzes their content, backlink profiles, and keyword strategies. Reveals content gaps and keyword opportunities. Provides benchmarks for performance and reveals strategies working in your specific industry.'
            },
            {
                id: 3,
                name: 'Develop content strategy',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Creates a systematic plan for content creation based on keyword research and competitor analysis. Maps topics to user intent throughout the buying journey. Ensures all content serves a specific SEO purpose with measurable outcomes.'
            },
            {
                id: 4,
                name: 'Define title tag specifications',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Creates detailed title tag templates with exact character limits, keyword placement, and brand positioning. Ensures consistency across similar page types. Provides specific instructions for developers to implement optimal title structures.'
            },
            {
                id: 5,
                name: 'Provide meta description formats',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Develops meta description templates with optimal character counts, keyword inclusion, and compelling calls-to-action. Increases click-through rates from search results. Provides exact specifications for developers to implement.'
            },
            {
                id: 6,
                name: 'Analyze search intent',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Determines whether users searching specific keywords have informational, navigational, commercial, or transactional intent. Ensures content matches user expectations. Directly impacts bounce rates, engagement metrics, and conversion rates.'
            },
            {
                id: 7,
                name: 'Identify backlink opportunities',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Researches potential sources for quality backlinks such as industry directories, partner websites, and content placement opportunities. Improves domain authority. Builds the external link profile that directly impacts search rankings.'
            },
            {
                id: 8,
                name: 'Monitor algorithm updates',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Tracks and analyzes search engine algorithm changes and their potential impact on rankings. Enables quick adaptations to strategy when needed. Prevents ranking drops by staying aligned with evolving search engine requirements.'
            },
            {
                id: 9,
                name: 'Analyze ranking positions',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Tracks keyword ranking positions across search engines and identifies trends and opportunities. Measures effectiveness of SEO efforts over time. Provides data to justify continued investment in specific SEO initiatives.'
            },
            {
                id: 10,
                name: 'Conduct content gap analysis',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Identifies topics and keywords that competitors rank for but your site doesn\'t address. Reveals untapped content opportunities with existing search demand. Provides direction for content creation that can quickly capture uncontested rankings.'
            },
            {
                id: 11,
                name: 'Optimize for featured snippets',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Structures content to specifically target featured snippet positions at the top of search results. Dramatically increases visibility and click-through rates. Requires specific content formatting that developers need to implement.'
            },
            {
                id: 12,
                name: 'Create schema markup strategy',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Determines which schema.org structured data types are most relevant for each page type. Enables rich snippets in search results. Provides exact specifications for developers to implement the appropriate JSON-LD markup.'
            }
        ],
        backlinks: [
            {
                id: 1,
                name: 'Conduct backlink audit',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Analyzes existing backlink profile to identify toxic links, opportunities for improvement, and current strengths. Helps avoid Google penalties. Establishes baseline metrics for future link building activities.'
            },
            {
                id: 2,
                name: 'Create link building strategy',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Develops a comprehensive plan for acquiring high-quality backlinks from relevant sources. Improves domain authority and search rankings. Sets priorities based on competitor analysis and keyword difficulty.'
            },
            {
                id: 3,
                name: 'Develop guest posting plan',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Identifies high-authority sites in your industry that accept guest posts and creates outreach templates. Builds relevant, high-quality backlinks. Establishes thought leadership and drives referral traffic.'
            },
            {
                id: 4,
                name: 'Create shareable content assets',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Develops content specifically designed to attract natural backlinks such as original research, infographics, or tools. Generates organic link acquisition. Creates resources industry websites want to reference and link to.'
            },
            {
                id: 5,
                name: 'Submit to industry directories',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Identifies and submits site to relevant, high-quality industry directories and association websites. Builds foundational backlinks from trusted sources. Improves local and industry-specific relevance signals.'
            },
            {
                id: 6,
                name: 'Perform broken link building',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Finds broken links on external sites and offers your content as a replacement. Leverages existing link opportunities. Provides immediate value to site owners while gaining valuable backlinks.'
            },
            {
                id: 7,
                name: 'Monitor brand mentions',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Tracks unlinked mentions of your brand across the web and reaches out to convert them to backlinks. Capitalizes on existing brand awareness. Turns already-existing mentions into valuable ranking signals.'
            },
            {
                id: 8,
                name: 'Analyze competitor backlinks',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Identifies sites linking to competitors but not to you and creates outreach strategies. Leverages proven link opportunities. Targets sites already interested in your industry or niche.'
            },
            {
                id: 9,
                name: 'Disavow toxic backlinks',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Identifies and disavows harmful backlinks that could trigger Google penalties. Protects site from negative SEO and algorithmic penalties. Maintains a clean backlink profile focused on quality rather than quantity.'
            },
            {
                id: 10,
                name: 'Track backlink acquisition',
                completed: false,
                responsible: 'SEO Analyst',
                description: 'Monitors new and lost backlinks and measures their impact on rankings and organic traffic. Quantifies link building effectiveness. Provides data to refine strategy and focus on most effective tactics.'
            }
        ]
    };
} 
