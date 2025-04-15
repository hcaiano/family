import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

type action = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "ghost" | "link";
};

interface ActionButtonProps {
  action: action;
}

function ActionButton({ action }: ActionButtonProps) {
  const buttonContent = (
    <>
      {action.icon && <action.icon className="mr-2 h-4 w-4" />}
      {action.label}
    </>
  );

  if (action.href) {
    return (
      <Button asChild variant={action.variant}>
        <Link href={action.href}>{buttonContent}</Link>
      </Button>
    );
  }

  return (
    <Button onClick={action.onClick} variant={action.variant}>
      {buttonContent}
    </Button>
  );
}

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: action[];
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold leading-none">{title}</h1>
        <p className="text-sm text-muted-foreground leading-none">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {actions &&
          actions.map((action) => (
            <ActionButton key={action.label} action={action} />
          ))}
      </div>
    </div>
  );
}
