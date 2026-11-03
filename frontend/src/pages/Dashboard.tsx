import { LuUsers } from "react-icons/lu";
import DashboardCard from "../components/DashboardCard";
import { MdOutlineDateRange } from "react-icons/md";
import { Modal, Segmented, Spin } from "antd";
import { useMemo, useState } from "react";
import DashboardCharts from "../components/DashboardCharts";
import { FaDollarSign } from "react-icons/fa6";
import { VscGraphLine } from "react-icons/vsc";
import { BiUserCheck } from "react-icons/bi";
import { LoadingOutlined } from "@ant-design/icons";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "react-query";
import { AvitcenaAdmin } from "../queries/query";
import "../App.css";
import { Link } from "react-router-dom";
import { getVisitStatusBadge, monthNamesFull, monthNamesShort } from "../utils/visitStatus";

type FlowPeriod = "weekly" | "monthly" | "yearly";

const DOCTOR_COLORS = ["#8B5CF6", "#10B981", "#F59E0B", "#6366F1", "#EF4444", "#0EA5E9"];

function formatCompactSom(value: number): string {
  return `${Math.round(value).toLocaleString("uz-UZ")} so'm`;
}

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statValueId, setStatValueId] = useState<number | string>(1);
  const [flowPeriod, setFlowPeriod] = useState<FlowPeriod>("monthly");

  const showModal = (value: number | string) => {
    setStatValueId(value);
    setIsModalOpen(true);
  };

  const handleCancel = () => setIsModalOpen(false);

  const { data: allStatData, isLoading: allStatLoading } = useQuery({
    queryFn: () => AvitcenaAdmin.allStat(),
    queryKey: ["allStat"],
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const { data: monthlyPatients } = useQuery({
    queryFn: () => AvitcenaAdmin.lineChartData("monthly"),
    queryKey: ["lineChartData", "monthly"],
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const { data: yearlyPatients } = useQuery({
    queryFn: () => AvitcenaAdmin.lineChartData("yearly"),
    queryKey: ["lineChartData", "yearly"],
    enabled: flowPeriod === "yearly",
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const { data: visitsMonthly } = useQuery({
    queryFn: () => AvitcenaAdmin.barChartData(),
    queryKey: ["barChartData"],
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const { data: revenueMonthly } = useQuery({
    queryFn: () => AvitcenaAdmin.tringleData("monthly"),
    queryKey: ["tringleData", "monthly"],
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const { data: todayVisits, isLoading: todayVisitsLoading } = useQuery({
    queryFn: () => AvitcenaAdmin.getTodayVisits(1, 5),
    queryKey: ["todayVisits", "dashboard"],
    staleTime: 60_000,
  });

  const patientsSpark = useMemo(
    () =>
      (monthlyPatients?.data ?? [])
        .slice(-14)
        .map((item: any) => ({ value: item.patient_count })),
    [monthlyPatients]
  );

  const visitsSpark = useMemo(
    () =>
      (visitsMonthly?.data ?? [])
        .slice(-14)
        .map((item: any) => ({ value: item.visit_count })),
    [visitsMonthly]
  );

  const revenueSpark = useMemo(
    () =>
      (revenueMonthly?.data ?? [])
        .slice(-14)
        .map((item: any) => ({ value: item.daily_revenue })),
    [revenueMonthly]
  );

  const patientsStats = allStatData?.data?.patients_stats;
  const visitsStats = allStatData?.data?.visits_stats;
  const staffStats = allStatData?.data?.staff_stats;
  const doctorsStats = allStatData?.data?.doctors_stats ?? [];

  const flowHasSplit = flowPeriod !== "yearly";

  const flowChartData = useMemo(() => {
    if (flowPeriod === "yearly") {
      return (yearlyPatients?.data ?? []).map((item: any) => ({
        name: monthNamesShort[item.month - 1],
        jami: item.patient_count,
      }));
    }

    const source = monthlyPatients?.data ?? [];
    const sliced = flowPeriod === "weekly" ? source.slice(-7) : source;

    return sliced.map((item: any) => {
      const d = new Date(item.data);
      return {
        name: `${d.getDate()}-${monthNamesShort[d.getMonth()]}`,
        yangi: item.new_count,
        qaytgan: item.returned_count,
      };
    });
  }, [flowPeriod, monthlyPatients, yearlyPatients]);

  const flowTotal = useMemo(
    () =>
      flowChartData.reduce(
        (sum: number, item: any) => sum + (item.jami ?? (item.yangi ?? 0) + (item.qaytgan ?? 0)),
        0
      ),
    [flowChartData]
  );

  const now = new Date();

  const [newPatient, returnedPatient] = useMemo(() => {
    if (!patientsStats) return [0, 0];

    const total = patientsStats.new_patients + patientsStats.returned_patients;

    if (!total) return [0, 0];

    return [
      (patientsStats.new_patients / total) * 100,
      (patientsStats.returned_patients / total) * 100,
    ];
  }, [patientsStats]);

  const retentionPie = [
    { name: "Yangi bemorlar", value: patientsStats?.new_patients ?? 0 },
    { name: "Qaytgan bemorlar", value: patientsStats?.returned_patients ?? 0 },
  ];
  const RETENTION_COLORS = ["#1677FF", "#0D9488"];

  const maxDoctorPatients = Math.max(
    1,
    ...doctorsStats.map((d: any) => d.patient_count || 0)
  );

  if (allStatLoading) {
    return (
      <div className="absolute top-0 left-0 w-full h-screen flex items-center justify-center bg-white z-[9999]">
        <Spin indicator={<LoadingOutlined spin />} size="large" />
      </div>
    );
  }

  return (
    <div className="py-4 pr-[10px] md:pr-auto">
      {/* Stat cards */}
      <div className="grid grid-cols-12 gap-3">
        <div className="md:col-span-3 col-span-6">
          <DashboardCard
            variant="dark"
            title="Jami bemorlar"
            icon={<LuUsers />}
            iconBg=""
            iconColor=""
            value={(patientsStats?.total_patients ?? 0).toLocaleString()}
            changeLabel={
              patientsStats?.change_from_last_month?.percentage != null
                ? `${patientsStats.change_from_last_month.percentage}%`
                : undefined
            }
            changeDirection={
              (patientsStats?.change_from_last_month?.percentage ?? 0) >= 0 ? "up" : "down"
            }
            subtitle="o'tgan oyga nisbatan"
            sparkData={patientsSpark}
            onClick={() => showModal(1)}
          />
        </div>
        <div className="md:col-span-3 col-span-6">
          <DashboardCard
            title="Bugungi qabullar"
            icon={<MdOutlineDateRange />}
            iconBg="bg-[#FFF7E6]"
            iconColor="text-[#D48806]"
            value={(visitsStats?.today_visits ?? 0).toLocaleString()}
            subtitle={`${visitsStats?.pending_visits ?? 0} ta kutilmoqda`}
            sparkData={visitsSpark}
            sparkColor="#D48806"
            onClick={() => showModal(2)}
          />
        </div>
        <div className="md:col-span-3 col-span-6">
          <DashboardCard
            title="Oylik daromad"
            icon={<FaDollarSign />}
            iconBg="bg-[#E9FBF4]"
            iconColor="text-[#0D9488]"
            value={formatCompactSom(visitsStats?.monthly_revenue ?? 0)}
            changeLabel={
              visitsStats?.change_from_last_month?.percentage != null
                ? `${visitsStats.change_from_last_month.percentage}%`
                : undefined
            }
            changeDirection={
              (visitsStats?.change_from_last_month?.percentage ?? 0) >= 0 ? "up" : "down"
            }
            subtitle="o'tgan oyga nisbatan"
            sparkData={revenueSpark}
            sparkColor="#0D9488"
            onClick={() => showModal(3)}
          />
        </div>
        <div className="md:col-span-3 col-span-6">
          <DashboardCard
            title="Xodimlar soni"
            icon={<VscGraphLine />}
            iconBg="bg-[#F3F0FF]"
            iconColor="text-[#6366F1]"
            value={(staffStats?.total ?? 0).toLocaleString()}
            subtitle={`${staffStats?.doctor_count ?? 0} shifokor, ${
              (staffStats?.admin_count ?? 0) + (staffStats?.registrator_count ?? 0)
            } boshqa`}
          />
        </div>
      </div>

      {/* Modal (detailed charts) */}
      <Modal
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={false}
        className="block md:!w-[800px]"
      >
        <DashboardCharts chartId={statValueId} />
      </Modal>

      {/* Flow + Retention */}
      <div className="grid grid-cols-12 gap-3 mt-4">
        <div className="md:col-span-8 col-span-12 border border-[#ECEFF1] rounded-[14px] px-6 py-5 bg-white">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-[16px] font-[600]">Bemorlar oqimi</h2>
              <p className="text-[12px] text-[#8F99A3]">
                {flowHasSplit
                  ? "Kunlik yangi va qaytgan bemorlar dinamikasi"
                  : "Oylar bo'yicha jami bemorlar dinamikasi"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Segmented<FlowPeriod>
                options={[
                  { label: "Hafta", value: "weekly" },
                  { label: "Oy", value: "monthly" },
                  { label: "Yil", value: "yearly" },
                ]}
                value={flowPeriod}
                onChange={setFlowPeriod}
              />
              <p className="text-[12px] text-[#8F99A3] whitespace-nowrap hidden lg:block">
                {monthNamesFull[now.getMonth()]} jami{" "}
                <span className="font-[700] text-[#1A1A1A]">{flowTotal.toLocaleString()}</span>
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={flowChartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1677FF" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#1677FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="returnedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0D9488" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#F0F2F3" />
              <XAxis dataKey="name" stroke="#A9B2B8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#A9B2B8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip />
              {flowHasSplit ? (
                <>
                  <Area type="monotone" dataKey="qaytgan" name="Qaytgan bemorlar" stroke="#0D9488" strokeWidth={2} fill="url(#returnedGrad)" />
                  <Area type="monotone" dataKey="yangi" name="Yangi bemorlar" stroke="#1677FF" strokeWidth={2} fill="url(#newGrad)" />
                </>
              ) : (
                <Area type="monotone" dataKey="jami" name="Jami bemorlar" stroke="#0D9488" strokeWidth={2} fill="url(#returnedGrad)" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="md:col-span-4 col-span-12 border border-[#ECEFF1] rounded-[14px] px-6 py-5 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[16px] font-[600]">Retention Rate</h2>
              <p className="text-[12px] text-[#8F99A3]">Bemorlarning qaytish darajasi</p>
            </div>
          </div>

          <div className="relative flex justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={retentionPie}
                  cx="50%"
                  cy="50%"
                  innerRadius="68%"
                  outerRadius="88%"
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {retentionPie.map((_, index) => (
                    <Cell key={index} fill={RETENTION_COLORS[index % RETENTION_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[26px] font-[700]">{returnedPatient.toFixed(0)}%</span>
              <span className="text-[11px] text-[#8F99A3]">qaytgan bemorlar</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0D9488]" /> Qaytgan bemorlar
              </span>
              <span className="font-[600]">
                {(patientsStats?.returned_patients ?? 0).toLocaleString()}{" "}
                <span className="text-[#8F99A3] font-[400]">{returnedPatient.toFixed(0)}%</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1677FF]" /> Yangi bemorlar
              </span>
              <span className="font-[600]">
                {(patientsStats?.new_patients ?? 0).toLocaleString()}{" "}
                <span className="text-[#8F99A3] font-[400]">{newPatient.toFixed(0)}%</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Doctors + Today's visits */}
      <div className="grid grid-cols-12 gap-3 mt-4">
        <div className="md:col-span-6 col-span-12 border border-[#ECEFF1] rounded-[14px] px-6 py-5 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[16px] font-[600]">Shifokorlar faoliyati</h2>
              <p className="text-[12px] text-[#8F99A3]">Bugun har bir shifokor ko'rgan bemorlar</p>
            </div>
            <Link to="/employees" className="text-[13px] text-[#0D9488] font-[500]">
              Barchasi →
            </Link>
          </div>

          <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto scrollbar-hide">
            {doctorsStats.length === 0 && (
              <p className="text-[13px] text-[#8F99A3] py-6 text-center">Ma'lumot yo'q</p>
            )}
            {doctorsStats.map((item: any, index: number) => {
              const color = DOCTOR_COLORS[index % DOCTOR_COLORS.length];
              const widthPct = Math.round(
                ((item.patient_count || 0) / maxDoctorPatients) * 100
              );
              const initials = (item.fio || "")
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((p: string) => p[0]?.toUpperCase())
                .join("");

              return (
                <Link
                  to={`/employees/${item.id}`}
                  key={item.id}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-[38px] h-[38px] shrink-0 rounded-full flex items-center justify-center text-[13px] font-[600]"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-[600] truncate">Dr. {item.fio}</p>
                      <span className="text-[12px] text-[#8F99A3] shrink-0 ml-2">
                        {item.patient_count}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8F99A3] mb-1 truncate">
                      {item.category_name || "Shifokor"}
                    </p>
                    <div className="h-[6px] rounded-full bg-[#F0F2F3] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${widthPct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-6 col-span-12 border border-[#ECEFF1] rounded-[14px] px-6 py-5 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[16px] font-[600]">Yaqin qabullar</h2>
              <p className="text-[12px] text-[#8F99A3]">Bugungi navbatdagi bemorlar</p>
            </div>
            <Link to="/receptions" className="text-[13px] text-[#0D9488] font-[500]">
              Barchasi →
            </Link>
          </div>

          <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto scrollbar-hide">
            {todayVisitsLoading && (
              <div className="py-10 flex justify-center">
                <Spin indicator={<LoadingOutlined spin />} />
              </div>
            )}
            {!todayVisitsLoading && (todayVisits?.data ?? []).length === 0 && (
              <p className="text-[13px] text-[#8F99A3] py-6 text-center">
                Bugun hali qabul yaratilmagan
              </p>
            )}
            {(todayVisits?.data ?? []).map((visit: any) => {
              const badge = getVisitStatusBadge(visit.status);
              const time = new Date(visit.created_at).toLocaleTimeString("uz-UZ", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={visit.id}
                  className="flex items-center gap-3 pb-3 border-b border-[#F4F6F7] last:border-b-0 last:pb-0"
                >
                  <div className="w-[50px] shrink-0 text-[13px] font-[600] text-[#44525C]">
                    {time}
                  </div>
                  <div className="w-[3px] self-stretch rounded-full bg-[#0D9488]" />
                  <div className="w-[34px] h-[34px] shrink-0 rounded-full bg-[#E7F0FA] text-[#2A81D8] flex items-center justify-center text-[14px]">
                    <BiUserCheck />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-[600] truncate">{visit.patient?.fio}</p>
                    <p className="text-[11px] text-[#8F99A3] truncate">
                      {visit.doctor?.specialty || "Shifokor"}
                      {visit.doctor?.fio ? ` · Dr. ${visit.doctor.fio}` : ""}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-[600] px-2 py-1 rounded-[6px] shrink-0 ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
