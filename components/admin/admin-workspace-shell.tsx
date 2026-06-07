import Link from "next/link";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  FiBarChart2,
  FiGift,
  FiGrid,
  FiPackage,
  FiShoppingBag,
  FiTag,
  FiTruck,
  FiUsers,
} from "react-icons/fi";

type AdminModuleKey =
  | "products"
  | "categories"
  | "orders"
  | "users"
  | "wholesale"
  | "reports"
  | "promotions"
  | "currency";

type AdminModule = {
  icon: IconType;
  key: AdminModuleKey;
  label: string;
  href?: string;
};

type AdminWorkspaceShellProps = {
  activeModule: AdminModuleKey;
  children: ReactNode;
  stats?: Array<{
    label: string;
    value: string | number;
  }>;
};

const adminModules: AdminModule[] = [
  { icon: FiPackage, key: "products", label: "Products", href: "/admin" },
  {
    icon: FiGrid,
    key: "categories",
    label: "Categories",
    href: "/admin/categories",
  },
  { icon: FiShoppingBag, key: "orders", label: "Orders" },
  { icon: FiUsers, key: "users", label: "Users" },
  { icon: FiTruck, key: "wholesale", label: "Wholesale" },
  { icon: FiBarChart2, key: "reports", label: "Reports" },
  { icon: FiGift, key: "promotions", label: "Promotions" },
  { icon: FiTag, key: "currency", label: "Currency Rates" },
];

export function AdminWorkspaceShell({
  activeModule,
  children,
  stats = [],
}: AdminWorkspaceShellProps) {
  return (
    <div className="admin-page-shell">
      <section className="admin-page-header">
        <div className="admin-page-header-copy">
          <p className="section-eyebrow">Catalog Operations</p>
          <h1>Admin Workspace</h1>
        </div>
        {stats.length > 0 ? (
          <div className="admin-page-header-meta">
            {stats.map((stat) => (
              <article className="admin-page-stat" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <div className="admin-page-layout">
        <aside className="admin-side-rail">
          <section className="panel admin-rail-panel">
            <div aria-label="Admin modules" className="admin-module-list" role="list">
              {adminModules.map(({ href, icon: Icon, key, label }) => {
                const className =
                  key === activeModule
                    ? "admin-module-card admin-module-card-active"
                    : "admin-module-card";
                const content = (
                  <>
                    <span className="admin-module-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="admin-module-copy">
                      <strong>{label}</strong>
                    </span>
                  </>
                );

                return href ? (
                  <Link
                    aria-current={key === activeModule ? "page" : undefined}
                    aria-label={label}
                    className={className}
                    href={href}
                    key={key}
                    role="listitem"
                    title={label}
                  >
                    {content}
                  </Link>
                ) : (
                  <article
                    aria-label={label}
                    className={className}
                    key={key}
                    role="listitem"
                    title={label}
                  >
                    {content}
                  </article>
                );
              })}
            </div>
          </section>
        </aside>

        <section className="panel admin-workspace-panel">{children}</section>
      </div>
    </div>
  );
}
