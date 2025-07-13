import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, Users, Plus, Edit, Trash2, Video, Phone, ArrowLeft } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface Meeting {
  id: number;
  title: string;
  description: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  location: string;
  meeting_type: string;
  max_attendees: number;
  organizer: string;
  agenda: string;
  status: string;
  created_at: string;
}

interface MeetingFormData {
  title: string;
  description: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location: string;
  meetingType: 'in_person' | 'virtual' | 'hybrid';
  maxAttendees: number;
  organizer: string;
  agenda: string;
  meetingLink: string;
}

export default function MeetingCalendar() {
  const [, setLocation] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState<MeetingFormData>({
    title: "",
    description: "",
    meetingDate: "",
    startTime: "",
    endTime: "",
    location: "",
    meetingType: 'in_person',
    maxAttendees: 10,
    organizer: "",
    agenda: "",
    meetingLink: ""
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: true });
      
      if (error) {
        console.error('Error fetching meetings:', error);
        return [];
      }
      
      return data || [];
    }
  });

  const createMeetingMutation = useMutation({
    mutationFn: async (data: MeetingFormData) => {
      const { data: result, error } = await supabase
        .from('meetings')
        .insert({
          title: data.title,
          description: data.description,
          meeting_date: data.meetingDate,
          start_time: data.startTime,
          end_time: data.endTime,
          location: data.location,
          meeting_type: data.meetingType,
          max_attendees: data.maxAttendees,
          organizer: data.organizer,
          agenda: data.agenda,
          status: 'scheduled'
        });
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setIsCreating(false);
      setFormData({
        title: "",
        description: "",
        meetingDate: "",
        startTime: "",
        endTime: "",
        location: "",
        meetingType: "in_person",
        maxAttendees: 10,
        organizer: "",
        agenda: "",
        meetingLink: ""
      });
      toast({
        title: "Meeting scheduled successfully",
        description: "New meeting has been scheduled successfully.",
      });
    },
    onError: (error) => {
      console.error("Create meeting error:", error);
      toast({
        title: "Error",
        description: "Failed to create meeting. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMeetingMutation.mutate({
      title: formData.title,
      description: formData.description,
      meetingDate: formData.meetingDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      location: formData.location,
      meetingType: formData.meetingType,
      maxAttendees: formData.maxAttendees,
      organizer: formData.organizer,
      agenda: formData.agenda,
      meetingLink: formData.meetingLink
    });
  };

  const handleDeleteMeeting = (meetingId: number) => {
    if (confirm("Are you sure you want to delete this meeting?")) {
      // TODO: Implement delete mutation
      toast({
        title: "Delete not implemented",
        description: "Meeting deletion is being migrated to Supabase.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "in_progress": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "completed": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'in_person': return <MapPin className="w-4 h-4" />;
      case 'virtual': return <Video className="w-4 h-4" />;
      case 'hybrid': return <Phone className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const isUpcoming = (meetingDate: string, startTime: string) => {
    const meetingDateTime = new Date(`${meetingDate}T${startTime}`);
    const now = new Date();
    return meetingDateTime > now;
  };

  const upcomingMeetings = meetings.filter((meeting: Meeting) => 
    isUpcoming(meeting.meeting_date, meeting.start_time) && meeting.status === "scheduled"
  );

  const pastMeetings = meetings.filter((meeting: Meeting) => 
    !isUpcoming(meeting.meeting_date, meeting.start_time) || meeting.status === "completed"
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => (window as any).dashboardSetActiveSection?.("meetings")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Meetings Hub
        </Button>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Meetings</span>
          <span>•</span>
          <span className="text-gray-900 dark:text-white font-medium">Calendar</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meeting Calendar</h1>
            <p className="text-gray-600 dark:text-gray-400">Schedule and manage team meetings and events</p>
          </div>
        </div>
        <Button onClick={() => setIsCreating(true)} className="self-start">
          <Plus className="w-4 h-4 mr-2" />
          Schedule Meeting
        </Button>
      </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{upcomingMeetings.length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{pastMeetings.length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{meetings.length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Meetings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Create Form */}
          {isCreating && (
            <Card>
              <CardHeader>
                <CardTitle>Schedule New Meeting</CardTitle>
                <CardDescription>Create a new meeting and send invitations</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Meeting Title</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Weekly team standup"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Meeting purpose and objectives"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Date</label>
                      <Input
                        type="date"
                        value={formData.meetingDate}
                        onChange={(e) => setFormData({ ...formData, meetingDate: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Start Time</label>
                      <Input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">End Time</label>
                      <Input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Meeting Type</label>
                      <Select value={formData.meetingType} onValueChange={(value: any) => setFormData({ ...formData, meetingType: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_person">In Person</SelectItem>
                          <SelectItem value="virtual">Virtual</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Max Attendees</label>
                      <Input
                        type="number"
                        value={formData.maxAttendees}
                        onChange={(e) => setFormData({ ...formData, maxAttendees: parseInt(e.target.value) || 20 })}
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Location / Meeting Link</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder={formData.meetingType === 'virtual' ? "https://zoom.us/j/..." : "Conference Room A"}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Organizer</label>
                    <Input
                      value={formData.organizer}
                      onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                      placeholder="Meeting organizer name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Agenda (Optional)</label>
                    <Textarea
                      value={formData.agenda}
                      onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                      placeholder="Meeting agenda and topics"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createMeetingMutation.isPending}>
                      {createMeetingMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Meetings */}
          {upcomingMeetings.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Upcoming Meetings</h2>
              <div className="space-y-4">
                {upcomingMeetings.map((meeting: Meeting) => (
                  <Card key={meeting.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{meeting.title}</h3>
                            <Badge className={getStatusColor(meeting.status)}>
                              {meeting.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(meeting.meeting_date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {meeting.start_time} - {meeting.end_time}
                            </span>
                            <span className="flex items-center gap-1">
                              {getMeetingTypeIcon(meeting.meeting_type)}
                              {meeting.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              Max {meeting.max_attendees}
                            </span>
                          </div>
                          {meeting.description && (
                            <p className="text-gray-600 dark:text-gray-400 mb-2">{meeting.description}</p>
                          )}
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            Organized by: {meeting.organizer}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Past Meetings */}
          {pastMeetings.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Past Meetings</h2>
              <div className="space-y-4">
                {pastMeetings.slice(0, 5).map((meeting: Meeting) => (
                  <Card key={meeting.id} className="opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{meeting.title}</h3>
                            <Badge className={getStatusColor(meeting.status)}>
                              {meeting.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(meeting.meeting_date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {meeting.start_time} - {meeting.end_time}
                            </span>
                            <span className="flex items-center gap-1">
                              {getMeetingTypeIcon(meeting.meeting_type)}
                              {meeting.location}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {meetings.length === 0 && !isCreating && (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No meetings scheduled</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Start by scheduling your first team meeting</p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule First Meeting
                </Button>
              </CardContent>
            </Card>
          )}
    </div>
  );
}