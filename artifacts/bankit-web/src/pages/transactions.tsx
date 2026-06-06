import { useState } from "react";
import { Link } from "wouter";
import { useListTransactions, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, Eye, Filter } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ListTransactionsStatus } from "@workspace/api-client-react";

export default function Transactions() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ListTransactionsStatus | "all">("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useListTransactions(
    { 
      search: search || undefined,
      status: status !== "all" ? status : undefined,
      page,
      limit
    },
    {
      query: {
        queryKey: getListTransactionsQueryKey({ 
          search: search || undefined,
          status: status !== "all" ? status : undefined,
          page,
          limit
        })
      }
    }
  );

  const getStatusBadge = (txStatus: string) => {
    switch (txStatus) {
      case "verified":
        return <Badge className="bg-primary/20 text-primary border-primary/20">Verified</Badge>;
      case "failed":
        return <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/20">Failed</Badge>;
      default:
        return <Badge variant="secondary" className="bg-secondary/50 text-muted-foreground border-border/50">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-2">View and manage all payment records across the platform.</p>
        </div>
      </div>

      <Card className="bg-card">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by CPLID, customer name, or bank..."
              className="pl-9 font-mono text-sm bg-muted/50"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-full sm:w-48 flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={status} 
              onValueChange={(v) => {
                setStatus(v as ListTransactionsStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-wider">CPLID</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Customer</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Bank</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Date</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-right">Amount</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">Loading transactions...</TableCell>
                </TableRow>
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No transactions found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((tx) => (
                  <TableRow key={tx.id} className="group cursor-pointer hover:bg-muted/20 transition-colors">
                    <TableCell className="font-mono text-sm">{tx.cplid}</TableCell>
                    <TableCell>
                      <div className="font-medium">{tx.customerName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{tx.customerAccountNumber}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.bankName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(tx.date)}</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell>
                      <Link href={`/transactions/${tx.id}`}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {data && data.total > limit && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.total)} of {data.total}
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
                  disabled={page * limit >= data.total}
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
