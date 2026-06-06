import { useState } from "react";
import { useVerifyPayment } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { VerificationResult } from "@workspace/api-client-react";

export default function Verify() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const verifyMutation = useVerifyPayment();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    try {
      const res = await verifyMutation.mutateAsync({ data: { query: query.trim() } });
      setResult(res);
    } catch (error) {
      console.error("Verification failed", error);
    }
  };

  const getStatusBadge = (status?: string | null) => {
    if (status === "verified") return <Badge className="bg-primary/20 text-primary hover:bg-primary/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</Badge>;
    if (status === "failed") return <Badge variant="destructive" className="bg-destructive/20 text-destructive hover:bg-destructive/30"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
    return <Badge variant="secondary" className="bg-secondary text-secondary-foreground"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Verification</h1>
        <p className="text-muted-foreground mt-2">Search by CPLID, reference number, or customer details to verify payment status.</p>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border shadow-lg">
        <CardHeader>
          <CardTitle>Lookup Payment</CardTitle>
          <CardDescription>Enter exact details for accurate verification.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="query" className="sr-only">Search Query</Label>
              <Input
                id="query"
                placeholder="BKT-XXXXXXXX or Reference Number"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="font-mono text-lg py-6"
                autoComplete="off"
              />
            </div>
            <Button 
              type="submit" 
              size="lg" 
              className="py-6 px-8"
              disabled={verifyMutation.isPending || !query.trim()}
            >
              {verifyMutation.isPending ? "Searching..." : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Verify
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold mb-4">Verification Result</h2>
          
          {result.found ? (
            <Card className={`border-2 ${result.status === 'verified' ? 'border-primary/50 bg-primary/5' : result.status === 'failed' ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-card'}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{result.customerName}</h3>
                    <p className="font-mono text-muted-foreground">{result.cplid}</p>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border/50">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Amount</p>
                    <p className="text-2xl font-mono font-semibold">
                      {result.amount ? formatCurrency(result.amount) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Payment Date</p>
                    <p className="text-lg">
                      {result.paymentDate ? formatDate(result.paymentDate) : "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Reference Number</p>
                    <p className="font-mono bg-background/50 p-2 rounded border border-border inline-block">
                      {result.referenceNumber || "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-semibold">No Payment Found</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  We couldn't find any payment matching "{query}". Please check the details and try again.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
