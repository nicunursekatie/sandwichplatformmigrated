import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DebugStats {
  totalEntries: number;
  individualSandwiches: number;
  groupSandwiches: number;
  completeTotalSandwiches: number;
  debug?: {
    lastUpdated: string;
    sampleRecentEntries: Array<{
      id: number;
      date: string;
      individual: number;
      hasGroups: boolean;
    }>;
  };
}

export function DebugPanel() {
  const [stats, setStats] = useState<DebugStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = forceRefresh 
        ? '/api/sandwich-collections/stats?refresh=true'
        : '/api/sandwich-collections/stats';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>🔧 Sandwich Totals Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchStats(false)} 
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Loading...' : 'Fetch Stats (Cached)'}
          </Button>
          <Button 
            onClick={() => fetchStats(true)} 
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Force Refresh'}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>Error: {error}</AlertDescription>
          </Alert>
        )}

        {stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm text-blue-600">Total Entries</div>
                <div className="text-2xl font-bold">{formatNumber(stats.totalEntries)}</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-sm text-green-600">Individual Sandwiches</div>
                <div className="text-2xl font-bold">{formatNumber(stats.individualSandwiches)}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <div className="text-sm text-purple-600">Group Sandwiches</div>
                <div className="text-2xl font-bold">{formatNumber(stats.groupSandwiches)}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-sm text-orange-600">Total Sandwiches</div>
                <div className="text-2xl font-bold">{formatNumber(stats.completeTotalSandwiches)}</div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm font-medium mb-2">Expected vs Actual</div>
              <div className="text-sm">
                <div>Expected (from backup): 2,183,360</div>
                <div>Actual: {formatNumber(stats.completeTotalSandwiches)}</div>
                <div className={stats.completeTotalSandwiches < 2000000 ? 'text-red-600' : 'text-green-600'}>
                  Difference: {formatNumber(2183360 - stats.completeTotalSandwiches)}
                  {stats.completeTotalSandwiches < 2000000 ? ' (MISSING)' : ' (EXPECTED)'}
                </div>
              </div>
            </div>

            {stats.debug && (
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm font-medium mb-2">Debug Info</div>
                <div className="text-xs space-y-1">
                  <div>Last Updated: {new Date(stats.debug.lastUpdated).toLocaleString()}</div>
                  <div>Recent Entries:</div>
                  {stats.debug.sampleRecentEntries.map((entry, i) => (
                    <div key={i} className="ml-2">
                      ID: {entry.id}, Date: {entry.date}, Individual: {entry.individual}, HasGroups: {entry.hasGroups ? 'Yes' : 'No'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}