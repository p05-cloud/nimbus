import { SignInForm } from './SignInForm';
import { ThemeToggle } from '@/components/ThemeToggle';

export const metadata = { title: 'Sign In' };

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Nimbus
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
