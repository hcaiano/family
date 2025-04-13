import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: LucideIcon;
  };
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
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
        <Button asChild>
          <Link href={action.href}>{buttonContent}</Link>
        </Button>
      );
    }

    return <Button onClick={action.onClick}>{buttonContent}</Button>;
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <ActionButton />
    </div>
  );
}
