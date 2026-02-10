export const metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your tenant configuration, users, and preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Organization */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold">Organization</h3>
          <p className="text-sm text-muted-foreground">Manage your tenant details</p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Organization Name</label>
              <input
                type="text"
                defaultValue="Acme Corp"
                className="mt-1 flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Primary Contact</label>
              <input
                type="email"
                defaultValue="admin@acme.com"
                className="mt-1 flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold">Appearance</h3>
          <p className="text-sm text-muted-foreground">Customize the dashboard look</p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Primary Color</label>
              <div className="mt-1 flex items-center gap-2">
                {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'].map((color) => (
                  <button
                    key={color}
                    className="h-8 w-8 rounded-full border-2 border-transparent transition-all hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Default Currency</label>
              <select defaultValue="INR" className="mt-1 flex h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                <option value="INR">INR (&#8377;)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (&euro;)</option>
                <option value="GBP">GBP (&pound;)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-sm text-muted-foreground">Configure alerts and notifications</p>
          <div className="mt-4 space-y-3">
            {[
              'Budget threshold alerts',
              'Cost anomaly detection',
              'New recommendations',
              'Weekly cost digest',
            ].map((item) => (
              <label key={item} className="flex items-center justify-between">
                <span className="text-sm">{item}</span>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded" />
              </label>
            ))}
          </div>
        </div>

        {/* API Access */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold">API Access</h3>
          <p className="text-sm text-muted-foreground">Manage API keys for programmatic access</p>
          <div className="mt-4">
            <div className="rounded-md bg-muted p-3">
              <p className="font-mono text-xs text-muted-foreground">
                nmbs_prod_xxxxxxxxxxxx
              </p>
            </div>
            <button className="mt-3 inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent">
              Regenerate Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
