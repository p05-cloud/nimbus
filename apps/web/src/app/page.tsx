import Link from 'next/link';
import Image from 'next/image';
import { Shield, Zap, BarChart3, TrendingDown, Globe, Cloud, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Nav */}
      <nav className="border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/images/acc-logo.png"
              alt="ACC — Applied Cloud Computing"
              width={80}
              height={38}
              className="h-8 w-auto"
              priority
            />
            <span className="text-sm font-semibold text-muted-foreground">|</span>
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-lg font-bold text-transparent">
              Nimbus
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/auth/signin"
              className="inline-flex h-9 items-center px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Built for BFSI enterprises
            </div>

            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Cloud costs,{' '}
              <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                under control
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Nimbus unifies cost visibility, optimization, and governance across
              AWS, Azure, GCP, and Kubernetes — in a single platform your finance
              and engineering teams will actually use.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
              >
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/signin"
                className="inline-flex h-12 items-center gap-2 rounded-lg border bg-background px-8 text-sm font-semibold shadow-sm transition-colors hover:bg-accent"
              >
                Sign In
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 border-t pt-8">
              <div>
                <div className="text-3xl font-bold">30%</div>
                <p className="mt-1 text-sm text-muted-foreground">Avg. cost reduction</p>
              </div>
              <div>
                <div className="text-3xl font-bold">4</div>
                <p className="mt-1 text-sm text-muted-foreground">Cloud providers</p>
              </div>
              <div>
                <div className="text-3xl font-bold">&lt;2s</div>
                <p className="mt-1 text-sm text-muted-foreground">Dashboard load time</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Everything you need for cloud financial operations
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built from the best of 10 open-source FinOps projects. Deployed anywhere.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Deploy anywhere */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Deploy anywhere</h2>
            <p className="mt-3 text-muted-foreground">
              One codebase. Any infrastructure. Your data stays in your environment.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {deployTargets.map((target) => (
              <div
                key={target.name}
                className="rounded-xl border bg-card p-5 text-center shadow-sm"
              >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Cloud className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-3 font-semibold">{target.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{target.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <Image src="/images/acc-logo.png" alt="ACC" width={60} height={28} className="h-6 w-auto" />
            <span className="text-sm font-semibold text-muted-foreground">|</span>
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-sm font-bold text-transparent">
              Nimbus
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Nimbus — Cloud FinOps Platform by ACC
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    title: 'Multi-Cloud Cost Explorer',
    description:
      'Drill into costs by provider, service, account, region, and tags. Normalized to FOCUS schema for vendor-neutral analysis.',
    icon: BarChart3,
  },
  {
    title: 'AI Recommendations',
    description:
      'Rightsizing, reserved instances, idle resources, storage optimization — automatically detected and prioritized by savings.',
    icon: Zap,
  },
  {
    title: 'Anomaly Detection',
    description:
      'ML-powered spending pattern analysis catches unexpected cost spikes before they hit your bill.',
    icon: TrendingDown,
  },
  {
    title: 'Budget Governance',
    description:
      'Set budgets per team, project, or environment. Get alerts at configurable thresholds before you overspend.',
    icon: Shield,
  },
  {
    title: 'Multi-Tenant Isolation',
    description:
      'Each client gets isolated data with row-level security, custom branding, and encrypted cloud credentials.',
    icon: Globe,
  },
  {
    title: 'BFSI Compliant',
    description:
      'Deploy on-prem or in your private cloud. AES-256 encryption, audit logging, and data residency controls.',
    icon: Cloud,
  },
];

const deployTargets = [
  { name: 'AWS', description: 'ECS, EKS, or EC2' },
  { name: 'Azure', description: 'AKS, App Service, VMs' },
  { name: 'GCP / OCI', description: 'GKE, Cloud Run, OKE' },
  { name: 'On-Premise', description: 'Docker or bare metal' },
];
