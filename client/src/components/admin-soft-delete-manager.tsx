import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Trash2, RotateCcw, AlertTriangle, Eye, Calendar, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../hooks/use-toast';

interface DeletionRecord {
  id: number;
  tableName: string;
  recordId: string;
  deletedAt: string;
  deletedBy: string;
  deletionReason: string;
  recordData: any;
  canRestore: boolean;
  restoredAt?: string;
  restoredBy?: string;
}

interface SoftDeleteManagerProps {
  className?: string;
}

export function AdminSoftDeleteManager({ className }: SoftDeleteManagerProps) {
  const { user } = useAuth();
  const [deletionHistory, setDeletionHistory] = useState<DeletionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<DeletionRecord | null>(null);
  const [showRecordData, setShowRecordData] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin) {
      fetchDeletionHistory();
    }
  }, [isAdmin, selectedTable]);

  const fetchDeletionHistory = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('deletion_audit')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (selectedTable !== 'all') {
        query = query.eq('table_name', selectedTable);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching deletion history:', error);
        toast({
          title: "Error",
          description: "Failed to fetch deletion history",
          variant: "destructive",
        });
        return;
      }

      setDeletionHistory(data || []);
    } catch (error) {
      console.error('Error fetching deletion history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch deletion history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreRecord = async (record: DeletionRecord) => {
    try {
      // Call the restore function
      const { error } = await supabase.rpc('restore_soft_deleted_record', {
        table_name_param: record.tableName,
        record_id_param: record.recordId,
        restore_user_id: user?.id
      });

      if (error) {
        console.error('Error restoring record:', error);
        toast({
          title: "Error",
          description: `Failed to restore record: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Record restored successfully from ${record.tableName}`,
      });

      // Refresh the deletion history
      fetchDeletionHistory();
    } catch (error) {
      console.error('Error restoring record:', error);
      toast({
        title: "Error",
        description: "Failed to restore record",
        variant: "destructive",
      });
    }
  };

  const permanentlyDeleteRecord = async (record: DeletionRecord) => {
    try {
      // Call the permanent delete function
      const { error } = await supabase.rpc('permanently_delete_record', {
        table_name_param: record.tableName,
        record_id_param: record.recordId
      });

      if (error) {
        console.error('Error permanently deleting record:', error);
        toast({
          title: "Error",
          description: `Failed to permanently delete record: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Record permanently deleted from ${record.tableName}`,
      });

      // Refresh the deletion history
      fetchDeletionHistory();
    } catch (error) {
      console.error('Error permanently deleting record:', error);
      toast({
        title: "Error",
        description: "Failed to permanently delete record",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTableDisplayName = (tableName: string) => {
    return tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusBadge = (record: DeletionRecord) => {
    if (record.restoredAt) {
      return <Badge variant="secondary">Restored</Badge>;
    }
    if (!record.canRestore) {
      return <Badge variant="destructive">Permanently Deleted</Badge>;
    }
    return <Badge variant="outline">Soft Deleted</Badge>;
  };

  const uniqueTables = [...new Set(deletionHistory.map(r => r.tableName))];

  if (!isAdmin) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Access Denied
          </CardTitle>
          <CardDescription>
            You need administrator privileges to access the soft delete manager.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Soft Delete Manager
          </CardTitle>
          <CardDescription>
            Manage soft-deleted records across all tables. Restore or permanently delete records as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history">Deletion History</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="table-filter" className="text-sm font-medium">
                    Filter by table:
                  </label>
                  <select
                    id="table-filter"
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    <option value="all">All Tables</option>
                    {uniqueTables.map(table => (
                      <option key={table} value={table}>
                        {getTableDisplayName(table)}
                      </option>
                    ))}
                  </select>
                </div>
                <Button 
                  onClick={fetchDeletionHistory}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  Refresh
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading deletion history...</div>
              ) : deletionHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No deletion history found
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table</TableHead>
                        <TableHead>Record ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deleted At</TableHead>
                        <TableHead>Deleted By</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletionHistory.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {getTableDisplayName(record.tableName)}
                          </TableCell>
                          <TableCell>{record.recordId}</TableCell>
                          <TableCell>{getStatusBadge(record)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {formatDate(record.deletedAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <User className="h-3 w-3" />
                              {record.deletedBy}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {record.deletionReason}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setShowRecordData(true);
                                }}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              
                              {record.canRestore && !record.restoredAt && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <RotateCcw className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Restore Record</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to restore this record from {getTableDisplayName(record.tableName)}? 
                                        This will make it visible and accessible again.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => restoreRecord(record)}>
                                        Restore
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              
                              {isSuperAdmin && record.canRestore && !record.restoredAt && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Permanently Delete Record</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to permanently delete this record? 
                                        This action cannot be undone and the record will be completely removed from the database.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => permanentlyDeleteRecord(record)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Permanently Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="stats" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Deletions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{deletionHistory.length}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Restorable Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {deletionHistory.filter(r => r.canRestore && !r.restoredAt).length}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Restored Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {deletionHistory.filter(r => r.restoredAt).length}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Deletions by Table</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {uniqueTables.map(table => {
                      const count = deletionHistory.filter(r => r.tableName === table).length;
                      return (
                        <div key={table} className="flex justify-between items-center">
                          <span className="text-sm">{getTableDisplayName(table)}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Record Data Modal */}
      {showRecordData && selectedRecord && (
        <AlertDialog open={showRecordData} onOpenChange={setShowRecordData}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Record Data</AlertDialogTitle>
              <AlertDialogDescription>
                Data for {getTableDisplayName(selectedRecord.tableName)} record {selectedRecord.recordId}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="max-h-96 overflow-auto">
              <pre className="text-xs bg-muted p-4 rounded-md">
                {JSON.stringify(selectedRecord.recordData, null, 2)}
              </pre>
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowRecordData(false)}>
                Close
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
} 