import { useQuery } from "@tanstack/react-query";
import { ListTodo, MessageCircle, ClipboardList, FolderOpen, BarChart3, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import SandwichCollectionForm from "@/components/sandwich-collection-form";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, PERMISSIONS } from "@shared/auth-utils";
import type { Project, Message, MeetingMinutes, DriveLink, WeeklyReport, SandwichCollection, Meeting } from "@shared/schema";

import { supabase } from '@/lib/supabase';
import { supabaseService } from '@/lib/supabase-service';
interface DashboardOverviewProps {
  onSectionChange: (section: string) => void;
}

export default function DashboardOverview({ onSectionChange }: DashboardOverviewProps) {
  const { user } = useAuth();
  
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching projects in dashboard:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: hasPermission(user, PERMISSIONS.VIEW_PROJECTS)
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error fetching messages in dashboard:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: hasPermission(user, PERMISSIONS.GENERAL_CHAT)
  });

  const { data: driveLinks = [] } = useQuery<DriveLink[]>({
    queryKey: ["drive-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drive_links')
        .select('*')
        .order('id', { ascending: false });
      
      if (error) {
        console.error('Error fetching drive links:', error);
        return [];
      }
      
      return data || [];
    }
  });

  const { data: weeklyReports = [] } = useQuery({
    queryKey: ["weekly-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error fetching weekly reports:', error);
        return [];
      }
      
      return data || [];
    }
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('date', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error fetching meetings:', error);
        return [];
      }
      
      return data || [];
    }
  });

  const { data: statsData } = useQuery({
    queryKey: ["sandwich-collections-stats"],
    queryFn: async () => {
      try {
        // Use the same RPC function that the collections log uses for accurate totals
        const stats = await supabaseService.sandwichCollection.getCollectionStats();
        console.log('Dashboard stats from RPC:', stats);
        if (stats && stats[0]) {
          return {
            completeTotalSandwiches: stats[0].complete_total_sandwiches || 0,
            individual_sandwiches: stats[0].individual_sandwiches || 0,
            groupSandwiches: stats[0].group_sandwiches || 0
          };
        }
      } catch (error) {
        console.warn('RPC function failed in dashboard, falling back to manual calculation:', error);
      }
      
      // Fallback to manual calculation if RPC fails
      const { data, error } = await supabase
        .from('sandwich_collections')
        .select('individual_sandwiches, group_collections');
      
      if (error) {
        console.error('Error fetching collection stats:', error);
        return { completeTotalSandwiches: 0 };
      }
      
      // Use the same calculation logic as the collections log for consistency
      let individualTotal = 0;
      let groupTotal = 0;
      
      data?.forEach(collection => {
        const individualCount = collection.individual_sandwiches || 0;
        individualTotal += individualCount;
        
        // Calculate group collections total using same logic as collections log
        try {
          if (collection.group_collections && collection.group_collections !== "[]" && collection.group_collections !== "") {
            const groupData = JSON.parse(collection.group_collections);
            if (Array.isArray(groupData)) {
              groupTotal += groupData.reduce((sum: number, group: any) => 
                sum + (Number(group.sandwichCount) || Number(group.sandwich_count) || Number(group.count) || 0), 0
              );
            }
          }
        } catch (error) {
          // Handle text format like "Marketing Team: 8, Development: 6"
          if (collection.group_collections && collection.group_collections !== "[]") {
            const matches = collection.group_collections.match(/(\d+)/g);
            if (matches) {
              groupTotal += matches.reduce((sum, num) => sum + parseInt(num), 0);
            }
          }
        }
      });
      
      return { 
        completeTotalSandwiches: individualTotal + groupTotal,
        individual_sandwiches: individualTotal,
        groupSandwiches: groupTotal
      };
    },
    staleTime: 0, // Always fetch fresh data to show corrected totals
    refetchOnWindowFocus: true
  });

  const getProjectStatusCounts = () => {
    const counts = {
      available: 0,
      in_progress: 0,
      planning: 0,
      completed: 0,
    };
    
    projects.forEach(project => {
      if (counts.hasOwnProperty(project.status)) {
        counts[project.status as keyof typeof counts]++;
      }
    });
    
    return counts;
  };

  const statusCounts = getProjectStatusCounts();
  const totalWeeklySandwiches = weeklyReports.reduce((sum: number, report: any) => sum + (report.sandwich_count || 0), 0);
  const totalCollectedSandwiches = statsData?.completeTotalSandwiches || 0;
  const activeProjects = projects.filter(p => p.status === "in_progress" || p.status === "available" || p.status === "planning");
  const recentMessages = messages.slice(0, 3);

  
  // Filter upcoming meetings (not completed and future or current dates)
  const upcomingMeetings = meetings
    .filter(meeting => meeting.status !== "completed")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6 font-body">
      {/* Total Collections Card */}
      <div className="bg-gradient-to-r from-primary to-brand-teal rounded-lg shadow-md p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-sub-heading">Total Collections</h3>
            <p className="text-xl font-main-heading">
            {Number(totalCollectedSandwiches || 0).toLocaleString()}
            </p>
            <p className="text-xs font-body text-white/80">sandwiches collected</p>
          </div>
          <div className="bg-white bg-opacity-20 p-2 rounded-full">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sandwich Collection Form */}
      <SandwichCollectionForm />



      {/* Active Projects - Only show if user has permission */}
      {hasPermission(user, PERMISSIONS.VIEW_PROJECTS) && (
        <div className="bg-card rounded-lg border border-border">
          <div className="px-4 py-3 border-b border-border flex justify-between items-center">
            <h2 className="text-base font-sub-heading text-primary">Active Projects</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onSectionChange("projects")}
              className="text-xs px-2 py-1"
            >
              View All
            </Button>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {activeProjects.map((project) => (
                <div 
                  key={project.id} 
                  className="p-2 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => onSectionChange("projects")}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">{project.title}</h3>
                      <p className="text-xs text-slate-600">{project.description}</p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {project.status === "in_progress" ? "In Progress" : 
                       project.status === "available" ? "Available" : "Planning"}
                    </span>
                  </div>
                </div>
              ))}
              
              {activeProjects.length === 0 && (
                <p className="text-slate-500 text-center py-3 text-sm">No active projects</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Meetings - Only show if user has permission */}
      {hasPermission(user, PERMISSIONS.VIEW_MEETINGS) && (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-base font-semibold text-slate-900">Upcoming Meetings</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onSectionChange("meetings")}
              className="text-xs px-2 py-1"
            >
              View All
            </Button>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {upcomingMeetings.map((meeting) => (
                <div 
                  key={meeting.id} 
                  className="p-2 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => onSectionChange("meetings")}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">{meeting.title}</h3>
                      <p className="text-xs text-slate-600">
                        {new Date(meeting.date).toLocaleDateString()} at {meeting.time}
                      </p>
                      {meeting.location && (
                        <p className="text-xs text-slate-500 mt-1">📍 {meeting.location}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 capitalize">
                      {meeting.status === "planning" ? "Planning" : 
                       meeting.status === "agenda_set" ? "Agenda Set" : meeting.status}
                    </span>
                  </div>
                </div>
              ))}
              
              {upcomingMeetings.length === 0 && (
                <p className="text-slate-500 text-center py-3 text-sm">No upcoming meetings</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Messages - Only show if user has permission */}
      {hasPermission(user, PERMISSIONS.GENERAL_CHAT) && (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-base font-semibold text-slate-900">Recent Messages</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onSectionChange("messages")}
              className="text-xs px-2 py-1"
            >
              View All
            </Button>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {recentMessages.map((message) => (
                <div 
                  key={message.id} 
                  className="p-2 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => onSectionChange("messages")}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-slate-900">{message.sender}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(message.createdAt || message.updatedAt || '').toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    {message.content.length > 60 
                      ? message.content.substring(0, 60) + "..." 
                      : message.content}
                  </p>
                </div>
              ))}
              
              {recentMessages.length === 0 && (
                <p className="text-slate-500 text-center py-3 text-sm">No recent messages</p>
              )}
            </div>
          </div>
        </div>
      )}



    </div>
  );
}