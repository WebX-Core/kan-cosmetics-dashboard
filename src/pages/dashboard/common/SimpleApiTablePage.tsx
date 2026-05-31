import React from "react";

type Row = Readonly<Record<string, unknown>>;

type Props = Readonly<{
  title: string;
  description: string;
  rows: ReadonlyArray<Row>;
  isLoading?: boolean;
  errorMessage?: string | null;
}>;

const toText = (value: unknown): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

export const SimpleApiTablePage: React.FC<Props> = ({ title, description, rows, isLoading, errorMessage }) => {
  const columns = React.useMemo(
    () => Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, 8),
    [rows],
  );

  if (isLoading) return <div>Loading...</div>;
  if (errorMessage) return <div>{errorMessage}</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-3 py-2 text-left text-xs uppercase text-slate-500">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sm text-slate-500" colSpan={Math.max(columns.length, 1)}>
                  No records.
                </td>
              </tr>
            ) : null}
            {rows.map((row, index) => (
              <tr key={String(row.id ?? index)} className="border-t">
                {columns.map((column) => (
                  <td key={column} className="px-3 py-2 text-sm">
                    {toText(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

