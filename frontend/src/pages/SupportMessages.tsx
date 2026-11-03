import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Button, Input, Pagination, Select, Spin, notification } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
import { FiCheckCircle, FiClock } from "react-icons/fi";
import dayjs from "dayjs";
import { AvitcenaAdmin, SupportMessageItem } from "../queries/query";
import "../App.css";

export default function SupportMessages() {
  const [page, setPage] = useState(1);
  const [clinicId, setClinicId] = useState<string | undefined>();
  const per_page = 15;
  const queryClient = useQueryClient();
  const [notifApi, contextHolder] = notification.useNotification();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: clinicsData } = useQuery({
    queryKey: ["clinics", "support-filter"],
    queryFn: () => AvitcenaAdmin.getClinics(1, 100),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["supportMessages", page, per_page, clinicId],
    queryFn: () => AvitcenaAdmin.getSupportMessages(page, per_page, clinicId),
    keepPreviousData: true,
  });

  const messages: SupportMessageItem[] = data?.data || [];
  const meta = data?.meta;

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) =>
      AvitcenaAdmin.replySupportMessage(id, reply),
    onSuccess: (_res, variables) => {
      notifApi.success({ message: "Javob yuborildi" });
      setDrafts((prev) => ({ ...prev, [variables.id]: "" }));
      queryClient.invalidateQueries(["supportMessages"]);
    },
    onError: () => {
      notifApi.error({
        message: "Xatolik",
        description: "Javobni yuborib bo'lmadi, qayta urinib ko'ring",
      });
    },
  });

  return (
    <div className="pr-[10px] md:pr-auto">
      {contextHolder}
      {/* Header */}
      <div className="flex md:flex-row flex-col md:items-center items-start justify-between gap-3 mt-[30px] mb-4">
        <div>
          <h1 className="md:text-[22px] text-[18px] font-[600]">Murojaatlar</h1>
          <p className="text-[14px] md:text-[16px] text-[#8F99A3]">
            Klinikalardan kelgan texnik yordam so'rovlari
          </p>
        </div>
        <Select
          value={clinicId}
          onChange={(v) => {
            setClinicId(v);
            setPage(1);
          }}
          placeholder="Klinika: Barchasi"
          allowClear
          showSearch
          optionFilterProp="label"
          className="!w-full md:!w-[220px] !h-[40px]"
          options={(clinicsData?.data || []).map((c: any) => ({
            value: c.id,
            label: c.name,
          }))}
        />
      </div>

      {isLoading ? (
        <div className="w-full py-20 flex justify-center">
          <Spin indicator={<LoadingOutlined spin />} size="large" />
        </div>
      ) : messages.length === 0 ? (
        <div className="px-6 py-16 border border-[#E0E6EB] rounded-[10px] bg-white text-center text-[#8F99A3]">
          Hozircha murojaatlar yo'q
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((item) => (
            <div
              key={item.id}
              className="px-5 py-4 border border-[#E0E6EB] rounded-[10px] bg-white"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-[40px] h-[40px] shrink-0 flex items-center justify-center rounded-full bg-[#E7F0FA] text-[#2A81D8] text-[18px]">
                    <HiOutlineChatBubbleLeftRight />
                  </div>
                  <div>
                    <p className="text-[14px] font-[600]">{item.clinic_name}</p>
                    <p className="text-[12px] text-[#8F99A3]">
                      {item.user_fio || "Noma'lum"}
                      {item.user_role ? ` · ${item.user_role}` : ""}
                      {item.user_phone ? ` · ${item.user_phone}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`flex items-center gap-1 text-[11px] font-[600] px-2.5 py-1 rounded-full ${
                      item.delivered
                        ? "bg-[#E9FBF4] text-[#0D9488]"
                        : "bg-[#FFF7E6] text-[#D48806]"
                    }`}
                  >
                    {item.delivered ? <FiCheckCircle /> : <FiClock />}
                    {item.delivered ? "Telegramga yuborildi" : "Yuborilmadi"}
                  </span>
                  <span className="text-[12px] text-[#8F99A3] whitespace-nowrap">
                    {dayjs(item.created_at).format("DD.MM.YYYY HH:mm")}
                  </span>
                </div>
              </div>
              <p className="text-[13px] text-[#44525C] mt-3 whitespace-pre-wrap">
                {item.message}
              </p>

              {item.reply ? (
                <div className="mt-3 pl-3 border-l-2 border-[#0D9488]">
                  <p className="text-[12px] font-[600] text-[#0D9488]">
                    Javob {item.replied_by ? `· ${item.replied_by}` : ""}
                    {item.reply_source === "telegram" ? " (Telegram)" : ""}
                  </p>
                  <p className="text-[13px] text-[#44525C] mt-1 whitespace-pre-wrap">
                    {item.reply}
                  </p>
                  {item.replied_at && (
                    <p className="text-[11px] text-[#8F99A3] mt-1">
                      {dayjs(item.replied_at).format("DD.MM.YYYY HH:mm")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-3 flex items-start gap-2">
                  <Input.TextArea
                    value={drafts[item.id] || ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder="Javob yozish... (yoki Telegramda to'g'ridan-to'g'ri javob bering)"
                    rows={2}
                    className="!text-[13px]"
                  />
                  <Button
                    type="primary"
                    className="!bg-[#0D9488] hover:!bg-[#0C8377] shrink-0"
                    loading={
                      replyMutation.isLoading &&
                      replyMutation.variables?.id === item.id
                    }
                    disabled={!drafts[item.id]?.trim()}
                    onClick={() =>
                      replyMutation.mutate({ id: item.id, reply: drafts[item.id] })
                    }
                  >
                    Yuborish
                  </Button>
                </div>
              )}
            </div>
          ))}

          {meta && meta.total_items > per_page && (
            <div className="px-6 py-4 border border-[#E0E6EB] flex items-center justify-end rounded-[10px] bg-white">
              <Pagination
                current={page}
                pageSize={per_page}
                onChange={(p) => setPage(p)}
                total={meta.total_items}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
