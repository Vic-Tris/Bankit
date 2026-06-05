import { useState } from "react";
import { 
  useListTransfers, 
  getListTransfersQueryKey,
  useInitiateTransfer,
  useApproveTransfer,
  useRejectTransfer,
  useListBeneficiaries,
  getListBeneficiariesQueryKey,
  useListBankAccounts,
  getListBankAccountsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowUpRight, Check, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const transferSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  beneficiaryId: z.coerce.number().min(1, "Please select a beneficiary"),
  fromAccountId: z.coerce.number().min(1, "Please select a funding account"),
  narration: z.string().optional(),
});

export default function Transfers() {
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transfersData, isLoading } = useListTransfers(
    { page, limit: 10 },
    { query: { queryKey: getListTransfersQueryKey({ page, limit: 10 }) } }
  );

  const { data: beneficiaries } = useListBeneficiaries({
    query: { queryKey: getListBeneficiariesQueryKey() }
  });

  const { data: bankAccounts } = useListBankAccounts({
    query: { queryKey: getListBankAccountsQueryKey() }
  });

  const initiateMutation = useInitiateTransfer();
  const approveMutation = useApproveTransfer();
  const rejectMutation = useRejectTransfer();

  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      amount: 0,
      beneficiaryId: 0,
      fromAccountId: 0,
      narration: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof transferSchema>) => {
    try {
      await initiateMutation.mutateAsync({ data: values });
      toast({ title: "Transfer initiated successfully" });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListTransfersQueryKey({ page, limit: 10 }) });
    } catch (error: any) {
      toast({ 
        title: "Failed to initiate transfer", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await approveMutation.mutateAsync({ id });
      } else {
        await rejectMutation.mutateAsync({ id });
      }
      toast({ title: `Transfer ${action}d successfully` });
      queryClient.invalidateQueries({ queryKey: getListTransfersQueryKey({ page, limit: 10 }) });
    } catch (error: any) {
      toast({ 
        title: `Failed to ${action} transfer`, 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-primary/20 text-primary border-primary/20">Approved</Badge>;
      case "rejected":
      case "failed":
        return <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/20">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="bg-secondary/50 text-muted-foreground border-border/50">Pending Approval</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transfers</h1>
          <p className="text-muted-foreground mt-2">Manage outbound payments and beneficiary accounts.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Initiate Transfer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Initiate Transfer</DialogTitle>
              <DialogDescription>
                Create a new transfer request. Requires approval to process.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fromAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funding Account</FormLabel>
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bankAccounts?.filter(a => a.isActive).map(account => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.label} - {account.accountNumber} ({formatCurrency(account.balance || 0)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="beneficiaryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beneficiary</FormLabel>
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select beneficiary" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {beneficiaries?.map(ben => (
                            <SelectItem key={ben.id} value={ben.id.toString()}>
                              {ben.name} - {ben.bankName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₦)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" {...field} className="font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="narration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Narration (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Payment description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={initiateMutation.isPending}>
                    {initiateMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Date</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Beneficiary</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Description</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-right">Amount</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">Loading transfers...</TableCell>
                </TableRow>
              ) : transfersData?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No transfers found.
                  </TableCell>
                </TableRow>
              ) : (
                transfersData?.data.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(transfer.createdAt)}</TableCell>
                    <TableCell className="font-medium">{transfer.beneficiaryName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {transfer.narration || "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(transfer.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                    <TableCell className="text-right">
                      {transfer.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-8 w-8 text-primary border-primary/20 hover:bg-primary/10"
                            onClick={() => handleAction(transfer.id, 'approve')}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive/10"
                            onClick={() => handleAction(transfer.id, 'reject')}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
