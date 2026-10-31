import { DatePicker, Pagination, Spin } from "antd";
import { useState } from "react";
import { useQuery } from "react-query";
import { OneMedAdmin } from "../queries/query";
import { LoadingOutlined } from "@ant-design/icons";
import { BiUserCheck } from "react-icons/bi";
import { BsTelephone } from "react-icons/bs";
import { Link } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import { getVisitStatusBadge } from "../utils/visitStatus";
import "../App.css";

const STATUS_OPTIONS = [
  { value: "", label: "Barchasi" },
  { value: "pending", label: "Kutilmoqda" },
  { value: "in_progress", label: "Jarayonda" },
  { value: "completed", label: "Tasdiqlangan" },
  { value: "cancelled", label: "Bekor qilindi" },
];

export default function Receptions() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [date, setDate] = useState<Dayjs>(dayjs());
  const per_page = 12;

  const { data, isLoading } = useQuery({
    queryKey: ["todayVisits", "receptions", page, per_page, date.format("YYYY-MM-DD"), status],
    queryFn: () =>
      OneMedAdmin.getTodayVisits(page, per_page, date.format("YYYY-MM-DD"), status),
    keepPreviousData: true,
  });

  const isToday = date.isSame(dayjs(), "day");

  return (
    <div className="pr-[10px] md:pr-auto">
      {/* Header */}
      <div className="flex items-center justify-between mt-[30px] flex-wrap gap-3">
        <div>
          <h1 className="md:text-[22px] text-[18px] font-[600]">Qabullar</h1>
          <p className="text-[14px] md:text-[16px] text-[#8F99A3]">
            {isToday ? "Bugungi" : date.format("DD-MMMM")} navbat ro'yxati
          </p>
        </div>
        <DatePicker
          value={date}
          onChange={(value) => value && setDate(value)}
          allowClear={false}
          className="!h-[41px]"
        />
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border border-[#E0E6EB] rounded-[10px] flex items-center gap-2 mt-4 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setStatus(opt.value);
              setPage(1);
            }}
            className={`px-3 py-2 border border-[#eaeaea] rounded-[6px] cursor-pointer text-[14px] hover:shadow-md transition-all duration-150 ${
              status === opt.value ? "bg-[#0D9488] text-white" : "text-black"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="w-full py-20 flex justify-center">
          <Spin indicator={<LoadingOutlined spin />} size="large" />
        </div>
      ) : (
        <div className="mt-[14px]">
          {(data?.data ?? []).length === 0 && (
            <div className="px-6 py-10 border border-[#E0E6EB] rounded-[10px] bg-white text-center text-[#8F99A3]">
              Bu sanada qabullar topilmadi
            </div>
          )}

          {(data?.data ?? []).map((visit: any) => {
            const badge = getVisitStatusBadge(visit.status);
            const time = new Date(visit.created_at).toLocaleTimeString("uz-UZ", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Link
                to={`/patients/${visit.patient?.id}`}
                key={visit.id}
                className="px-6 py-4 border border-[#E0E6EB] flex items-center justify-between rounded-[10px] bg-[#fff] mb-3 hover:shadow-md transition-all duration-150 gap-4 flex-wrap"
              >
                <div className="flex items-center gap-3">
                  <div className="w-[55px] shrink-0 text-[14px] font-[600] text-[#44525C]">
                    {time}
                  </div>
                  <div className="md:w-[50px] md:h-[50px] w-[35px] h-[35px] flex justify-center items-center rounded-full bg-[#E7F0FA] text-[#2A81D8] md:text-[24px] text-[20px]">
                    <BiUserCheck />
                  </div>
                  <div>
                    <h3 className="md:text-[16px] text-[14px] font-[600]">
                      {visit.patient?.fio}
                    </h3>
                    <p className="md:text-[14px] text-[12px] text-[#8b8b8b] flex gap-2 items-center">
                      <BsTelephone /> {visit.patient?.phone || "-"}
                    </p>
                  </div>
                </div>

                <div className="text-[13px] text-[#44525C]">
                  {visit.doctor?.specialty && (
                    <p className="text-[#8F99A3]">{visit.doctor.specialty}</p>
                  )}
                  <p className="font-[500]">{visit.doctor?.fio ? `Dr. ${visit.doctor.fio}` : "-"}</p>
                </div>

                <div className="text-[14px] font-[600]">
                  {Number(visit.total_price || 0).toLocaleString()} so'm
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`px-2.5 py-1.5 rounded-[8px] text-[13px] font-[600] ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-[8px] text-[11px] font-[600] ${
                      visit.payment_method_display
                        ? "bg-[#E9FBF4] text-[#0D9488]"
                        : "bg-[#FFF7E6] text-[#D48806]"
                    }`}
                  >
                    {visit.payment_method_display
                      ? `To'lov qabul qilindi (${visit.payment_method_display})`
                      : "To'lov qabul qilinmagan"}
                  </span>
                </div>
              </Link>
            );
          })}

          {data?.meta?.total_items > per_page && (
            <div className="px-6 py-4 border border-[#E0E6EB] flex items-center justify-end rounded-[10px] bg-[#fff] mb-5">
              <Pagination
                current={page}
                pageSize={per_page}
                onChange={(p) => setPage(p)}
                total={data?.meta.total_items}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
