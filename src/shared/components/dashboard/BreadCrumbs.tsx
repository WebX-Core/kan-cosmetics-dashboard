import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);
  const searchParams = new URLSearchParams(location.search);
  const productId = searchParams.get("productId")?.trim();
  const productName = searchParams.get("productName")?.trim();
  const isProductTagRoute = location.pathname.startsWith("/dashboard/product-tags");
  const isProductAttributeRoute = location.pathname.startsWith("/dashboard/product-attributes");
  const productSectionPath = isProductTagRoute
    ? "/dashboard/product-tags"
    : "/dashboard/product-attributes";
  const productSectionLabel = isProductTagRoute ? "Tags" : "Attributes";
  const productRouteAction = location.pathname.endsWith("/create")
    ? "Create"
    : location.pathname.endsWith("/edit")
      ? "Edit"
      : "";
  const isIdLike = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) || /^[0-9a-f]{24}$/i.test(value);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs font-semibold uppercase tracking-[0.08em]">
      <ol className="flex items-center gap-1.5 text-[var(--muted)]">
        <li>
          <Link to="/dashboard" className="flex items-center p-1 transition-colors hover:text-[var(--primary)]">
            <Home size={14} strokeWidth={2} />
          </Link>
        </li>

        {(isProductTagRoute || isProductAttributeRoute) ? (
          <>
            <li className="flex items-center">
              <ChevronRight size={13} className="mx-0.5 shrink-0 text-[var(--muted)]/70" />
              <Link to="/dashboard/products" className="transition-colors hover:text-[var(--primary)]">
                Products
              </Link>
            </li>
            {productName ? (
              <li className="flex min-w-0 items-center">
                <ChevronRight size={13} className="mx-0.5 shrink-0 text-[var(--muted)]/70" />
                {productId ? (
                  <Link to={`/dashboard/products/${productId}`} className="max-w-36 truncate transition-colors hover:text-[var(--primary)]">
                    {productName}
                  </Link>
                ) : (
                  <span className="max-w-36 truncate">{productName}</span>
                )}
              </li>
            ) : null}
            <li className="flex items-center">
              <ChevronRight size={13} className="mx-0.5 shrink-0 text-[var(--muted)]/70" />
              {productRouteAction ? (
                <Link to={`${productSectionPath}${location.search}`} className="transition-colors hover:text-[var(--primary)]">
                  {productSectionLabel}
                </Link>
              ) : (
                <span className="font-bold text-[var(--text)]">{productSectionLabel}</span>
              )}
            </li>
            {productRouteAction ? (
              <li className="flex items-center">
                <ChevronRight size={13} className="mx-0.5 shrink-0 text-[var(--muted)]/70" />
                <span className="font-bold text-[var(--text)]">{productRouteAction}</span>
              </li>
            ) : null}
          </>
        ) : pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const next = pathnames[index + 1];
          const isUnsafeRecordParent = !last && next === "edit";
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const label = isIdLike(value)
            ? "Details"
            : value
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");

          return (
            <li key={to} className="flex items-center">
              <ChevronRight size={13} className="mx-0.5 shrink-0 text-[var(--muted)]/70" />
              {last || isUnsafeRecordParent ? (
                <span className="max-w-36 truncate font-bold text-[var(--text)] md:max-w-none">{label}</span>
              ) : (
                <Link to={to} className="transition-colors hover:text-[var(--primary)]">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
