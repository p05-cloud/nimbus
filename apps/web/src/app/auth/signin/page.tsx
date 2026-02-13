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
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-500">
              <span className="text-lg font-bold text-white">N</span>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Nimbus
              </span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
          </div>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
