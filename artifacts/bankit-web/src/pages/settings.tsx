import { useState } from "react";
import { useChangePassword } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const passwordMutation = useChangePassword();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    try {
      await passwordMutation.mutateAsync({ 
        data: { currentPassword, newPassword } 
      });
      toast({ title: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account and preferences.</p>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Your current terminal identity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Full Name</Label>
            <p className="text-lg font-medium">{user?.name}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Email Address</Label>
            <p className="font-mono text-sm mt-1">{user?.email}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">System Role</Label>
            <p className="uppercase mt-1 font-semibold">{user?.role.replace('_', ' ')}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Update your terminal access credentials.</CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordChange}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Current Password</Label>
              <Input 
                id="current" 
                type="password" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required 
                className="font-mono bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">New Password</Label>
              <Input 
                id="new" 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required 
                className="font-mono bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm New Password</Label>
              <Input 
                id="confirm" 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
                className="font-mono bg-muted/50"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
