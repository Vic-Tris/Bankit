import { useGetTaxDashboard, getGetTaxDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { Calculator, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Tax() {
  const { data: taxData, isLoading } = useGetTaxDashboard({
    query: { queryKey: getGetTaxDashboardQueryKey() }
  });

  if (isLoading) return <div>Loading tax data...</div>;
  if (!taxData) return <div>No tax data available.</div>;

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tax & VAT Dashboard</h1>
        <p className="text-muted-foreground mt-2">Automated tax estimates and revenue projections.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Daily Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatCurrency(taxData.dailyEstimate)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Monthly Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatCurrency(taxData.monthlyEstimate)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Annual Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatCurrency(taxData.annualEstimate)}</div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider opacity-80">
              VAT Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatCurrency(taxData.vatTotal)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Tax Breakdown
            </CardTitle>
            <CardDescription>Distribution of calculated tax obligations</CardDescription>
          </CardHeader>
          <CardContent>
            {taxData.breakdown && taxData.breakdown.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taxData.breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="amount"
                      nameKey="label"
                    >
                      {taxData.breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No breakdown data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Projections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Projected Annual Revenue</p>
              <p className="text-3xl font-mono font-bold">{formatCurrency(taxData.revenueProjection)}</p>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Breakdown Detail</h4>
              {taxData.breakdown?.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{(item.rate * 100).toFixed(1)}% Rate</p>
                  </div>
                  <p className="font-mono text-sm font-semibold">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
