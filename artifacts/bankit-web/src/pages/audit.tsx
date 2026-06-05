import { useState } from "react";
import { useListAuditLogs, getListAuditLogsQueryKey, useGetAuditSummary, getGetAuditSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Search, Filter } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const limit = 15;

  const { data: summary } = useGetAuditSummary({
    query: { queryKey: getGetAuditSummaryQueryKey() }
  });

  const { data: logs, isLoading } = useListAuditLogs(
    { 
      page, 
      limit,
      action: actionFilter !== "all" ? actionFilter : undefined
    },
    { 
      query: { 
        queryKey: getListAuditLogsQueryKey({ 
          page, 
          limit,
          action: actionFilter !== "all" ? actionFilter : undefined
        }) 
      } 
    }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">Comprehensive system event tracking and security monitoring.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Total Events</p>
            <p className="text-2xl font-bold font-mono">{summary?.totalEvents || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Logins</p>
            <p className="text-2xl font-bold font-mono">{summary?.logins || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Verifications</p>
            <p className="text-2xl font-bold font-mono">{summary?.verifications || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Transfers</p>
            <p className="text-2xl font-bold font-mono">{summary?.transfers || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldAlert className="w-4 h-4 text-primary" />
            System Events
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="verify">Verify</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="user_update">User Update</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-wider w-[180px]">Timestamp</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider w-[150px]">Action</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider w-[180px]">User</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Details</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider w-[150px] text-right">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">Loading audit logs...</TableCell>
                </TableRow>
              ) : !logs?.data.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No events found.</TableCell>
                </TableRow>
              ) : (
                logs.data.map(log => (
                  <TableRow key={log.id} className="font-mono text-sm">
                    <TableCell className="text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-muted/50 border-border">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-sans font-medium">{log.userName}</div>
                      <div className="text-xs text-muted-foreground uppercase">{log.userRole?.replace('_', ' ')}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[300px]" title={log.details || ""}>
                      {log.details || "-"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{log.ipAddress}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {logs && logs.total > limit && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, logs.total)} of {logs.total}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={page * limit >= logs.total}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
