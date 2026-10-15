import { useMemo } from "react";
import { useStore } from "./store";
import { salePaid, saleStatus, saleTotal } from "./format";
import type { Sale, SaleStatus, Customer } from "./types";

export interface SaleView extends Sale {
  total: number;
  paid: number;
  remaining: number;
  status: SaleStatus;
  customer?: Customer | undefined;
}

export function useSalesView(): SaleView[] {
  const sales = useStore((s) => s.sales);
  const payments = useStore((s) => s.payments);
  const customers = useStore((s) => s.customers);
  return useMemo(
    () =>
      [...sales]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((s) => {
          const total = saleTotal(s);
          const paid = salePaid(s.id, payments);
          return { ...s, total, paid, remaining: Math.max(0, total - paid), status: saleStatus(total, paid), customer: customers.find((c) => c.id === s.customerId) };
        }),
    [sales, payments, customers],
  );
}
