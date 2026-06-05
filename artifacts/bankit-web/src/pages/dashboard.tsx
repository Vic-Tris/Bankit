import { useAuth } from "@/lib/auth";
import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { ArrowUpRight, CheckCircle2, Clock, XCircle, CreditCard, Shield } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboardStats({
    query: {
      queryKey: getGetDashboardStatsQueryKey()
    }
  });

  if (isLoading || !stats) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-2">Welcome back, {user?.name}. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Verified Today
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{stats.verifiedToday || 0}</div>
          </CardContent>
        </Card>

        {user?.role !== "sales_rep" && (
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Today's Revenue
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">
                {formatCurrency(stats.todayRevenue || 0)}
              </div>
            </CardContent>
          </Card>
        )}

        {user?.role === "admin" && (
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Pending Transfers
              </CardTitle>
              <Clock className="h-4 w-4 text-accent-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{stats.pendingTransfers || 0}</div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Dashboard widgets will be added here in subsequent passes depending on role */}
    </div>
  );
}
