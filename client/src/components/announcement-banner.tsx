import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Calendar, Users, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'event' | 'position' | 'alert' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date: string;
  end_date: string;
  is_active: boolean;
  link?: string;
  link_text?: string;
}

export default function AnnouncementBanner() {
  const [dismissedBanners, setDismissedBanners] = useState<number[]>(() => {
    const saved = localStorage.getItem('dismissedBanners');
    return saved ? JSON.parse(saved) : [];
  });

  // Fetch active announcements from Supabase
  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true);
      
      if (error) {
        console.error('Error fetching announcements:', error);
        return [];
      }
      
      return data || [];
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Filter active announcements that haven't been dismissed
  const activeAnnouncements = announcements.filter(announcement => {
    const now = new Date();
    const startDate = new Date(announcement.start_date);
    const endDate = new Date(announcement.end_date);
    
    return announcement.is_active && 
           now >= startDate && 
           now <= endDate && 
           !dismissedBanners.includes(announcement.id);
  });

  // Get highest priority announcement
  const currentAnnouncement = activeAnnouncements.sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  })[0];

  const dismissBanner = (id: number) => {
    const updated = [...dismissedBanners, id];
    setDismissedBanners(updated);
    localStorage.setItem('dismissedBanners', JSON.stringify(updated));
  };

  // Clear dismissed banners daily
  useEffect(() => {
    const lastClear = localStorage.getItem('lastBannerClear');
    const today = new Date().toDateString();
    
    if (lastClear !== today) {
      setDismissedBanners([]);
      localStorage.setItem('dismissedBanners', JSON.stringify([]));
      localStorage.setItem('lastBannerClear', today);
    }
  }, []);

  if (!currentAnnouncement) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'event': return <Calendar className="w-5 h-5" />;
      case 'position': return <Users className="w-5 h-5" />;
      case 'alert': return <AlertCircle className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getBannerStyles = (priority: string, type: string) => {
    const baseStyles = "border-l-4 shadow-sm";
    if (priority === 'urgent') {
      return `${baseStyles} bg-[color:var(--tsp-orange)] border-[color:var(--tsp-orange)] text-[color:var(--tsp-gray)]`;
    }
    if (priority === 'high') {
      return `${baseStyles} bg-[color:var(--tsp-orange)] border-[color:var(--tsp-orange)] text-[color:var(--tsp-gray)]`;
    }
    if (type === 'event') {
      return `${baseStyles} bg-[color:var(--tsp-teal-light)] border-[color:var(--tsp-teal)] text-[color:var(--tsp-teal)]`;
    }
    if (type === 'position') {
      return `${baseStyles} bg-[color:var(--tsp-gray)] border-[color:var(--tsp-gray)] text-[color:var(--tsp-teal)]`;
    }
    return `${baseStyles} bg-[color:var(--tsp-teal-light)] border-[color:var(--tsp-teal)] text-[color:var(--tsp-teal)]`;
  };

  return (
    <div className={`w-full px-4 py-3 ${getBannerStyles(currentAnnouncement.priority, currentAnnouncement.type)}`}>
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(currentAnnouncement.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">
              {currentAnnouncement.title}
            </h3>
            <p className="text-sm leading-relaxed">
              {currentAnnouncement.message}
            </p>
            {currentAnnouncement.link && (
              <a 
                href={currentAnnouncement.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm font-medium underline hover:no-underline"
              >
                {currentAnnouncement.link_text || 'Learn More'}
              </a>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dismissBanner(currentAnnouncement.id)}
          className="flex-shrink-0 h-6 w-6 p-0 hover:bg-black/10"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}