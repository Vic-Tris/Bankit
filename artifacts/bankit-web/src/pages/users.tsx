import { useState } from "react";
import { useListUsers, getListUsersQueryKey, useCreateUser, useUpdateUserRole, useDeleteUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Shield, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/format";
import type { UserInputRole } from "@workspace/api-client-react";

const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  role: z.enum(["admin", "account_officer", "sales_rep"] as const),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function Users() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
  });

  const createMutation = useCreateUser();
  const updateRoleMutation = useUpdateUserRole();
  const deleteMutation = useDeleteUser();

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "sales_rep",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof userSchema>) => {
    try {
      await createMutation.mutateAsync({ data: values });
      toast({ title: "User created successfully" });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (error: any) {
      toast({ title: "Failed to create user", description: error.message, variant: "destructive" });
    }
  };

  const handleRoleChange = async (id: number, role: UserInputRole) => {
    try {
      await updateRoleMutation.mutateAsync({ id, data: { role } });
      toast({ title: "Role updated" });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (error: any) {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: "User deleted" });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (error: any) {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/20 hover:bg-destructive/30"><Shield className="w-3 h-3 mr-1" /> Admin</Badge>;
      case "account_officer":
        return <Badge className="bg-primary/20 text-primary border-primary/20 hover:bg-primary/30">Officer</Badge>;
      default:
        return <Badge variant="secondary" className="bg-secondary text-secondary-foreground"><UserIcon className="w-3 h-3 mr-1" /> Sales</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Users</h1>
          <p className="text-muted-foreground mt-2">Manage access and roles for all operators.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Operator Account</DialogTitle>
              <DialogDescription>Add a new user to the system.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sales_rep">Sales Representative</SelectItem>
                          <SelectItem value="account_officer">Account Officer</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temporary Password</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Account"}
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
                <TableHead className="font-mono text-xs uppercase tracking-wider">User</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Role</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Last Login</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">Loading users...</TableCell>
                </TableRow>
              ) : users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No users found.</TableCell>
                </TableRow>
              ) : (
                users?.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-sm text-muted-foreground font-mono">{u.email}</div>
                    </TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge variant="outline" className="text-primary border-primary/50">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground border-muted">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.lastLogin ? formatDate(u.lastLogin) : "Never"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleRoleChange(u.id, "admin")}>Make Admin</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(u.id, "account_officer")}>Make Officer</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(u.id, "sales_rep")}>Make Sales</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:bg-destructive/10"
                            onClick={() => handleDelete(u.id)}
                          >
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
