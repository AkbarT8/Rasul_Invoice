"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, remember);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass-card w-full max-w-md rounded-3xl p-8">
      <div className="mb-8">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <LockKeyhole size={20} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Access the private proforma, client, and export management workspace.
        </p>
      </div>

      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Email</label>
      <div className="relative mb-4">
        <Mail className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
        <Input className="pl-10" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </div>

      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Password</label>
      <Input
        className="mb-4"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      <label className="mb-6 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Remember this device
      </label>

      {error ? <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">{error}</div> : null}

      <Button className="w-full" type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Continue"}
      </Button>
    </form>
  );
}
