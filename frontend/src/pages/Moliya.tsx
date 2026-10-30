import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Link } from "react-router-dom";
import {
  DatePicker,
  Select,
  Input,
  Pagination,
  Modal,
  Form,
  InputNumber,
  notification,
  Spin,
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  FiDownload,
  FiArrowUpRight,
  FiArrowDownRight,
  FiX,
  FiSearch,
} from "react-icons/fi";
import { LuLayers } from "react-icons/lu";
import {
  OneMedAdmin,
  FinanceFilters,
  FinanceTransaction,
} from "../queries/query";
import "../App.css";

const { RangePicker } = DatePicker;

const PAYMENT_METHODS = [
  { value: "cash", label: "Naqd" },
  { value: "card", label: "Karta" },
  { value: "click_payme", label: "Click/Payme" },
  { value: "transfer", label: "O'tkazma" },
];

const EXPENSE_CATEGORIES = [
  { value: "medicine", label: "Dori va materiallar" },
  { value: "equipment", label: "Jihozlar ta'miri" },
  { value: "rent", label: "Ijara" },
  { value: "salary", label: "Ish haqi" },
  { value: "other", label: "Boshqa" },
];

const STATUS_OPTIONS = [
  { value: "completed", label: "Bajarildi" },
  { value: "pending", label: "Kutilmoqda" },
  { value: "in_progress", label: "Jarayonda" },
  { value: "cancelled", label: "Bekor qilindi" },
];

const STATUS_BADGE_CLASS: Record<string, string> = {
  completed: "bg-[#E9FBF4] text-[#0D9488]",
  pending: "bg-[#FFF7E6] text-[#D48806]",
  in_progress: "bg-[#E6F4FF] text-[#1677FF]",
  cancelled: "bg-[#F5F5F5] text-[#8F99A3]",
};

const PERIOD_PRESETS: { key: string; label: string }[] = [
  { key: "today", label: "Bugun" },
  { key: "week", label: "Hafta" },
  { key: "month", label: "Oy" },
  { key: "year", label: "Yil" },
];

function money(n: number | undefined | null) {
  return `${Math.round(n || 0).toLocaleString("uz-UZ")} so'm`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function changeBadge(change?: { percentage: number | null; amount: number | null }) {
  if (!change) return null;

  if (change.percentage !== null) {
    const positive = change.percentage >= 0;
    return {
      positive,
      text: `${positive ? "↑" : "↓"} ${Math.abs(change.percentage)}%`,
    };
  }

  return { positive: true, text: "Yangi" };
}

export default function Moliya() {
  const queryClient = useQueryClient();
  const [notifApi, contextHolder] = notification.useNotification();

  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [activePreset, setActivePreset] = useState<string>("month");
  const [type, setType] = useState<"" | "kirim" | "chiqim">("");
  const [doctorIds, setDoctorIds] = useState<string[]>([]);
  const [serviceId, setServiceId] = useState<string | undefined>();
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [category, setCategory] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [cashierIds, setCashierIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm] = Form.useForm();

  const filters: FinanceFilters = useMemo(
    () => ({
      date_from: range[0].format("YYYY-MM-DD"),
      date_to: range[1].format("YYYY-MM-DD"),
      type: type || undefined,
      doctor: doctorIds.join(",") || undefined,
      service: serviceId || undefined,
      payment_method: paymentMethods.join(",") || undefined,
      category,
      status,
      cashier: cashierIds.join(",") || undefined,
      search: search || undefined,
    }),
    [
      range,
      type,
      doctorIds,
      serviceId,
      paymentMethods,
      category,
      status,
      cashierIds,
      search,
    ]
  );

  const { data: summaryData } = useQuery({
    queryKey: ["financeSummary", filters],
    queryFn: () => OneMedAdmin.financeSummary(filters),
    keepPreviousData: true,
  });

  const { data: txData, isLoading: isTxLoading } = useQuery({
    queryKey: ["financeTransactions", filters, page, perPage],
    queryFn: () =>
      OneMedAdmin.financeTransactions({ ...filters, page, per_page: perPage }),
    keepPreviousData: true,
  });

  const { data: employeesData } = useQuery({
    queryKey: ["financeEmployees"],
    queryFn: () => OneMedAdmin.getEmployeesFilter(1, 100),
    staleTime: 5 * 60 * 1000,
  });

  const { data: servicesData } = useQuery({
    queryKey: ["financeServices"],
    queryFn: () => OneMedAdmin.getServices(1, 100),
    staleTime: 5 * 60 * 1000,
  });

  const employees = employeesData?.data || [];
  const doctors = employees.filter((e: any) => e.role === "doctor");
  const cashiers = employees.filter((e: any) =>
    ["admin", "registrator"].includes(e.role)
  );

  const serviceCategories = servicesData?.data || [];
  const allServices = serviceCategories.flatMap((c: any) =>
    (c.services || []).map((s: any) => ({ id: s.id, name: s.name }))
  );

  const summary = summaryData?.data;
  const transactions: FinanceTransaction[] = txData?.data?.results || [];
  const meta = txData?.data?.meta;

  const createExpenseMutation = useMutation({
    mutationFn: OneMedAdmin.createExpense,
    onSuccess: () => {
      notifApi.success({ message: "Chiqim qo'shildi" });
      setIsExpenseModalOpen(false);
      expenseForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["financeSummary"] });
      queryClient.invalidateQueries({ queryKey: ["financeTransactions"] });
    },
    onError: () => {
      notifApi.error({
        message: "Xatolik",
        description: "Chiqimni saqlab bo'lmadi, qayta urinib ko'ring",
      });
    },
  });

  const handlePreset = (key: string) => {
    setActivePreset(key);
    setPage(1);
    const now = dayjs();

    if (key === "today") setRange([now.startOf("day"), now.endOf("day")]);
    if (key === "week") setRange([now.startOf("week"), now.endOf("week")]);
    if (key === "month") setRange([now.startOf("month"), now.endOf("month")]);
    if (key === "year") setRange([now.startOf("year"), now.endOf("year")]);
  };

  const exportMutation = useMutation({
    mutationFn: () => OneMedAdmin.financeExport(filters),
    onError: () => {
      notifApi.error({
        message: "Xatolik",
        description: "Eksport qilib bo'lmadi",
      });
    },
  });

  const clearAllFilters = () => {
    setDoctorIds([]);
    setServiceId(undefined);
    setPaymentMethods([]);
    setCategory(undefined);
    setStatus(undefined);
    setCashierIds([]);
    setSearch("");
    setSearchInput("");
    setType("");
    setPage(1);
  };

  const categoryLabel = (() => {
    if (!category) return null;
    const svcCategory = serviceCategories.find((c: any) => c.id === category);
    if (svcCategory) return svcCategory.name;
    const expCategory = EXPENSE_CATEGORIES.find((c) => c.value === category);
    return expCategory?.label || category;
  })();

  const chips: { key: string; label: string; onClear: () => void }[] = [];

  if (type) {
    chips.push({
      key: "type",
      label: type === "kirim" ? "Turi: Kirim" : "Turi: Chiqim",
      onClear: () => setType(""),
    });
  }
  if (doctorIds.length) {
    chips.push({
      key: "doctor",
      label: `Shifokor: ${doctorIds.length} ta tanlandi`,
      onClear: () => setDoctorIds([]),
    });
  }
  if (serviceId) {
    const svc = allServices.find((s: any) => s.id === serviceId);
    chips.push({
      key: "service",
      label: `Xizmat: ${svc?.name || ""}`,
      onClear: () => setServiceId(undefined),
    });
  }
  if (paymentMethods.length) {
    chips.push({
      key: "payment_method",
      label: `To'lov: ${paymentMethods.length} ta tanlandi`,
      onClear: () => setPaymentMethods([]),
    });
  }
  if (category) {
    chips.push({
      key: "category",
      label: `Kategoriya: ${categoryLabel}`,
      onClear: () => setCategory(undefined),
    });
  }
  if (status) {
    chips.push({
      key: "status",
      label: `Holat: ${STATUS_OPTIONS.find((s) => s.value === status)?.label}`,
      onClear: () => setStatus(undefined),
    });
  }
  if (cashierIds.length) {
    chips.push({
      key: "cashier",
      label: `Kassir: ${cashierIds.length} ta tanlandi`,
      onClear: () => setCashierIds([]),
    });
  }
  if (search) {
    chips.push({
      key: "search",
      label: `Qidiruv: ${search}`,
      onClear: () => {
        setSearch("");
        setSearchInput("");
      },
    });
  }

  const incomeChange = changeBadge(summary?.income_change);
  const expenseChange = changeBadge(summary?.expense_change);

  return (
    <div className="pr-[10px] md:pr-auto">
      {contextHolder}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mt-4 text-[13px]">
        <Link to="/dashboard" className="text-[#8F99A3] hover:text-[#44525C]">
          Bosh sahifa
        </Link>
        <span className="text-[#C7CED3]">/</span>
        <span className="font-[500] text-[#44525C]">Moliya</span>
      </div>

      {/* Header */}
      <div className="flex md:flex-row flex-col md:items-center items-start justify-between gap-3 mt-3 mb-4">
        <div>
          <h1 className="md:text-[22px] text-[18px] font-[600]">
            Kirim va chiqimlar
          </h1>
          <p className="text-[14px] md:text-[16px] text-[#8F99A3]">
            Barcha to'lovlar: qaysi bemor, qaysi shifokor qabuli va qaysi
            xizmat uchun
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() =>
              alert("Kategoriyalar bo'limi tez orada qo'shiladi")
            }
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border border-[#E0E6EB] text-[13px] font-[500] text-[#44525C] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
          >
            <LuLayers /> Kategoriyalar
          </button>
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border border-[#E0E6EB] text-[13px] font-[500] text-[#44525C] hover:bg-[#F9FAFB] transition-colors cursor-pointer disabled:opacity-60"
          >
            <FiDownload /> {exportMutation.isLoading ? "Yuklanmoqda..." : "Eksport"}
          </button>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-white text-[13px] font-[500] bg-[#E5484D] hover:bg-[#D23E42] transition-colors cursor-pointer"
          >
            <FiArrowDownRight /> Chiqim qo'shish
          </button>
          <button
            onClick={() => (window.location.href = "/registration")}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-white text-[13px] font-[500] bg-[#0D9488] hover:bg-[#0C8377] transition-colors cursor-pointer"
          >
            <FiArrowUpRight /> Kirim qo'shish
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid md:grid-cols-4 grid-cols-2 gap-3 mb-4">
        <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#8F99A3] flex items-center gap-1.5">
              <FiArrowUpRight className="text-[#0D9488]" /> Kirim
            </p>
          </div>
          <p className="text-[20px] font-[700] mt-1">{money(summary?.total_income)}</p>
          {incomeChange && (
            <span
              className={`inline-block mt-1 text-[11px] font-[600] px-2 py-0.5 rounded-full ${
                incomeChange.positive
                  ? "bg-[#E9FBF4] text-[#0D9488]"
                  : "bg-[#FFECEC] text-[#E5484D]"
              }`}
            >
              {incomeChange.text}
            </span>
          )}
          <span className="text-[11px] text-[#8F99A3] ml-2">
            {summary?.income_count ?? 0} ta to'lov
          </span>
        </div>

        <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
          <p className="text-[12px] text-[#8F99A3] flex items-center gap-1.5">
            <FiArrowDownRight className="text-[#E5484D]" /> Chiqim
          </p>
          <p className="text-[20px] font-[700] mt-1">{money(summary?.total_expense)}</p>
          {expenseChange && (
            <span
              className={`inline-block mt-1 text-[11px] font-[600] px-2 py-0.5 rounded-full ${
                !expenseChange.positive
                  ? "bg-[#E9FBF4] text-[#0D9488]"
                  : "bg-[#FFECEC] text-[#E5484D]"
              }`}
            >
              {expenseChange.text}
            </span>
          )}
          <span className="text-[11px] text-[#8F99A3] ml-2">
            {summary?.expense_count ?? 0} ta xarajat
          </span>
        </div>

        <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
          <p className="text-[12px] text-[#8F99A3]">Balans (foyda)</p>
          <p className="text-[20px] font-[700] mt-1">{money(summary?.balance)}</p>
          <span className="text-[11px] text-[#8F99A3]">
            {summary && summary.total_income
              ? `Rentabellik ${Math.round(
                  (summary.balance / summary.total_income) * 1000
                ) / 10}%`
              : "—"}
          </span>
        </div>

        <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
          <p className="text-[12px] text-[#8F99A3] mb-2">Kassa: to'lov usullari</p>
          <div className="flex h-[8px] w-full rounded-full overflow-hidden bg-[#F1F5F4]">
            {(summary?.payment_methods || []).map((pm, idx) => (
              <div
                key={pm.value}
                style={{
                  width: `${pm.percentage}%`,
                  backgroundColor: ["#0D9488", "#2A81D8", "#F2A93B", "#A9B2B8"][idx % 4],
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {(summary?.payment_methods || []).map((pm, idx) => (
              <span key={pm.value} className="text-[11px] text-[#44525C] flex items-center gap-1">
                <span
                  className="w-[7px] h-[7px] rounded-full inline-block"
                  style={{ backgroundColor: ["#0D9488", "#2A81D8", "#F2A93B", "#A9B2B8"][idx % 4] }}
                />
                {pm.label} {pm.percentage}%
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs + period + date range + search */}
      <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3 mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-[#F9FAFB] rounded-[8px] p-1">
          {[
            { key: "", label: "Barchasi", count: (summary?.income_count ?? 0) + (summary?.expense_count ?? 0) },
            { key: "kirim", label: "Kirim", count: summary?.income_count },
            { key: "chiqim", label: "Chiqim", count: summary?.expense_count },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setType(tab.key as "" | "kirim" | "chiqim");
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[13px] font-[500] cursor-pointer transition-colors ${
                type === tab.key
                  ? "bg-white shadow-sm text-[#0D9488]"
                  : "text-[#44525C] hover:text-[#0D9488]"
              }`}
            >
              {tab.label}
              {typeof tab.count === "number" && (
                <span className="text-[11px] text-[#8F99A3]">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {PERIOD_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => handlePreset(preset.key)}
              className={`px-3 py-1.5 rounded-[8px] text-[13px] font-[500] cursor-pointer border transition-colors ${
                activePreset === preset.key
                  ? "bg-[#0D9488] text-white border-[#0D9488]"
                  : "border-[#E0E6EB] text-[#44525C] hover:bg-[#F9FAFB]"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <RangePicker
          value={range}
          format="DD.MM.YYYY"
          allowClear={false}
          onChange={(values) => {
            if (values && values[0] && values[1]) {
              setActivePreset("");
              setRange([values[0], values[1]]);
              setPage(1);
            }
          }}
          className="!h-[36px]"
        />

        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onPressEnter={() => {
            setSearch(searchInput);
            setPage(1);
          }}
          onBlur={() => {
            setSearch(searchInput);
            setPage(1);
          }}
          placeholder="Bemor yoki chek raqami"
          prefix={<FiSearch className="text-[#8F99A3]" />}
          className="!h-[36px] md:!w-[220px] ml-auto"
        />
      </div>

      {/* Filters row */}
      <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3 mb-3 flex flex-wrap items-center gap-2">
        <Select
          mode="multiple"
          maxTagCount={0}
          maxTagPlaceholder={() =>
            doctorIds.length ? `${doctorIds.length} ta tanlandi` : undefined
          }
          value={doctorIds}
          onChange={(v) => {
            setDoctorIds(v);
            setPage(1);
          }}
          placeholder="Shifokor: Barchasi"
          allowClear
          showSearch
          optionFilterProp="label"
          className="!min-w-[170px] !h-[36px]"
          options={doctors.map((d: any) => ({ value: d.id, label: d.fio }))}
        />

        <Select
          value={serviceId}
          onChange={(v) => {
            setServiceId(v);
            setPage(1);
          }}
          placeholder="Xizmat: Barchasi"
          allowClear
          showSearch
          optionFilterProp="label"
          className="!min-w-[160px] !h-[36px]"
          options={allServices.map((s: any) => ({ value: s.id, label: s.name }))}
        />

        <Select
          mode="multiple"
          maxTagCount={0}
          maxTagPlaceholder={() =>
            paymentMethods.length ? `${paymentMethods.length} ta tanlandi` : undefined
          }
          value={paymentMethods}
          onChange={(v) => {
            setPaymentMethods(v);
            setPage(1);
          }}
          placeholder="To'lov usuli: Barchasi"
          allowClear
          className="!min-w-[180px] !h-[36px]"
          options={PAYMENT_METHODS}
        />

        <Select
          value={category}
          onChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
          placeholder="Kategoriya: Barchasi"
          allowClear
          showSearch
          optionFilterProp="label"
          className="!min-w-[170px] !h-[36px]"
        >
          <Select.OptGroup label="Xizmat turkumlari">
            {serviceCategories.map((c: any) => (
              <Select.Option key={c.id} value={c.id} label={c.name}>
                {c.name}
              </Select.Option>
            ))}
          </Select.OptGroup>
          <Select.OptGroup label="Chiqim turkumlari">
            {EXPENSE_CATEGORIES.map((c) => (
              <Select.Option key={c.value} value={c.value} label={c.label}>
                {c.label}
              </Select.Option>
            ))}
          </Select.OptGroup>
        </Select>

        <Select
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          placeholder="Holat: Barchasi"
          allowClear
          className="!min-w-[160px] !h-[36px]"
          options={STATUS_OPTIONS}
        />

        <Select
          mode="multiple"
          maxTagCount={0}
          maxTagPlaceholder={() =>
            cashierIds.length ? `${cashierIds.length} ta tanlandi` : undefined
          }
          value={cashierIds}
          onChange={(v) => {
            setCashierIds(v);
            setPage(1);
          }}
          placeholder="Kassir: Barchasi"
          allowClear
          showSearch
          optionFilterProp="label"
          className="!min-w-[160px] !h-[36px]"
          options={cashiers.map((c: any) => ({ value: c.id, label: c.fio }))}
        />
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex items-center flex-wrap gap-2 mb-3">
          <span className="text-[12px] text-[#8F99A3]">Faol filtrlar:</span>
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="flex items-center gap-1.5 text-[12px] font-[500] text-[#44525C] bg-[#F1F5F4] px-2.5 py-1 rounded-full"
            >
              {chip.label}
              <FiX
                className="cursor-pointer hover:text-[#E5484D]"
                onClick={chip.onClear}
              />
            </span>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-[12px] font-[500] text-[#E5484D] hover:underline cursor-pointer ml-1"
          >
            Barchasini tozalash
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] overflow-hidden">
        {isTxLoading ? (
          <div className="w-full py-16 flex justify-center">
            <Spin indicator={<LoadingOutlined spin />} size="large" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#8F99A3]">
            Tanlangan filtrlar bo'yicha yozuvlar topilmadi
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="text-[11px] text-[#8F99A3] border-b border-[#F0F2F3]">
                  <th className="px-4 py-2.5 font-[600]">SANA</th>
                  <th className="px-4 py-2.5 font-[600]">TURI</th>
                  <th className="px-4 py-2.5 font-[600]">BEMOR / IZOH</th>
                  <th className="px-4 py-2.5 font-[600]">SHIFOKOR</th>
                  <th className="px-4 py-2.5 font-[600]">KATEGORIYA / XIZMAT</th>
                  <th className="px-4 py-2.5 font-[600]">TO'LOV USULI</th>
                  <th className="px-4 py-2.5 font-[600] text-right">SUMMA</th>
                  <th className="px-4 py-2.5 font-[600]">HOLAT</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => {
                  const isIncome = row.type === "kirim";
                  const date = dayjs(row.date);

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[#F7F8F9] hover:bg-[#F9FAFB] transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-[13px] font-[500] text-[#44525C]">
                          {date.format("DD.MM")}
                        </p>
                        <p className="text-[11px] text-[#8F99A3]">{date.format("HH:mm")}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`flex items-center gap-1 text-[13px] font-[500] ${
                            isIncome ? "text-[#0D9488]" : "text-[#E5484D]"
                          }`}
                        >
                          {isIncome ? <FiArrowUpRight /> : <FiArrowDownRight />}
                          {isIncome ? "Kirim" : "Chiqim"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-[30px] h-[30px] shrink-0 rounded-full bg-[#E7F0FA] text-[#2A81D8] text-[11px] font-[700] flex items-center justify-center">
                            {initials(row.title)}
                          </span>
                          <div>
                            <p className="text-[13px] font-[600] whitespace-nowrap">{row.title}</p>
                            {row.reference ? (
                              <p className="text-[11px] text-[#8F99A3]">{row.reference}</p>
                            ) : (
                              <p className="text-[11px] text-[#8F99A3]">{row.subtitle}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#44525C] whitespace-nowrap">
                        {row.doctor ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-[6px] h-[6px] rounded-full bg-[#0D9488] inline-block" />
                            {row.doctor}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.category && (
                          <span className="inline-block text-[11px] font-[500] px-2 py-1 rounded-full bg-[#F1F5F4] text-[#44525C] mb-0.5">
                            {row.category}
                          </span>
                        )}
                        <p className="text-[11px] text-[#8F99A3]">{row.subtitle}</p>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#44525C] whitespace-nowrap">
                        {row.payment_method_display || "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-[13px] font-[700] text-right whitespace-nowrap ${
                          isIncome ? "text-[#0D9488]" : "text-[#E5484D]"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {money(row.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-[11px] font-[600] px-2.5 py-1 rounded-full ${
                            STATUS_BADGE_CLASS[row.status] || "bg-[#F5F5F5] text-[#8F99A3]"
                          }`}
                        >
                          {row.status_display}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer summary + pagination */}
        {meta && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#F0F2F3]">
            <p className="text-[12px] text-[#8F99A3]">
              Filtr bo'yicha: <b className="text-[#44525C]">{meta.total_items} ta yozuv</b>{" "}
              &nbsp;Kirim: <b className="text-[#0D9488]">+{money(meta.total_income_amount)}</b>
              &nbsp;Chiqim: <b className="text-[#E5484D]">-{money(meta.total_expense_amount)}</b>
              &nbsp;Farq: <b className="text-[#44525C]">{money(meta.balance)}</b>
            </p>
            {meta.total_items > perPage && (
              <Pagination
                current={page}
                pageSize={perPage}
                total={meta.total_items}
                onChange={(p) => setPage(p)}
                size="small"
              />
            )}
          </div>
        )}
      </div>

      {/* Add expense modal */}
      <Modal
        title="Chiqim qo'shish"
        open={isExpenseModalOpen}
        onCancel={() => setIsExpenseModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={expenseForm}
          layout="vertical"
          onFinish={(values) => {
            createExpenseMutation.mutate({
              category: values.category,
              title: values.title,
              amount: values.amount,
              payment_method: values.payment_method,
              date: values.date
                ? (values.date as Dayjs).format("YYYY-MM-DD")
                : undefined,
            });
          }}
          initialValues={{ date: dayjs() }}
        >
          <Form.Item
            name="category"
            label="Kategoriya"
            rules={[{ required: true, message: "Kategoriya tanlanishi kerak!" }]}
          >
            <Select options={EXPENSE_CATEGORIES} placeholder="Tanlang" />
          </Form.Item>

          <Form.Item
            name="title"
            label="Izoh"
            rules={[{ required: true, message: "Izoh kiritilishi kerak!" }]}
          >
            <Input placeholder="Masalan: Tibbiy materiallar xaridi" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Summa (so'm)"
            rules={[{ required: true, message: "Summa kiritilishi kerak!" }]}
          >
            <InputNumber<number>
              min={1}
              className="!w-full"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
              parser={(value) => Number((value || "").replace(/\s/g, ""))}
            />
          </Form.Item>

          <Form.Item name="payment_method" label="To'lov usuli">
            <Select options={PAYMENT_METHODS} placeholder="Tanlang" allowClear />
          </Form.Item>

          <Form.Item name="date" label="Sana">
            <DatePicker className="!w-full" format="DD.MM.YYYY" />
          </Form.Item>

          <button
            type="submit"
            disabled={createExpenseMutation.isLoading}
            className="w-full mt-1 px-6 py-2.5 bg-[#E5484D] hover:bg-[#D23E42] active:bg-[#C23539] text-white font-medium rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-60"
          >
            {createExpenseMutation.isLoading ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </Form>
      </Modal>
    </div>
  );
}
