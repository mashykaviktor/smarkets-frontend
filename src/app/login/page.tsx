import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900">Sign in to Smarkets</h1>
      <LoginForm />
    </main>
  );
}
