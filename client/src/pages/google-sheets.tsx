import { GoogleSheetsViewer } from "@/components/google-sheets-viewer";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, PERMISSIONS } from "@shared/auth-utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface GoogleSheetData {
  id: number;
  sheet_id: string;
  sheet_name: string;
  sheet_url: string;
  sync_status: string;
  last_sync: string;
  created_at: string;
}

export default function GoogleSheetsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL LOGIC
  const { data: sheetsData, isLoading } = useQuery<GoogleSheetData[]>({
    queryKey: ["google-sheets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_sheets_integration')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching Google Sheets data:', error);
        return [];
      }
      
      return data || [];
    }
  });

  const syncSheetMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const { data, error } = await supabase
        .from('google_sheets_integration')
        .update({ 
          last_sync: new Date().toISOString(),
          sync_status: 'syncing'
        })
        .eq('sheet_id', sheetId);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-sheets"] });
      toast({
        title: "Sheet sync initiated",
        description: "Google Sheet sync has been started.",
      });
    },
    onError: (error) => {
      console.error("Sync sheet error:", error);
      toast({
        title: "Error",
        description: "Failed to sync sheet. Please try again.",
        variant: "destructive",
      });
    }
  });

  // NOW we can safely check permissions after all hooks have been called
  const canView = hasPermission(user, PERMISSIONS.VIEW_SANDWICH_DATA);

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">You don't have permission to view the sandwich data spreadsheet.</p>
        </div>
      </div>
    );
  }

  const handleSyncSheet = async (sheetId: string) => {
    try {
      await syncSheetMutation.mutateAsync(sheetId);
    } catch (error) {
      console.error("Sync error:", error);
    }
  };

  const handleAddSheet = async () => {
    try {
      // TODO: Implement add sheet functionality
      toast({
        title: "Add not implemented",
        description: "Adding new sheets is being migrated to Supabase.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add sheet. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSheet = async (sheetId: string) => {
    try {
      // TODO: Implement delete sheet functionality
      toast({
        title: "Delete not implemented",
        description: "Deleting sheets is being migrated to Supabase.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete sheet. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Sandwich Totals Data Sheet</h1>
        <p className="text-gray-600 mt-2">
          Complete sandwich collection data from 2023-2025. This displays the latest version of the sandwich totals spreadsheet in read-only format.
        </p>
      </div>

      <GoogleSheetsViewer 
        title="Sandwich Totals Data Sheet"
        height={700}
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">About This Data Sheet:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Complete sandwich collection totals spanning 2023-2025</li>
          <li>• Shows the most recent version of the data spreadsheet</li>
          <li>• Automatically displays static backup if live version isn't accessible</li>
          <li>• Data is read-only for viewing and analysis purposes</li>
          <li>• Click "Open" to view in a new tab for better navigation</li>
        </ul>
      </div>
    </div>
  );
}