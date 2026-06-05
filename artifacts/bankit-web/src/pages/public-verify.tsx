import { useParams } from "wouter";
import { usePublicVerifyCplid, getPublicVerifyCplidQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export default function PublicVerify() {
  const params = useParams();
  const cplid = params.cplid || "";

  const { data: result, isLoading, error } = usePublicVerifyCplid(cplid, {
    query: {
      enabled: !!cplid,
      queryKey: getPublicVerifyCplidQueryKey(cplid),
      retry: false
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-primary/20 text-primary border-primary/20 text-lg py-2 px-4"><CheckCircle2 className="w-5 h-5 mr-2" /> Verified</Badge>;
      case "failed":
        return <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/20 text-lg py-2 px-4"><XCircle className="w-5 h-5 mr-2" /> Failed</Badge>;
      default:
        return <Badge variant="secondary" className="bg-secondary/50 text-muted-foreground border-border/50 text-lg py-2 px-4"><Clock className="w-5 h-5 mr-2" /> Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <ShieldCheck className="w-12 h-12 text-primary opacity-50 mb-4" />
          <p className="font-mono">VERIFYING RECORD...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <XCircle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Record Not Found</h1>
            <p className="text-muted-foreground font-mono mb-6">{cplid}</p>
            <p className="text-sm">This payment reference does not exist in our system or is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold font-mono text-3xl mx-auto mb-4">
            B
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase tracking-widest">{result.companyName}</h1>
          <p className="text-muted-foreground text-sm font-mono mt-1">SECURE VERIFICATION PORTAL</p>
        </div>

        <Card className={`border-2 shadow-2xl ${result.status === 'verified' ? 'border-primary/50' : 'border-border'}`}>
          <CardHeader className="text-center pb-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Status</p>
            <div className="flex justify-center">{getStatusBadge(result.status)}</div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="text-center py-6 bg-muted/20 rounded-lg border border-border/50">
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Amount</p>
              <p className="text-4xl font-mono font-bold">{formatCurrency(result.amount)}</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground text-sm">Customer Name</span>
                <span className="font-medium text-right">{result.customerName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground text-sm">Payment Date</span>
                <span className="font-medium text-right">{formatDate(result.paymentDate)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground text-sm">CPLID Reference</span>
                <span className="font-mono text-sm">{result.cplid || cplid}</span>
              </div>
            </div>

            <div className="pt-6 flex justify-center text-primary">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              This digital record is verifiable and secured by Bankit.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
