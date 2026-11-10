import { MouseEvent } from "react";
import { notification, Popconfirm } from "antd";
import { useMutation, useQueryClient } from "react-query";
import { AvitcenaAdmin, CashOrCard } from "../queries/query";
import { apiErrorMessage } from "../utils/apiError";

const METHODS: { value: CashOrCard; label: string }[] = [
  { value: "cash", label: "Naqd" },
  { value: "card", label: "Karta" },
];

// Qabul to'lovi holati; to'lanmagan bo'lsa naqd yoki karta bilan qabul qilish tugmalari
export default function VisitPayment({
  patientId,
  visitId,
  amount,
  paymentMethodDisplay,
  canPay,
  disabled,
}: {
  patientId: string;
  visitId: string;
  amount: number;
  paymentMethodDisplay?: string | null;
  canPay: boolean;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [api, contextHolder] = notification.useNotification();

  const { mutate, isLoading } = useMutation(
    (method: CashOrCard) => AvitcenaAdmin.payVisit(patientId, visitId, method),
    {
      onSuccess: () => {
        api.success({ message: "To'lov qabul qilindi" });
        queryClient.invalidateQueries(["todayVisits"]);
        queryClient.invalidateQueries(["patientVisitesData"]);
        queryClient.invalidateQueries(["patient", patientId]);
        queryClient.invalidateQueries(["finance"]);
        queryClient.invalidateQueries(["allStat"]);
        queryClient.invalidateQueries(["tringleData"]);
      },
      onError: (error) =>
        api.error({
          message: "To'lovni saqlab bo'lmadi",
          description: apiErrorMessage(error, "Qaytadan urinib ko'ring"),
        }),
    }
  );

  const stop = (e?: MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
  };

  if (paymentMethodDisplay) {
    return (
      <span className="px-2.5 py-1 rounded-[8px] text-[11px] font-[600] bg-[#E9FBF4] text-[#0D9488] whitespace-nowrap">
        To'langan ({paymentMethodDisplay})
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5" onClick={stop}>
      {contextHolder}
      <span className="px-2.5 py-1 rounded-[8px] text-[11px] font-[600] bg-[#FFF7E6] text-[#D48806] whitespace-nowrap">
        To'lanmagan
      </span>
      {canPay &&
        !disabled &&
        METHODS.map((method) => (
          <Popconfirm
            key={method.value}
            title="To'lovni qabul qilish"
            description={`${amount.toLocaleString("uz-UZ")} so'm ${method.label.toLowerCase()} qabul qilindimi?`}
            okText="Ha"
            cancelText="Yo'q"
            onConfirm={(e) => {
              stop(e as MouseEvent | undefined);
              mutate(method.value);
            }}
            onCancel={(e) => stop(e as MouseEvent | undefined)}
          >
            <button
              type="button"
              disabled={isLoading}
              onClick={stop}
              aria-label={`${method.label} qabul qilish`}
              className="px-2.5 py-1 rounded-[8px] text-[11px] font-[600] border border-[#0D9488] text-[#0D9488] bg-white cursor-pointer disabled:opacity-50"
            >
              {method.label}
            </button>
          </Popconfirm>
        ))}
    </span>
  );
}
