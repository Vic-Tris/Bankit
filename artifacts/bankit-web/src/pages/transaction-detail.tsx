import { useParams, Link } from "wouter";
import { useGetTransaction, getGetTransactionQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export default function TransactionDetail() {
  const params = useParams();
  const id = params.id ? parseInt(params.id, 10) : 0;

  const { data: tx, isLoading } = useGetTransaction(id, {
    query: {
      enabled: !!id,
      queryKey: getGetTransactionQueryKey(id)
    }
  });

  if (isLoading) return <div>Loading transaction details...</div>;
  if (!tx) return <div>Transaction not found.</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-primary/20 text-primary border-primary/20 px-3 py-1"><CheckCircle2 className="w-4 h-4 mr-2" /> Verified</Badge>;
      case "failed":
        return <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/20 px-3 py-1"><XCircle className="w-4 h-4 mr-2" /> Failed</Badge>;
      default:
        return <Badge variant="secondary" className="bg-secondary/50 text-muted-foreground border-border/50 px-3 py-1"><Clock className="w-4 h-4 mr-2" /> Pending</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Transaction Details</h1>
          <p className="text-muted-foreground font-mono mt-1">{tx.cplid}</p>
        </div>
        {tx.status === 'verified' && (
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Download Receipt
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <CardTitle>Payment Information</CardTitle>
                {getStatusBadge(tx.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center py-6 bg-muted/10 rounded-lg border border-border/50">
                <span className="text-sm text-muted-foreground mb-2 uppercase tracking-wider font-mono">Amount Paid</span>
                <span className="text-5xl font-mono font-bold tracking-tight text-foreground">
                  {formatCurrency(tx.amount)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Customer Name</p>
                  <p className="font-medium text-lg">{tx.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Payment Date</p>
                  <p className="font-medium text-lg">{formatDate(tx.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reference Number</p>
                  <p className="font-mono bg-muted/50 px-2 py-1 rounded inline-block text-sm border border-border/50">
                    {tx.referenceNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">CPLID</p>
                  <p className="font-mono font-medium">{tx.cplid}</p>
                </div>
                {tx.description && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{tx.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Bank Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Bank Name</p>
                <p className="font-medium">{tx.bankName}</p>
              </div>
              <Separator className="bg-border/50" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Account Number</p>
                <p className="font-mono">{tx.customerAccountNumber}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Verification Audit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <p className="font-medium capitalize">{tx.status}</p>
              </div>
              {tx.verifiedAt && (
                <>
                  <Separator className="bg-border/50" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Verified At</p>
                    <p className="text-sm">{formatDate(tx.verifiedAt)}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
