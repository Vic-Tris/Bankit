import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login({ email, password });
    } catch (error) {
      // Error handled by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold font-mono text-xl mb-4 shadow-lg shadow-primary/20">
          B
        </div>
        <h1 className="text-3xl font-bold tracking-tight">BANKIT</h1>
        <p className="text-muted-foreground mt-2 font-mono text-sm tracking-widest uppercase">Operations Terminal</p>
      </div>
      
      <Card className="w-full max-w-md shadow-2xl border-muted">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Secure Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the terminal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="operator@bankit.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="font-mono text-sm bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="font-mono text-sm bg-muted/50"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Authenticating..." : "Initialize Session"}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="mt-8 text-center text-xs text-muted-foreground font-mono">
        <p>SYSTEM SECURED • UNAUTHORIZED ACCESS PROHIBITED</p>
      </div>
    </div>
  );
}
