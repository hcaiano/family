import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: LucideIcon;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  const ActionButton = () => {
    if (!action) return null;

    const buttonContent = (
      <>
        {action.icon && <action.icon className="mr-2 h-4 w-4" />}
        {action.label}
      </>
    );

    if (action.href) {
      return (
        <Button asChild className="mt-4">
          <Link href={action.href}>{buttonContent}</Link>
        </Button>
      );
    }

    return (
      <Button className="mt-4" onClick={action.onClick}>
        {buttonContent}
      </Button>
    );
  };

  return (
    <div className="rounded-lg border-2 border-dashed p-12 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
      <ActionButton />
    </div>
  );
}
