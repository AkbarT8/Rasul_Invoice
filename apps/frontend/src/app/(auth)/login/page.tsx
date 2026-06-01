import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-slate-200/70 to-transparent dark:from-slate-900/70" />
      <LoginForm />
    </main>
  );
}
