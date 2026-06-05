import { useState } from "react";
import { 
  useGetRevenueReport, 
  getGetRevenueReportQueryKey,
  useExportReport,
  getExportReportQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, Activity, BarChart2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQueryClient } from "@tanstack/react-query";

export default function Reports() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "annual">("monthly");
  
  const { data: report, isLoading } = useGetRevenueReport(
    { period },
    { query: { queryKey: getGetRevenueReportQueryKey({ period }) } }
  );

  const queryClient = useQueryClient();

  const handleExport = async () => {
    // In a real app, this would trigger a download.
    // For now, we'll just simulate fetching the export data.
    try {
      await queryClient.fetchQuery({
        queryKey: getExportReportQueryKey({ type: "revenue", period }),
        queryFn: () => fetch(`/api/reports/export?type=revenue&period=${period}`).then(res => res.json())
      });
      // trigger download using the blob or URL
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Reports</h1>
          <p className="text-muted-foreground mt-2">Analyze income streams and transaction volumes.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div>Loading reports...</div>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Total Revenue
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-mono">{formatCurrency(report.totalRevenue)}</div>
                <p className="text-sm text-muted-foreground mt-1">For selected period</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Transaction Volume
                </CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-mono">{report.transactionCount || 0}</div>
                <p className="text-sm text-muted-foreground mt-1">Successful transactions</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5" />
                Revenue Breakdown
              </CardTitle>
              <CardDescription>Income trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.periodBreakdown} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `₦${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="bg-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            No data available for the selected period.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
