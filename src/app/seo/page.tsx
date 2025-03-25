'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTasks, toggleTaskCompletion, getActivityLog, getSEOScore, getIntegrationStatus } from '@/app/actions';
import { Progress } from '@/components/ui/progress';

export interface Task {
  id: number;
  name: string;
  description: string;
  completed: boolean;
}

export interface TasksState {
  [category: string]: Task[];
}

export interface ActivityLog {
  type: string;
  message: string;
  timestamp: number;
}

export interface SEOScore {
  overall: number;
  content: number;
  links: number;
  performance: number;
  mobile: number;
}

export interface IntegrationStatus {
  google: boolean;
  ahrefs: boolean;
  semrush: boolean;
  analytics: boolean;
}

export default function SEODashboard() {
  const [tasks, setTasks] = useState<TasksState | null>(null);
  const [completionPercentages, setCompletionPercentages] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [seoScore, setSeoScore] = useState<SEOScore | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        
        // Load all data in parallel
        const [tasksData, activityData, scoreData, integrationsData] = await Promise.all([
          getTasks(),
          getActivityLog(),
          getSEOScore(),
          getIntegrationStatus()
        ]);
        
        setTasks(tasksData);
        setActivityLog(activityData);
        setSeoScore(scoreData);
        setIntegrationStatus(integrationsData);
        
        calculateCompletionPercentages(tasksData);
      } catch (err) {
        console.error('Error loading SEO data:', err);
        setError('Failed to load SEO dashboard data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const calculateCompletionPercentages = (taskData: TasksState) => {
    const percentages: Record<string, number> = {};
    
    Object.entries(taskData).forEach(([category, categoryTasks]) => {
      if (categoryTasks.length === 0) {
        percentages[category] = 0;
        return;
      }
      
      const completedCount = categoryTasks.filter(task => task.completed).length;
      percentages[category] = Math.round((completedCount / categoryTasks.length) * 100);
    });
    
    // Calculate overall completion percentage
    const allTasks = Object.values(taskData).flat();
    const overallCompleted = allTasks.filter(task => task.completed).length;
    percentages['overall'] = allTasks.length > 0 
      ? Math.round((overallCompleted / allTasks.length) * 100) 
      : 0;
    
    setCompletionPercentages(percentages);
  };

  const handleToggleCompletion = async (category: string, taskId: number) => {
    const actionKey = `${category}-${taskId}`;
    
    try {
      setPendingActions(prev => ({ ...prev, [actionKey]: true }));
      const updatedTasks = await toggleTaskCompletion(category, taskId);
      setTasks(updatedTasks);
      calculateCompletionPercentages(updatedTasks);
      
      // Refresh activity log
      const updatedLog = await getActivityLog();
      setActivityLog(updatedLog);
    } catch (err) {
      console.error('Error toggling task completion:', err);
      setError('Failed to update task. Please try again.');
    } finally {
      setPendingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Helper function to safely access completion percentages
  const getCompletionPercentage = (category: string): number => {
    return completionPercentages[category] || 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-b-4 border-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading SEO dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive p-4 rounded-md">
        <h2 className="font-semibold text-destructive mb-2">Error</h2>
        <p>{error}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">SEO Dashboard</h1>
        <p className="text-muted-foreground mb-6">
          Track your SEO tasks and optimize your website for search engines
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b mb-6">
        <Button 
          variant={activeTab === 'tasks' ? "default" : "ghost"} 
          onClick={() => setActiveTab('tasks')}
          className="rounded-none rounded-t-lg"
        >
          Tasks
        </Button>
        <Button 
          variant={activeTab === 'progress' ? "default" : "ghost"} 
          onClick={() => setActiveTab('progress')}
          className="rounded-none rounded-t-lg"
        >
          Progress
        </Button>
        <Button 
          variant={activeTab === 'activity' ? "default" : "ghost"} 
          onClick={() => setActiveTab('activity')}
          className="rounded-none rounded-t-lg"
        >
          Activity Log
        </Button>
        <Button 
          variant={activeTab === 'integrations' ? "default" : "ghost"} 
          onClick={() => setActiveTab('integrations')}
          className="rounded-none rounded-t-lg"
        >
          Integrations
        </Button>
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && tasks && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(tasks).map(([category, categoryTasks]) => (
            <Card key={category} className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="capitalize">{category.replace(/_/g, ' ')}</CardTitle>
                    <CardDescription className="mt-1">
                      {categoryTasks.filter(task => task.completed).length} of {categoryTasks.length} tasks completed
                    </CardDescription>
                  </div>
                </div>
                <Progress value={getCompletionPercentage(category)} className="h-2 mt-2" />
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {categoryTasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-3">
                      <Button
                        size="sm"
                        variant={task.completed ? "default" : "outline"}
                        className={`min-w-24 ${task.completed ? "bg-green-600 hover:bg-green-700" : ""}`}
                        onClick={() => handleToggleCompletion(category, task.id)}
                        disabled={pendingActions[`${category}-${task.id}`]}
                      >
                        {pendingActions[`${category}-${task.id}`] ? (
                          <span className="flex items-center gap-1">
                            <span className="h-3 w-3 border-t-2 border-r-2 border-white rounded-full animate-spin mr-1"></span>
                            Updating...
                          </span>
                        ) : task.completed ? (
                          "Completed"
                        ) : (
                          "Mark Complete"
                        )}
                      </Button>
                      <div>
                        <h4 className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                          {task.name}
                        </h4>
                        <p className={`text-sm ${task.completed ? "text-muted-foreground" : "text-muted-foreground"}`}>
                          {task.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && seoScore && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Overall SEO Progress</CardTitle>
              <CardDescription>Task completion by category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {tasks && Object.entries(tasks).map(([category]) => (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="capitalize text-sm font-medium">{category.replace(/_/g, ' ')}</span>
                    <span className="text-sm">{getCompletionPercentage(category)}%</span>
                  </div>
                  <Progress value={getCompletionPercentage(category)} className="h-2" />
                </div>
              ))}
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm">{getCompletionPercentage('overall')}%</span>
                </div>
                <Progress value={getCompletionPercentage('overall')} className="h-3" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>SEO Score</CardTitle>
              <CardDescription>Current scores by category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Content Quality</span>
                  <span className="text-sm">{seoScore.content}/100</span>
                </div>
                <Progress value={seoScore.content} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Link Profile</span>
                  <span className="text-sm">{seoScore.links}/100</span>
                </div>
                <Progress value={seoScore.links} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Performance</span>
                  <span className="text-sm">{seoScore.performance}/100</span>
                </div>
                <Progress value={seoScore.performance} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Mobile Optimization</span>
                  <span className="text-sm">{seoScore.mobile}/100</span>
                </div>
                <Progress value={seoScore.mobile} className="h-2" />
              </div>
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Overall SEO Score</span>
                  <span className="text-sm">{seoScore.overall}/100</span>
                </div>
                <Progress value={seoScore.overall} className="h-3" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && activityLog && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Recent actions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLog.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No activity recorded yet</p>
            ) : (
              <ul className="space-y-2">
                {activityLog.map((log, index) => (
                  <li key={index} className="border-b last:border-0 pb-2 last:pb-0">
                    <div className="flex justify-between">
                      <span className="text-sm">{log.message}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && integrationStatus && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>SEO Tool Integrations</CardTitle>
              <CardDescription>Connect your SEO tools for better insights</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Google Search Console</h4>
                    <p className="text-sm text-muted-foreground">Monitor search performance</p>
                  </div>
                  <div>
                    {integrationStatus.google ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Connected
                      </span>
                    ) : (
                      <Button size="sm" variant="outline">Connect</Button>
                    )}
                  </div>
                </li>
                <li className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Ahrefs</h4>
                    <p className="text-sm text-muted-foreground">Link analysis and backlink data</p>
                  </div>
                  <div>
                    {integrationStatus.ahrefs ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Connected
                      </span>
                    ) : (
                      <Button size="sm" variant="outline">Connect</Button>
                    )}
                  </div>
                </li>
                <li className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">SEMrush</h4>
                    <p className="text-sm text-muted-foreground">Competitor analysis and keyword research</p>
                  </div>
                  <div>
                    {integrationStatus.semrush ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Connected
                      </span>
                    ) : (
                      <Button size="sm" variant="outline">Connect</Button>
                    )}
                  </div>
                </li>
                <li className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Google Analytics</h4>
                    <p className="text-sm text-muted-foreground">Traffic and user behavior metrics</p>
                  </div>
                  <div>
                    {integrationStatus.analytics ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Connected
                      </span>
                    ) : (
                      <Button size="sm" variant="outline">Connect</Button>
                    )}
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Integration Benefits</CardTitle>
              <CardDescription>Why connect your SEO tools</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex gap-2">
                  <div className="h-5 w-5 text-green-600 flex-shrink-0">✓</div>
                  <p className="text-sm">Automatically track ranking progress for target keywords</p>
                </li>
                <li className="flex gap-2">
                  <div className="h-5 w-5 text-green-600 flex-shrink-0">✓</div>
                  <p className="text-sm">Get alerts when backlink profile changes are detected</p>
                </li>
                <li className="flex gap-2">
                  <div className="h-5 w-5 text-green-600 flex-shrink-0">✓</div>
                  <p className="text-sm">Calculate SEO score based on real-time analytics data</p>
                </li>
                <li className="flex gap-2">
                  <div className="h-5 w-5 text-green-600 flex-shrink-0">✓</div>
                  <p className="text-sm">Generate recommended tasks based on competitive insights</p>
                </li>
                <li className="flex gap-2">
                  <div className="h-5 w-5 text-green-600 flex-shrink-0">✓</div>
                  <p className="text-sm">Track ROI of SEO efforts with conversion data</p>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 
