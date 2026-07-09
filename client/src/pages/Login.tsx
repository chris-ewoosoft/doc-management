import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { toast } from "sonner";

export default function Login() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery();
  const { data: userCount } = trpc.system.userCount.useQuery(undefined, {
    retry: false,
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isBootstrap, setIsBootstrap] = useState(false);

  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/documents");
    },
    onError: (err) => toast.error(err.message),
  });

  const bootstrap = trpc.auth.bootstrap.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/documents");
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (userCount === 0) setIsBootstrap(true);
  }, [userCount]);

  useEffect(() => {
    if (!authLoading && user) navigate("/documents");
  }, [authLoading, user, navigate]);

  const oauthEnabled = Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBootstrap) {
      bootstrap.mutate({ name, email, password });
    } else {
      login.mutate({ email, password });
    }
  };

  const pending = login.isPending || bootstrap.isPending;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md editorial-card p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            Documents
          </h1>
          <p className="text-sm text-muted-foreground">
            {isBootstrap ? "Create the first administrator account" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isBootstrap && (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isBootstrap ? "At least 6 characters" : "Your password"}
              minLength={isBootstrap ? 6 : 1}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Please wait..." : isBootstrap ? "Create admin account" : "Sign in"}
          </Button>
        </form>

        {oauthEnabled && !isBootstrap && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={() => startLogin()}>
              Sign in with Manus
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
