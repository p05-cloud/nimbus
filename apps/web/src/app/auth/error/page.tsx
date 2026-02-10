import Link from 'next/link';

export const metadata = { title: 'Auth Error' };

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorMessages: Record<string, string> = {
    Configuration: 'Server configuration error. Please contact support.',
    AccessDenied: 'Access denied. You do not have permission.',
    Verification: 'Verification link expired. Please try again.',
    Default: 'An authentication error occurred.',
  };

  const message = errorMessages[searchParams.error || ''] || errorMessages.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 text-center shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-destructive">Auth Error</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          {searchParams.error && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Code: {searchParams.error}
            </p>
          )}
        </div>
        <Link
          href="/auth/signin"
          className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
