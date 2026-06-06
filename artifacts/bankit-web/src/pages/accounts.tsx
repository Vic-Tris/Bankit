import { useState } from "react";
import { useListBankAccounts, getListBankAccountsQueryKey, useCreateBankAccount, useUpdateBankAccount, useDeleteBankAccount } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/format";
import { Landmark, Plus, Trash2, Power, PowerOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const accountSchema = z.object({
  label: z.string().min(2, "Label is required"),
  accountNumber: z.string().min(10, "Valid account number is required"),
  bankName: z.string().min(2, "Bank name is required"),
  currency: z.string().default("NGN"),
  balance: z.coerce.number().min(0, "Balance must be 0 or greater").optional(),
});

export default function Accounts() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useListBankAccounts({
    query: { queryKey: getListBankAccountsQueryKey() }
  });

  const createMutation = useCreateBankAccount();
  const updateMutation = useUpdateBankAccount();
  const deleteMutation = useDeleteBankAccount();

  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: { label: "", accountNumber: "", bankName: "", currency: "NGN", balance: undefined },
  });

  const onSubmit = async (values: z.infer<typeof accountSchema>) => {
    try {
      await createMutation.mutateAsync({ data: values });
      toast({ title: "Bank account linked successfully" });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListBankAccountsQueryKey() });
    } catch (error: any) {
      toast({ title: "Failed to link account", description: error.message, variant: "destructive" });
    }
  };

  const toggleStatus = async (id: number, isActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, data: { isActive } });
      toast({ title: `Account ${isActive ? 'enabled' : 'disabled'}` });
      queryClient.invalidateQueries({ queryKey: getListBankAccountsQueryKey() });
    } catch (error: any) {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this account? This cannot be undone.")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: "Account removed" });
      queryClient.invalidateQueries({ queryKey: getListBankAccountsQueryKey() });
    } catch (error: any) {
      toast({ title: "Failed to remove account", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connected Accounts</h1>
          <p className="text-muted-foreground mt-2">Manage bank accounts used for deposits and transfers.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Link Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Bank Account</DialogTitle>
              <DialogDescription>Add a new corporate bank account to the system.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Label</FormLabel>
                      <FormControl><Input placeholder="e.g. Main Operations" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Zenith Bank" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl><Input className="font-mono" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Balance (NGN) <span className="text-muted-foreground font-normal">— optional</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="font-mono"
                          {...field}
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Linking..." : "Link Account"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div>Loading accounts...</div>
      ) : accounts?.length === 0 ? (
        <Card className="bg-card border-dashed border-2 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Landmark className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-semibold">No Accounts Linked</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Link your first bank account to enable transfers and balance tracking.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts?.map(acc => (
            <Card key={acc.id} className={`bg-card overflow-hidden transition-all ${!acc.isActive ? 'opacity-60 grayscale-[0.5]' : ''}`}>
              <div className={`h-2 w-full ${acc.isActive ? 'bg-primary' : 'bg-muted'}`} />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{acc.label}</CardTitle>
                    <CardDescription className="font-medium mt-1">{acc.bankName}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={acc.isActive} 
                      onCheckedChange={(c) => toggleStatus(acc.id, c)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 p-4 rounded-md mb-4 border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Account Number</p>
                  <p className="font-mono text-lg tracking-widest">{acc.accountNumber}</p>
                </div>
                
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Balance</p>
                    <p className="font-mono text-2xl font-bold text-foreground">
                      {acc.balance !== undefined && acc.balance !== null ? formatCurrency(acc.balance) : "---"}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(acc.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
