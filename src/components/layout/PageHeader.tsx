import { AppLink } from "@/components/ui/AppLink";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  back?: { href: string; label: string };
  actions?: ReactNode;
};

export function PageHeader({ title, description, back, actions }: PageHeaderProps) {
  return (
    <>
      {back && (
        <AppLink className="back-link" href={back.href}>
          ← {back.label}
        </AppLink>
      )}
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="header-actions">{actions}</div>}
      </div>
    </>
  );
}
