import { ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  notification,
  Pagination,
  Select,
  Spin,
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  FiArrowDownRight,
  FiArrowUpRight,
  FiCreditCard,
  FiDownload,
  FiSearch,
} from "react-icons/fi";
import { LuLayers, LuWallet } from "react-icons/lu";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AvitcenaAdmin,
  CashOrCard,
  FinanceFilters,
  FinanceSource,
  FinanceTransaction,
} from "../queries/query";
import FinanceCategoriesDrawer from "../components/FinanceCategoriesDrawer";
import { useDebouncedValue } from "../utils/useDebouncedValue";
import { apiErrorMessage } from "../utils/apiError";
import SecureStorage from "react-secure-storage";
import "../App.css";

const { RangePicker } = DatePicker;

const PAYMENT_METHODS: { value: CashOrCard; label: string }[] = [
  { value: "cash", label: "Naqd" },
  { value: "card", label: "Karta" },
];

const SOURCES: { value: FinanceSource; label: string }[] = [
  { value: "visit", label: "Qabullar" },
  { value: "inpatient", label: "Statsionar" },
  { value: "warehouse", label: "Ombor xaridlari" },
  { value: "manual", label: "Qo'lda kiritilgan" },
];

const PERIOD_PRESETS: { key: string; label: string }[] = [
  { key: "today", label: "Bugun" },
  { key: "week", label: "Hafta" },
  { key: "month", label: "Oy" },
  { key: "year", label: "Yil" },
];

const INCOME_COLOR = "#0D9488";
const EXPENSE_COLOR = "#E5484D";

function money(n: number | undefined | null) {
  return `${Math.round(n || 0).toLocaleString("uz-UZ")} so'm`;
}

function compact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${Math.round((n / 1_000_000) * 10) / 10} mln`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)} ming`;
  return String(n);
}

function Card({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border bg-white border-[#E8E8E8] rounded-[10px] px-4 py-3 ${className}`}>
      <p className="text-[12px] text-[#8F99A3] flex items-center gap-1.5">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

function MethodSplit({ cash, card, unknown }: { cash: number; card: number; unknown?: number }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[12px] text-[#64727B]">
      <span>Naqd: {money(cash)}</span>
      <span>Karta: {money(card)}</span>
      {!!unknown && <span>Belgilanmagan: {money(unknown)}</span>}
    </div>
  );
}

// ========================= Qo'lda kirim / chiqim =========================

function EntryModal({
  open,
  type,
  clinicId,
  onClose,
  notify,
}: {
  open: boolean;
  type: "kirim" | "chiqim";
  clinicId: string;
  onClose: () => void;
  notify: (type: "success" | "error", message: string, description?: string) => void;
}) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: categoriesData } = useQuery({
    queryKey: ["financeCategories", clinicId, type, "entry-options"],
    queryFn: () => AvitcenaAdmin.financeCategories({ clinic: clinicId, type }),
    enabled: open,
  });

  // Qabul to'lovlari avtomatik yoziladi, ularni qo'lda kiritib bo'lmaydi
  const categories = (categoriesData?.data?.categories || []).filter((c) => !c.is_system);

  const { mutate, isLoading } = useMutation(
    (values: any) =>
      AvitcenaAdmin.createExpense(
        {
          category: values.category,
          title: values.title.trim(),
          amount: values.amount,
          payment_method: values.payment_method,
          date: (values.date as Dayjs).format("YYYY-MM-DD"),
        },
        clinicId
      ),
    {
      onSuccess: () => {
        notify("success", type === "kirim" ? "Kirim qo'shildi" : "Chiqim qo'shildi");
        queryClient.invalidateQueries(["finance"]);
        queryClient.invalidateQueries(["financeCategories"]);
        onClose();
      },
      onError: (error) =>
        notify("error", "Saqlab bo'lmadi", apiErrorMessage(error, "Qaytadan urinib ko'ring")),
    }
  );

  return (
    <Modal
      title={type === "kirim" ? "Kirim qo'shish" : "Chiqim qo'shish"}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => mutate(values)}
        initialValues={{ date: dayjs(), payment_method: "cash" }}
      >
        <Form.Item
          name="category"
          label="Kategoriya"
          rules={[{ required: true, message: "Kategoriyani tanlang" }]}
        >
          <Select
            aria-label="Kategoriya"
            placeholder="Tanlang"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item
          name="title"
          label="Izoh"
          rules={[{ required: true, whitespace: true, message: "Izoh kiriting" }]}
        >
          <Input
            placeholder={
              type === "kirim" ? "Masalan: Sug'urta kompaniyasidan to'lov" : "Masalan: Noyabr ijarasi"
            }
          />
        </Form.Item>
        <Form.Item
          name="amount"
          label="Summa (so'm)"
          rules={[{ required: true, message: "Summani kiriting" }]}
        >
          <InputNumber<number>
            aria-label="Summa"
            min={1}
            className="!w-full"
            formatter={(value) => `${value ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
            parser={(value) => Number((value || "").replace(/\s/g, ""))}
          />
        </Form.Item>
        <Form.Item name="payment_method" label="To'lov turi" rules={[{ required: true }]}>
          <MethodToggle />
        </Form.Item>
        <Form.Item name="date" label="Sana" rules={[{ required: true, message: "Sanani tanlang" }]}>
          <DatePicker className="!w-full" format="DD.MM.YYYY" allowClear={false} />
        </Form.Item>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-[40px] rounded-[8px] text-white font-[500] cursor-pointer disabled:opacity-60"
          style={{ backgroundColor: type === "kirim" ? INCOME_COLOR : EXPENSE_COLOR }}
        >
          {isLoading ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </Form>
    </Modal>
  );
}

function MethodToggle({ value, onChange }: { value?: CashOrCard; onChange?: (v: CashOrCard) => void }) {
  return (
    <div className="flex gap-2">
      {PAYMENT_METHODS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange?.(m.value)}
          className={`flex-1 h-[38px] rounded-[8px] border text-[14px] font-[500] cursor-pointer ${
            value === m.value
              ? "border-[#0D9488] bg-[#E9FBF4] text-[#0D9488]"
              : "border-[#E0E6EB] text-[#44525C]"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ========================= Sahifa =========================

export default function Moliya() {
  // Admin va registrator faqat o'z klinikasini ko'radi, klinikani server o'zi aniqlaydi
  if (SecureStorage.getItem("role") !== "superadmin") {
    return <MoliyaContent clinicId="" clinicSelect={null} />;
  }

  return <SuperAdminMoliya />;
}

function SuperAdminMoliya() {
  const [selectedClinicId, setSelectedClinicId] = useState<string | undefined>();

  const { data: clinicsData, isLoading } = useQuery({
    queryKey: ["clinics", "finance-select"],
    queryFn: () => AvitcenaAdmin.getClinics(1, 100),
  });

  const clinics: { id: string; name: string }[] = clinicsData?.data || [];
  const clinicId = selectedClinicId ?? clinics[0]?.id;

  if (isLoading) {
    return (
      <div className="w-full py-16 flex justify-center">
        <Spin indicator={<LoadingOutlined spin />} size="large" />
      </div>
    );
  }

  if (!clinicId) {
    return (
      <div className="px-6 py-16 text-center text-[#8F99A3]">
        Moliyani ko'rish uchun avval klinika qo'shing
      </div>
    );
  }

  // key: klinika almashganda filtrlar va eski ma'lumotlar tozalanadi
  return (
    <MoliyaContent
      key={clinicId}
      clinicId={clinicId}
      clinicSelect={
        <Select
          value={clinicId}
          onChange={setSelectedClinicId}
          aria-label="Klinika"
          showSearch
          optionFilterProp="label"
          className="!min-w-[200px] !h-[38px]"
          options={clinics.map((c) => ({ value: c.id, label: c.name }))}
        />
      }
    />
  );
}

function MoliyaContent({ clinicId, clinicSelect }: { clinicId: string; clinicSelect: ReactNode }) {
  const [notifApi, contextHolder] = notification.useNotification();
  const notify = (type: "success" | "error", message: string, description?: string) =>
    notifApi[type]({ message, description });

  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [activePreset, setActivePreset] = useState("month");
  const [type, setType] = useState<"" | "kirim" | "chiqim">("");
  const [method, setMethod] = useState<"" | CashOrCard>("");
  const [source, setSource] = useState<FinanceSource | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [page, setPage] = useState(1);
  const perPage = 15;

  const [entryModal, setEntryModal] = useState<{ open: boolean; type: "kirim" | "chiqim" }>({
    open: false,
    type: "chiqim",
  });
  const [isCategoriesDrawerOpen, setIsCategoriesDrawerOpen] = useState(false);

  const period = {
    clinic: clinicId,
    date_from: range[0].format("YYYY-MM-DD"),
    date_to: range[1].format("YYYY-MM-DD"),
  };

  const filters: FinanceFilters = useMemo(
    () => ({
      ...period,
      type: type || undefined,
      payment_method: method || undefined,
      source,
      search: search || undefined,
    }),
    [clinicId, range, type, method, source, search]
  );

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["finance", "summary", period],
    queryFn: () => AvitcenaAdmin.financeSummary(period),
    keepPreviousData: true,
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ["finance", "transactions", filters, page],
    queryFn: () => AvitcenaAdmin.financeTransactions({ ...filters, page, per_page: perPage }),
    keepPreviousData: true,
  });

  const exportMutation = useMutation(() => AvitcenaAdmin.financeExport(filters), {
    onError: () => notify("error", "Eksport qilib bo'lmadi"),
  });

  const summary = summaryData?.data;
  const transactions: FinanceTransaction[] = txData?.data?.results || [];
  const meta = txData?.data?.meta;

  const handlePreset = (key: string) => {
    const now = dayjs();
    setActivePreset(key);
    setPage(1);
    if (key === "today") setRange([now.startOf("day"), now.endOf("day")]);
    if (key === "week") setRange([now.startOf("week"), now.endOf("week")]);
    if (key === "month") setRange([now.startOf("month"), now.endOf("month")]);
    if (key === "year") setRange([now.startOf("year"), now.endOf("year")]);
  };

  const chartData = (summary?.series || []).map((point) => ({
    label:
      summary?.series_unit === "month"
        ? dayjs(`${point.period}-01`).format("MMM YY")
        : dayjs(point.period).format("DD.MM"),
    Kirim: point.income,
    Chiqim: point.expense,
  }));

  const incomeSources = (summary?.by_source || []).filter((s) => s.type === "kirim");
  const expenseSources = (summary?.by_source || []).filter((s) => s.type === "chiqim");

  return (
    <div className="pr-[10px] md:pr-auto">
      {contextHolder}

      {/* Header */}
      <div className="flex md:flex-row flex-col md:items-center items-start justify-between gap-3 mt-[30px] mb-4">
        <div>
          <h1 className="md:text-[22px] text-[18px] font-[600]">Moliya</h1>
          <p className="text-[14px] md:text-[16px] text-[#8F99A3]">
            Klinikaning barcha kirim va chiqimlari: naqd va karta
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {clinicSelect}
          <button
            onClick={() => setIsCategoriesDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 h-[38px] rounded-[8px] border border-[#E0E6EB] text-[13px] cursor-pointer"
          >
            <LuLayers /> Kategoriyalar
          </button>
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isLoading}
            className="flex items-center gap-1.5 px-3.5 h-[38px] rounded-[8px] border border-[#E0E6EB] text-[13px] cursor-pointer disabled:opacity-60"
          >
            <FiDownload /> {exportMutation.isLoading ? "Yuklanmoqda..." : "Eksport"}
          </button>
          <button
            onClick={() => setEntryModal({ open: true, type: "kirim" })}
            className="flex items-center gap-1.5 px-3.5 h-[38px] rounded-[8px] text-white text-[13px] cursor-pointer"
            style={{ backgroundColor: INCOME_COLOR }}
          >
            <FiArrowUpRight /> Kirim qo'shish
          </button>
          <button
            onClick={() => setEntryModal({ open: true, type: "chiqim" })}
            className="flex items-center gap-1.5 px-3.5 h-[38px] rounded-[8px] text-white text-[13px] cursor-pointer"
            style={{ backgroundColor: EXPENSE_COLOR }}
          >
            <FiArrowDownRight /> Chiqim qo'shish
          </button>
        </div>
      </div>

      {/* Period */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {PERIOD_PRESETS.map((preset) => (
          <button
            key={preset.key}
            onClick={() => handlePreset(preset.key)}
            className={`px-3 h-[36px] rounded-[8px] text-[13px] font-[500] cursor-pointer border ${
              activePreset === preset.key
                ? "bg-[#0D9488] text-white border-[#0D9488]"
                : "border-[#E0E6EB] text-[#44525C] bg-white"
            }`}
          >
            {preset.label}
          </button>
        ))}
        <RangePicker
          value={range}
          format="DD.MM.YYYY"
          allowClear={false}
          onChange={(values) => {
            if (values && values[0] && values[1]) {
              setActivePreset("");
              setRange([values[0].startOf("day"), values[1].endOf("day")]);
              setPage(1);
            }
          }}
          className="!h-[36px]"
        />
      </div>

      {summaryLoading || !summary ? (
        <div className="flex justify-center py-16">
          <Spin indicator={<LoadingOutlined spin />} size="large" />
        </div>
      ) : (
        <>
          {/* Asosiy ko'rsatkichlar */}
          <div className="grid xl:grid-cols-5 md:grid-cols-3 grid-cols-1 gap-3 mb-4">
            <Card title="Kirim" icon={<FiArrowUpRight className="text-[#0D9488]" />}>
              <p className="text-[20px] font-[700]">{money(summary.income.total)}</p>
              <MethodSplit {...summary.income} />
            </Card>
            <Card title="Chiqim" icon={<FiArrowDownRight className="text-[#E5484D]" />}>
              <p className="text-[20px] font-[700]">{money(summary.expense.total)}</p>
              <MethodSplit {...summary.expense} />
            </Card>
            <Card title="Foyda (kirim − chiqim)">
              <p
                className={`text-[20px] font-[700] ${
                  summary.balance < 0 ? "text-[#E5484D]" : "text-[#0D9488]"
                }`}
              >
                {money(summary.balance)}
              </p>
              <p className="text-[12px] text-[#64727B] mt-1">
                {summary.income.total
                  ? `Rentabellik ${Math.round((summary.balance / summary.income.total) * 1000) / 10}%`
                  : "—"}
              </p>
            </Card>
            <Card title="Naqd (kassa)" icon={<LuWallet />}>
              <p className="text-[20px] font-[700]">{money(summary.cash_balance)}</p>
              <p className="text-[12px] text-[#64727B] mt-1">
                +{money(summary.income.cash)} / −{money(summary.expense.cash)}
              </p>
            </Card>
            <Card title="Karta" icon={<FiCreditCard />}>
              <p className="text-[20px] font-[700]">{money(summary.card_balance)}</p>
              <p className="text-[12px] text-[#64727B] mt-1">
                +{money(summary.income.card)} / −{money(summary.expense.card)}
              </p>
            </Card>
          </div>

          <div className="grid xl:grid-cols-3 grid-cols-1 gap-3 mb-4">
            {/* Grafik */}
            <div className="xl:col-span-2 border bg-white border-[#E8E8E8] rounded-[10px] p-4">
              <p className="font-[600] text-[14px] mb-3">
                {summary.series_unit === "month" ? "Oylar bo'yicha" : "Kunlar bo'yicha"} kirim va chiqim
              </p>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} width={60} />
                    <Tooltip formatter={(value: number) => money(value)} />
                    <Legend />
                    <Bar dataKey="Kirim" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="Chiqim" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Manbalar */}
            <div className="border bg-white border-[#E8E8E8] rounded-[10px] p-4">
              <p className="font-[600] text-[14px] mb-2">Kirim manbalari</p>
              {incomeSources.length === 0 ? (
                <p className="text-[13px] text-[#8F99A3] mb-3">Bu davrda kirim yo'q</p>
              ) : (
                incomeSources.map((s) => (
                  <div key={s.source} className="flex justify-between text-[13px] py-1">
                    <span>
                      {s.label} <span className="text-[#8F99A3]">({s.count})</span>
                    </span>
                    <span className="font-[600] text-[#0D9488]">{money(s.amount)}</span>
                  </div>
                ))
              )}
              <p className="font-[600] text-[14px] mt-3 mb-2">Chiqim manbalari</p>
              {expenseSources.length === 0 ? (
                <p className="text-[13px] text-[#8F99A3]">Bu davrda chiqim yo'q</p>
              ) : (
                expenseSources.map((s) => (
                  <div key={s.source} className="flex justify-between text-[13px] py-1">
                    <span>
                      {s.label} <span className="text-[#8F99A3]">({s.count})</span>
                    </span>
                    <span className="font-[600] text-[#E5484D]">{money(s.amount)}</span>
                  </div>
                ))
              )}
              {summary.expense_by_category.length > 0 && (
                <>
                  <p className="font-[600] text-[14px] mt-3 mb-2">Chiqim kategoriyalari</p>
                  {summary.expense_by_category.map((c) => (
                    <div key={c.category} className="flex justify-between text-[13px] py-0.5">
                      <span className="text-[#44525C]">{c.category}</span>
                      <span>{money(c.amount)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* To'lanmagan qabullar */}
          {summary.unpaid.count > 0 && (
            <div className="border bg-[#FFF8EE] border-[#F5D9A8] rounded-[10px] p-4 mb-4">
              <p className="font-[600] text-[14px]">
                To'lanmagan qabullar: {summary.unpaid.count} ta, {money(summary.unpaid.amount)}
              </p>
              <p className="text-[12px] text-[#8F6A2E] mb-2">
                Bu summa kirimga qo'shilmagan. To'lovni registrator yoki admin qabul qiladi.
              </p>
              <div className="flex flex-col gap-1">
                {summary.unpaid.items.map((item) => (
                  <div key={item.id} className="flex flex-wrap justify-between gap-2 text-[13px]">
                    <span>
                      {item.patient}
                      <span className="text-[#8F99A3]">
                        {" "}
                        · {dayjs(item.date).format("DD.MM.YYYY HH:mm")}
                        {item.doctor ? ` · ${item.doctor}` : ""}
                      </span>
                    </span>
                    <span className="font-[600]">{money(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Amallar */}
      <div className="border bg-white border-[#E8E8E8] rounded-[10px] px-4 py-3 mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-[#F9FAFB] rounded-[8px] p-1">
          {[
            { key: "", label: "Barchasi" },
            { key: "kirim", label: "Kirim" },
            { key: "chiqim", label: "Chiqim" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setType(tab.key as "" | "kirim" | "chiqim");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-[6px] text-[13px] font-[500] cursor-pointer ${
                type === tab.key ? "bg-white shadow-sm text-[#0D9488]" : "text-[#44525C]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-[#F9FAFB] rounded-[8px] p-1">
          {[{ value: "" as const, label: "Barcha to'lovlar" }, ...PAYMENT_METHODS].map((m) => (
            <button
              key={m.value}
              onClick={() => {
                setMethod(m.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-[6px] text-[13px] font-[500] cursor-pointer ${
                method === m.value ? "bg-white shadow-sm text-[#0D9488]" : "text-[#44525C]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <Select
          aria-label="Manba"
          value={source}
          onChange={(v) => {
            setSource(v);
            setPage(1);
          }}
          allowClear
          placeholder="Manba: Barchasi"
          options={SOURCES}
          className="!min-w-[180px] !h-[36px]"
        />
        <Input
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          allowClear
          aria-label="Moliyani qidirish"
          placeholder="Bemor, izoh, chek raqami..."
          prefix={<FiSearch className="text-[#8F99A3]" />}
          className="!h-[36px] md:!w-[240px] md:ml-auto"
        />
      </div>

      <div className="border bg-white border-[#E8E8E8] rounded-[10px] overflow-hidden mb-6">
        {txLoading ? (
          <div className="w-full py-16 flex justify-center">
            <Spin indicator={<LoadingOutlined spin />} size="large" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#8F99A3]">
            Tanlangan filtrlar bo'yicha yozuvlar topilmadi
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px] text-[13px]">
              <thead>
                <tr className="text-[11px] text-[#8F99A3] border-b border-[#F0F2F3]">
                  <th className="px-4 py-2.5 font-[600]">SANA</th>
                  <th className="px-4 py-2.5 font-[600]">TURI</th>
                  <th className="px-4 py-2.5 font-[600]">NOMI / TAFSILOT</th>
                  <th className="px-4 py-2.5 font-[600]">MANBA</th>
                  <th className="px-4 py-2.5 font-[600]">TO'LOV</th>
                  <th className="px-4 py-2.5 font-[600] text-right">SUMMA</th>
                  <th className="px-4 py-2.5 font-[600]">XODIM</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => {
                  const isIncome = row.type === "kirim";
                  return (
                    <tr key={`${row.source}-${row.id}`} className="border-b border-[#F7F8F9]">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {dayjs(row.date).format("DD.MM.YYYY")}
                        <span className="block text-[11px] text-[#8F99A3]">
                          {row.source === "manual" || row.source === "warehouse"
                            ? ""
                            : dayjs(row.date).format("HH:mm")}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`flex items-center gap-1 font-[500] ${
                            isIncome ? "text-[#0D9488]" : "text-[#E5484D]"
                          }`}
                        >
                          {isIncome ? <FiArrowUpRight /> : <FiArrowDownRight />}
                          {isIncome ? "Kirim" : "Chiqim"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-[600]">{row.title}</p>
                        <p className="text-[11px] text-[#8F99A3]">
                          {[row.reference, row.subtitle, row.doctor].filter(Boolean).join(" · ")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {row.source_display}
                        {row.category && row.category !== row.source_display && (
                          <span className="block text-[11px] text-[#8F99A3]">{row.category}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-[600] ${
                            row.payment_method === "cash"
                              ? "bg-[#E9FBF4] text-[#0D9488]"
                              : row.payment_method === "card"
                              ? "bg-[#EEF6FD] text-[#2A81D8]"
                              : "bg-[#F1F5F4] text-[#64727B]"
                          }`}
                        >
                          {row.payment_method_display}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-[700] whitespace-nowrap ${
                          isIncome ? "text-[#0D9488]" : "text-[#E5484D]"
                        }`}
                      >
                        {isIncome ? "+" : "−"}
                        {money(row.amount)}
                      </td>
                      <td className="px-4 py-3 text-[#64727B] whitespace-nowrap">{row.created_by || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#F0F2F3]">
            <p className="text-[12px] text-[#8F99A3]">
              Filtr bo'yicha: <b className="text-[#44525C]">{meta.total_items} ta yozuv</b>
              &nbsp; Kirim: <b className="text-[#0D9488]">+{money(meta.income_amount)}</b>
              &nbsp; Chiqim: <b className="text-[#E5484D]">−{money(meta.expense_amount)}</b>
              &nbsp; Farq: <b className="text-[#44525C]">{money(meta.balance)}</b>
            </p>
            {meta.total_items > perPage && (
              <Pagination
                current={page}
                pageSize={perPage}
                total={meta.total_items}
                onChange={setPage}
                size="small"
              />
            )}
          </div>
        )}
      </div>

      <EntryModal
        open={entryModal.open}
        type={entryModal.type}
        clinicId={clinicId}
        onClose={() => setEntryModal((prev) => ({ ...prev, open: false }))}
        notify={notify}
      />

      <FinanceCategoriesDrawer
        open={isCategoriesDrawerOpen}
        onClose={() => setIsCategoriesDrawerOpen(false)}
        clinicId={clinicId}
      />
    </div>
  );
}
