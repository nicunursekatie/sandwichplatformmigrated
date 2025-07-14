import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface DiagnosticResult {
  query: string;
  data: any;
  error?: string;
}

export default function DataDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    setResults([]);
    
    const diagnosticQueries = [
      {
        name: "Total records and date range",
        query: async () => {
          const { data, error } = await supabase
            .from('sandwich_collections')
            .select('collection_date')
            .order('collection_date', { ascending: true });
          
          if (error) throw error;
          
          const validDates = data.filter(d => d.collection_date && d.collection_date.match(/^\d{4}-\d{2}-\d{2}/));
          const years = new Set(validDates.map(d => d.collection_date.substring(0, 4)));
          
          return {
            total_records: data.length,
            valid_date_records: validDates.length,
            earliest_date: validDates[0]?.collection_date,
            latest_date: validDates[validDates.length - 1]?.collection_date,
            unique_years: Array.from(years).sort(),
            year_counts: Array.from(years).sort().map(year => ({
              year,
              count: validDates.filter(d => d.collection_date.startsWith(year)).length
            }))
          };
        }
      },
      {
        name: "Sample of earliest records",
        query: async () => {
          const { data, error } = await supabase
            .from('sandwich_collections')
            .select('id, collection_date, host_name, individual_sandwiches, submitted_at')
            .order('collection_date', { ascending: true })
            .limit(10);
          
          if (error) throw error;
          return data;
        }
      },
      {
        name: "Sample of latest records",
        query: async () => {
          const { data, error } = await supabase
            .from('sandwich_collections')
            .select('id, collection_date, host_name, individual_sandwiches, submitted_at')
            .order('collection_date', { ascending: false })
            .limit(10);
          
          if (error) throw error;
          return data;
        }
      },
      {
        name: "Records before 2025",
        query: async () => {
          const { data, error } = await supabase
            .from('sandwich_collections')
            .select('collection_date')
            .lt('collection_date', '2025-01-01')
            .order('collection_date', { ascending: false })
            .limit(20);
          
          if (error) throw error;
          return {
            count: data.length,
            samples: data
          };
        }
      },
      {
        name: "Date format analysis",
        query: async () => {
          const { data, error } = await supabase
            .from('sandwich_collections')
            .select('collection_date')
            .limit(100);
          
          if (error) throw error;
          
          const formats = {
            valid_yyyy_mm_dd: 0,
            empty_string: 0,
            null_value: 0,
            other_format: 0
          };
          
          data.forEach(record => {
            if (!record.collection_date) {
              formats.null_value++;
            } else if (record.collection_date === '') {
              formats.empty_string++;
            } else if (record.collection_date.match(/^\d{4}-\d{2}-\d{2}/)) {
              formats.valid_yyyy_mm_dd++;
            } else {
              formats.other_format++;
            }
          });
          
          return formats;
        }
      },
      {
        name: "Check for offset years",
        query: async () => {
          const { data, error } = await supabase
            .from('sandwich_collections')
            .select('collection_date')
            .gte('collection_date', '2025-01-01')
            .lte('collection_date', '2025-12-31')
            .order('collection_date', { ascending: true })
            .limit(10);
          
          if (error) throw error;
          
          // Check if these dates might be offset by 5 years
          const offsetAnalysis = data.map(record => ({
            original: record.collection_date,
            possibleActual: record.collection_date ? 
              (parseInt(record.collection_date.substring(0, 4)) - 5) + record.collection_date.substring(4) : 
              null
          }));
          
          return {
            sample_2025_dates: data.length,
            offset_analysis: offsetAnalysis
          };
        }
      }
    ];
    
    for (const diagnostic of diagnosticQueries) {
      try {
        const data = await diagnostic.query();
        setResults(prev => [...prev, {
          query: diagnostic.name,
          data
        }]);
      } catch (error) {
        setResults(prev => [...prev, {
          query: diagnostic.name,
          data: null,
          error: error.message
        }]);
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Data Diagnostics</CardTitle>
          <CardDescription>
            Run diagnostic queries to understand the date range issue in sandwich collections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostics} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Diagnostics
          </Button>
        </CardContent>
      </Card>
      
      {results.map((result, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="text-lg">{result.query}</CardTitle>
          </CardHeader>
          <CardContent>
            {result.error ? (
              <p className="text-red-500">Error: {result.error}</p>
            ) : (
              <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}