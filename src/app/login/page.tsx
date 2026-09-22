import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900">Sign in to Smarkets</h1>
      <LoginForm />
      <p className="mt-4 text-sm text-zinc-500">
        Don&apos;t have a Smarkets account?{" "}
        <a
          href="https://smarkets.com/members/signup/"
          className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          Create one
        </a>
      </p>
    </main>
  );
}
