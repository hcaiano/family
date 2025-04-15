interface PageLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageLayout({
  title,
  subtitle,
  children,
  actions,
}: PageLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {actions && <div className="flex justify-end">{actions}</div>}
      </div>

      {children}
    </div>
  );
}
