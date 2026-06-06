import { useState } from "react";
import { useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Plus, Search, MoreHorizontal, Phone, Mail, MapPin, User, FileText, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/format";

const customerSchema = z.object({
  name: z.string().min(2, "Company name is required"),
  rcNumber: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

function CustomerForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel,
}: {
  defaultValues?: Partial<CustomerFormValues>;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  isPending: boolean;
  submitLabel: string;
}) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      rcNumber: "",
      email: "",
      phone: "",
      address: "",
      contactPerson: "",
      notes: "",
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Company Name <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input placeholder="e.g. Apex Logistics Ltd" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="rcNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>RC Number</FormLabel>
              <FormControl><Input placeholder="e.g. RC-1234567" className="font-mono" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="contactPerson" render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Person</FormLabel>
              <FormControl><Input placeholder="Primary contact name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input type="email" placeholder="billing@company.ng" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl><Input placeholder="080XXXXXXXX" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Address</FormLabel>
              <FormControl><Input placeholder="Street, City, State" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Notes <span className="text-muted-foreground font-normal">— optional</span></FormLabel>
              <FormControl><Textarea rows={3} placeholder="Payment terms, special instructions..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const canEdit = user?.role === "admin" || user?.role === "account_officer";

  const { data: customers, isLoading } = useListCustomers(
    { search: search || undefined },
    { query: { queryKey: [...getListCustomersQueryKey(), search] } }
  );

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });

  const handleCreate = async (values: CustomerFormValues) => {
    const data = {
      ...values,
      email: values.email || undefined,
      rcNumber: values.rcNumber || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      contactPerson: values.contactPerson || undefined,
      notes: values.notes || undefined,
    };
    await createMutation.mutateAsync({ data });
    toast({ title: "Customer created" });
    setIsCreateOpen(false);
    invalidate();
  };

  const handleUpdate = async (values: CustomerFormValues) => {
    if (!editingCustomer) return;
    const data = {
      ...values,
      email: values.email || undefined,
    };
    await updateMutation.mutateAsync({ id: editingCustomer.id, data });
    toast({ title: "Customer updated" });
    setEditingCustomer(null);
    invalidate();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? Their transactions will be unlinked but preserved.`)) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: "Customer deleted" });
      invalidate();
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage client company profiles and link their transactions.</p>
        </div>
        {canEdit && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Register New Customer</DialogTitle>
                <DialogDescription>Add a new client company to the system.</DialogDescription>
              </DialogHeader>
              <CustomerForm
                onSubmit={handleCreate}
                isPending={createMutation.isPending}
                submitLabel="Create Customer"
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, RC number, email or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 max-w-md"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <Card key={i} className="bg-card animate-pulse">
              <CardHeader><div className="h-5 bg-muted rounded w-2/3" /></CardHeader>
              <CardContent><div className="h-4 bg-muted rounded w-1/2 mt-2" /></CardContent>
            </Card>
          ))}
        </div>
      ) : customers?.length === 0 ? (
        <Card className="bg-card border-dashed border-2 bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-semibold">
              {search ? "No customers match your search" : "No customers yet"}
            </h3>
            <p className="text-muted-foreground mt-2 max-w-sm text-sm">
              {search
                ? "Try a different name, RC number, or contact detail."
                : "Register your first client company to start linking their payments."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers?.map(c => (
            <Card key={c.id} className="bg-card hover:border-primary/30 transition-colors group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base leading-tight truncate">{c.name}</CardTitle>
                    {c.rcNumber && (
                      <Badge variant="outline" className="mt-1 font-mono text-xs">{c.rcNumber}</Badge>
                    )}
                  </div>
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setLocation(`/customers/${c.id}`)}>
                          <ExternalLink className="w-3.5 h-3.5 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingCustomer(c)}>
                          Edit Profile
                        </DropdownMenuItem>
                        {user?.role === "admin" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10"
                              onClick={() => handleDelete(c.id, c.name)}
                            >
                              Delete Customer
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {c.contactPerson && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.contactPerson}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono">{c.phone}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.address}</span>
                  </div>
                )}
                {c.notes && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground border-t border-border/50 pt-2 mt-2">
                    <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{c.notes}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs text-muted-foreground h-7 px-1"
                    onClick={() => setLocation(`/customers/${c.id}`)}
                  >
                    <ExternalLink className="w-3 h-3 mr-1.5" />
                    View transactions · Added {formatDate(c.createdAt)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editingCustomer && (
        <Dialog open={!!editingCustomer} onOpenChange={(open) => { if (!open) setEditingCustomer(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
              <DialogDescription>Update {editingCustomer.name}'s profile.</DialogDescription>
            </DialogHeader>
            <CustomerForm
              defaultValues={{
                name: editingCustomer.name,
                rcNumber: editingCustomer.rcNumber ?? "",
                email: editingCustomer.email ?? "",
                phone: editingCustomer.phone ?? "",
                address: editingCustomer.address ?? "",
                contactPerson: editingCustomer.contactPerson ?? "",
                notes: editingCustomer.notes ?? "",
              }}
              onSubmit={handleUpdate}
              isPending={updateMutation.isPending}
              submitLabel="Save Changes"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
