import { ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Link } from "react-router-dom";
import {
  AutoComplete,
  DatePicker,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  notification,
  Pagination,
  Popconfirm,
  Select,
  Spin,
  Switch,
  TreeSelect,
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { LuBedDouble, LuSearch } from "react-icons/lu";
import dayjs, { Dayjs } from "dayjs";
import SecureStorage from "react-secure-storage";
import {
  AdmissionDetail,
  AdmissionListItem,
  AvitcenaAdmin,
  InpatientRoom,
  RoomType,
} from "../queries/query";
import { useDebouncedValue } from "../utils/useDebouncedValue";
import { apiErrorMessage } from "../utils/apiError";
import "../App.css";

type Tab = "active" | "rooms" | "discharged";

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "standard", label: "Standart" },
  { value: "vip", label: "VIP" },
];

const roomTypeLabel = (type: RoomType) =>
  ROOM_TYPES.find((t) => t.value === type)?.label ?? type;

function RoomTypeBadge({ type }: { type: RoomType }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-[600] align-middle ${
        type === "vip" ? "bg-[#FFF4E0] text-[#B26A00]" : "bg-[#EEF6FD] text-[#2A81D8]"
      }`}
    >
      {roomTypeLabel(type)}
    </span>
  );
}

function money(n: number | undefined | null) {
  return `${Math.round(n || 0).toLocaleString("uz-UZ")} so'm`;
}

function formatDateTime(value: string | null | undefined) {
  return value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "—";
}

type Notify = (type: "success" | "error", message: string, description?: string) => void;

// ========================= Bemorni yotqizish =========================

function AdmitModal({
  open,
  onClose,
  rooms,
  initialBedId,
  notify,
  onAdmitted,
}: {
  open: boolean;
  onClose: () => void;
  rooms: InpatientRoom[];
  initialBedId?: string;
  notify: Notify;
  onAdmitted: (admission: AdmissionDetail) => void;
}) {
  const [form] = Form.useForm();
  const [patientInput, setPatientInput] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const term = useDebouncedValue(patientInput.trim());

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ bed: initialBedId, admitted_at: dayjs() });
      setPatientInput("");
      setPatientId(null);
    }
  }, [open, initialBedId]);

  const { data: patientsData, isFetching: patientsFetching } = useQuery({
    queryKey: ["admitPatientSearch", term],
    queryFn: () => AvitcenaAdmin.getPatientsAll(1, 10, term, "active"),
    enabled: open && term.length >= 2,
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["employees", 1, 100, "", "doctor"],
    queryFn: () => AvitcenaAdmin.getEmployeesFilter(1, 100, "", "doctor"),
    enabled: open,
  });

  const freeBedOptions = rooms
    .filter((room) => room.is_active)
    .map((room) => ({
      label: `${room.name} xona (${roomTypeLabel(room.room_type)}) — ${money(room.daily_price)}/kun`,
      options: room.beds
        .filter((bed) => bed.is_active && !bed.occupant)
        .map((bed) => ({
          value: bed.id,
          label: `${room.name} xona, ${bed.name}-karavot`,
        })),
    }))
    .filter((group) => group.options.length > 0);

  const { mutate, isLoading } = useMutation(
    (values: any) =>
      AvitcenaAdmin.createAdmission({
        patient: patientId!,
        bed: values.bed,
        doctor: values.doctor || null,
        admitted_at: (values.admitted_at as Dayjs)?.toISOString(),
        reason: values.reason?.trim() || undefined,
      }),
    {
      onSuccess: (data) => {
        notify("success", "Bemor yotqizildi");
        onAdmitted(data.data);
      },
      onError: (error) =>
        notify("error", "Yotqizib bo'lmadi", apiErrorMessage(error, "Qaytadan urinib ko'ring")),
    }
  );

  return (
    <Modal
      title="Bemorni statsionarga yotqizish"
      open={open}
      onCancel={onClose}
      footer={false}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          if (!patientId) {
            notify("error", "Bemorni ro'yxatdan tanlang");
            return;
          }
          mutate(values);
        }}
      >
        <Form.Item label="Bemor" required>
          <AutoComplete
            value={patientInput}
            onChange={(v) => {
              setPatientInput(v);
              setPatientId(null);
            }}
            onSelect={(_v, option: any) => {
              setPatientId(option.patientId);
              setPatientInput(option.label);
            }}
            filterOption={false}
            notFoundContent={
              term.length < 2
                ? null
                : patientsFetching
                ? "Qidirilmoqda..."
                : "Bemor topilmadi"
            }
            options={(patientsData?.data || []).map((p) => ({
              value: p.id,
              patientId: p.id,
              label: `${p.last_name} ${p.first_name}`,
            }))}
          >
            <Input
              aria-label="Bemor"
              placeholder="Ism, telefon yoki AV- kodi"
              prefix={<LuSearch className="text-[#A9B2B8]" />}
            />
          </AutoComplete>
        </Form.Item>

        <Form.Item
          name="bed"
          label="Karavot"
          rules={[{ required: true, message: "Bo'sh karavotni tanlang" }]}
          extra={
            freeBedOptions.length === 0 ? (
              <span className="text-[#D4443F]">
                Bo'sh karavot yo'q. Avval "Xonalar va karavotlar" bo'limida
                xona qo'shing
              </span>
            ) : null
          }
        >
          <Select
            aria-label="Karavot"
            placeholder="Bo'sh karavotni tanlang"
            options={freeBedOptions}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item name="doctor" label="Davolovchi shifokor">
          <Select
            aria-label="Davolovchi shifokor"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Ixtiyoriy"
            options={(doctorsData?.data || []).map((d: any) => ({
              value: d.id,
              label: d.fio,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="admitted_at"
          label="Yotqizilgan vaqt"
          rules={[{ required: true, message: "Vaqtni tanlang" }]}
        >
          <DatePicker showTime format="DD.MM.YYYY HH:mm" className="!w-full" />
        </Form.Item>

        <Form.Item name="reason" label="Yotqizish sababi (tashxis)">
          <Input.TextArea rows={3} placeholder="Masalan: O'tkir pnevmoniya" />
        </Form.Item>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-[40px] rounded-[8px] bg-[#0D9488] text-white font-[500] cursor-pointer disabled:opacity-70"
        >
          {isLoading ? "Saqlanmoqda..." : "Yotqizish"}
        </button>
      </Form>
    </Modal>
  );
}

// ========================= Yotqizish tafsilotlari =========================

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-[#E8E8E8] rounded-[10px] p-4 mb-4">
      <h4 className="font-[600] text-[14px] mb-3">{title}</h4>
      {children}
    </div>
  );
}

function AdmissionDrawer({
  admissionId,
  onClose,
  rooms,
  notify,
}: {
  admissionId: string | null;
  onClose: () => void;
  rooms: InpatientRoom[];
  notify: Notify;
}) {
  const queryClient = useQueryClient();
  const role = SecureStorage.getItem("role") as string | null;
  const patientsBase = role === "registrator" ? "/register/patients" : "/patients";

  const [noteText, setNoteText] = useState("");
  const [serviceId, setServiceId] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [serviceDate, setServiceDate] = useState<Dayjs>(dayjs());
  const [transferBed, setTransferBed] = useState<string | undefined>();
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [dischargeForm] = Form.useForm();

  useEffect(() => {
    setNoteText("");
    setServiceId(undefined);
    setQuantity(1);
    setTransferBed(undefined);
  }, [admissionId]);

  const { data, isLoading } = useQuery({
    queryKey: ["admission", admissionId],
    queryFn: () => AvitcenaAdmin.getAdmission(admissionId!),
    enabled: !!admissionId,
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services", "inpatient"],
    queryFn: () => AvitcenaAdmin.getServices(1, 100),
    enabled: !!admissionId,
  });

  const admission = data?.data;
  const isActive = admission?.status === "active";

  const serviceTree = (servicesData?.data || []).map((category) => ({
    value: category.id,
    title: category.name,
    selectable: false,
    children: category.services.map((service) => ({
      value: service.id,
      title: `${service.name} — ${money(service.price)}`,
    })),
  }));

  const transferOptions = rooms
    .filter((room) => room.is_active)
    .map((room) => ({
      label: `${room.name} xona (${roomTypeLabel(room.room_type)})`,
      options: room.beds
        .filter((bed) => bed.is_active && !bed.occupant)
        .map((bed) => ({ value: bed.id, label: `${room.name} xona, ${bed.name}-karavot` })),
    }))
    .filter((group) => group.options.length > 0);

  const applyResult = (result: { data: AdmissionDetail }) => {
    queryClient.setQueryData(["admission", admissionId], result);
    queryClient.invalidateQueries(["admissions"]);
    queryClient.invalidateQueries(["inpatientRooms"]);
  };

  const onError = (fallback: string) => (error: unknown) =>
    notify("error", "Saqlab bo'lmadi", apiErrorMessage(error, fallback));

  const noteMutation = useMutation(() => AvitcenaAdmin.addAdmissionNote(admissionId!, noteText.trim()), {
    onSuccess: (result) => {
      applyResult(result);
      setNoteText("");
      notify("success", "Yozuv qo'shildi");
    },
    onError: onError("Yozuvni saqlab bo'lmadi"),
  });

  const serviceMutation = useMutation(
    () =>
      AvitcenaAdmin.addAdmissionService(admissionId!, {
        service: serviceId!,
        quantity,
        date: serviceDate.format("YYYY-MM-DD"),
      }),
    {
      onSuccess: (result) => {
        applyResult(result);
        setServiceId(undefined);
        setQuantity(1);
        notify("success", "Muolaja qo'shildi");
      },
      onError: onError("Muolajani saqlab bo'lmadi"),
    }
  );

  const deleteServiceMutation = useMutation(
    (id: string) => AvitcenaAdmin.deleteAdmissionService(admissionId!, id),
    { onSuccess: applyResult, onError: onError("Muolajani o'chirib bo'lmadi") }
  );

  const transferMutation = useMutation(
    () => AvitcenaAdmin.updateAdmission(admissionId!, { bed: transferBed }),
    {
      onSuccess: (result) => {
        applyResult(result);
        setTransferBed(undefined);
        notify("success", "Bemor boshqa karavotga o'tkazildi");
      },
      onError: onError("Ko'chirib bo'lmadi"),
    }
  );

  const dischargeMutation = useMutation(
    (values: any) =>
      AvitcenaAdmin.dischargeAdmission(admissionId!, {
        discharged_at: (values.discharged_at as Dayjs)?.toISOString(),
        discharge_diagnosis: values.discharge_diagnosis?.trim() || "",
        discharge_notes: values.discharge_notes?.trim() || "",
      }),
    {
      onSuccess: (result) => {
        applyResult(result);
        setDischargeOpen(false);
        notify("success", "Bemor chiqarildi", `Jami hisob: ${money(result.data.bill.total)}`);
      },
      onError: onError("Chiqarib bo'lmadi"),
    }
  );

  return (
    <Drawer
      open={!!admissionId}
      onClose={onClose}
      width={680}
      title={admission ? admission.patient.fio : "Statsionar"}
      extra={
        admission && (
          <span
            className={`px-2.5 py-1 rounded-full text-[12px] font-[600] ${
              isActive ? "bg-[#E9FBF4] text-[#0D9488]" : "bg-[#F1F5F4] text-[#64727B]"
            }`}
          >
            {isActive ? "Yotibdi" : "Chiqarilgan"}
          </span>
        )
      }
    >
      {isLoading || !admission ? (
        <div className="flex justify-center py-16">
          <Spin indicator={<LoadingOutlined spin />} size="large" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4 text-[13px]">
            <Info label="Bemor">
              <Link to={`${patientsBase}/${admission.patient.id}`} className="text-[#2A81D8]">
                {admission.patient.fio}
              </Link>
              <span className="block text-[#8F99A3]">
                {[admission.patient.code, admission.patient.phone].filter(Boolean).join(" • ")}
              </span>
            </Info>
            <Info label="Xona va karavot">
              {admission.room} xona, {admission.bed}-karavot{" "}
              <RoomTypeBadge type={admission.room_type} />
            </Info>
            <Info label="Davolovchi shifokor">{admission.doctor || "Belgilanmagan"}</Info>
            <Info label="Yotqizgan xodim">{admission.created_by || "—"}</Info>
            <Info label="Yotqizilgan">{formatDateTime(admission.admitted_at)}</Info>
            <Info label="Chiqarilgan">{formatDateTime(admission.discharged_at)}</Info>
          </div>

          {admission.reason && (
            <Section title="Yotqizish sababi">
              <p className="text-[13px] text-[#44525C] whitespace-pre-wrap">{admission.reason}</p>
            </Section>
          )}

          {!isActive && (admission.discharge_diagnosis || admission.discharge_notes) && (
            <Section title="Chiqarish">
              {admission.discharge_diagnosis && (
                <p className="text-[13px] mb-1">
                  <b>Yakuniy tashxis:</b> {admission.discharge_diagnosis}
                </p>
              )}
              {admission.discharge_notes && (
                <p className="text-[13px] whitespace-pre-wrap">
                  <b>Tavsiyalar:</b> {admission.discharge_notes}
                </p>
              )}
            </Section>
          )}

          <Section title={isActive ? "Hozirgi hisob" : "Yakuniy hisob"}>
            <div className="flex flex-col gap-1.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#64727B]">
                  Yotish: {admission.bill.days} kun × {money(admission.bill.daily_price)}
                </span>
                <span>{money(admission.bill.stay_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64727B]">Muolajalar</span>
                <span>{money(admission.bill.services_total)}</span>
              </div>
              <div className="flex justify-between border-t border-[#F0F2F3] pt-2 font-[700] text-[15px]">
                <span>Jami</span>
                <span>{money(admission.bill.total)}</span>
              </div>
              {isActive && (
                <p className="text-[11px] text-[#8F99A3]">
                  Kelgan kun hisoblanadi, ketgan kun hisoblanmaydi. Yotish summasi
                  har kuni oshib boradi.
                </p>
              )}
            </div>
          </Section>

          <Section title="Muolajalar">
            {isActive && (
              <div className="flex flex-wrap gap-2 mb-3">
                <TreeSelect
                  aria-label="Muolaja"
                  value={serviceId}
                  onChange={setServiceId}
                  treeData={serviceTree}
                  treeDefaultExpandAll
                  showSearch
                  treeNodeFilterProp="title"
                  placeholder="Xizmatni tanlang"
                  className="!min-w-[240px] flex-1"
                />
                <InputNumber
                  aria-label="Soni"
                  min={1}
                  value={quantity}
                  onChange={(v) => setQuantity(v || 1)}
                  className="!w-[80px]"
                />
                <DatePicker
                  aria-label="Muolaja sanasi"
                  value={serviceDate}
                  onChange={(v) => v && setServiceDate(v)}
                  allowClear={false}
                  format="DD.MM.YYYY"
                  className="!w-[130px]"
                />
                <button
                  onClick={() => serviceMutation.mutate()}
                  disabled={!serviceId || serviceMutation.isLoading}
                  className="px-4 h-[32px] rounded-[6px] bg-[#0D9488] text-white text-[13px] cursor-pointer disabled:opacity-50"
                >
                  Qo'shish
                </button>
              </div>
            )}
            {admission.services.length === 0 ? (
              <p className="text-[13px] text-[#8F99A3]">Hali muolaja qo'shilmagan</p>
            ) : (
              <table className="w-full text-[13px]">
                <tbody>
                  {admission.services.map((item) => (
                    <tr key={item.id} className="border-b border-[#F7F8F9] last:border-none">
                      <td className="py-1.5">
                        {item.name}
                        <span className="block text-[11px] text-[#8F99A3]">
                          {dayjs(item.date).format("DD.MM.YYYY")} · {item.quantity} ×{" "}
                          {money(item.price)}
                        </span>
                      </td>
                      <td className="py-1.5 text-right font-[600]">{money(item.total)}</td>
                      {isActive && (
                        <td className="py-1.5 w-[36px] text-right">
                          <Popconfirm
                            title="Muolajani o'chirish"
                            okText="Ha"
                            cancelText="Yo'q"
                            onConfirm={() => deleteServiceMutation.mutate(item.id)}
                          >
                            <button
                              aria-label={`${item.name} muolajasini o'chirish`}
                              className="w-[28px] h-[28px] inline-flex items-center justify-center rounded-[6px] text-[#E24C4C] hover:bg-[#FDEDED] cursor-pointer"
                            >
                              <FiTrash2 />
                            </button>
                          </Popconfirm>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Kundalik yozuvlar">
            {isActive && (
              <div className="mb-3">
                <Input.TextArea
                  aria-label="Kundalik yozuv"
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Bemorning bugungi ahvoli, harorat, berilgan dorilar..."
                />
                <button
                  onClick={() => noteMutation.mutate()}
                  disabled={!noteText.trim() || noteMutation.isLoading}
                  className="mt-2 px-4 h-[32px] rounded-[6px] bg-[#0D9488] text-white text-[13px] cursor-pointer disabled:opacity-50"
                >
                  Yozuvni saqlash
                </button>
              </div>
            )}
            {admission.notes.length === 0 ? (
              <p className="text-[13px] text-[#8F99A3]">Hali yozuv yo'q</p>
            ) : (
              admission.notes.map((note) => (
                <div key={note.id} className="border-l-[3px] border-[#0D9488] pl-3 mb-3">
                  <p className="text-[11px] text-[#8F99A3]">
                    {formatDateTime(note.created_at)} · {note.created_by || "—"}
                  </p>
                  <p className="text-[13px] whitespace-pre-wrap">{note.text}</p>
                </div>
              ))
            )}
          </Section>

          {isActive && (
            <Section title="Boshqa karavotga o'tkazish">
              <div className="flex flex-wrap gap-2">
                <Select
                  aria-label="Yangi karavot"
                  value={transferBed}
                  onChange={setTransferBed}
                  options={transferOptions}
                  placeholder={transferOptions.length ? "Bo'sh karavotni tanlang" : "Bo'sh karavot yo'q"}
                  className="!min-w-[240px] flex-1"
                />
                <button
                  onClick={() => transferMutation.mutate()}
                  disabled={!transferBed || transferMutation.isLoading}
                  className="px-4 h-[32px] rounded-[6px] border border-[#0D9488] text-[#0D9488] text-[13px] cursor-pointer disabled:opacity-50"
                >
                  O'tkazish
                </button>
              </div>
              <p className="text-[11px] text-[#8F99A3] mt-1">
                Kunlik narx yotqizilgandagi narxda qoladi.
              </p>
            </Section>
          )}

          {isActive && (
            <button
              onClick={() => {
                dischargeForm.resetFields();
                dischargeForm.setFieldsValue({ discharged_at: dayjs() });
                setDischargeOpen(true);
              }}
              className="w-full h-[42px] rounded-[8px] bg-[#E5484D] hover:bg-[#D23E42] text-white font-[500] cursor-pointer"
            >
              Bemorni chiqarish
            </button>
          )}

          <Modal
            title="Bemorni chiqarish"
            open={dischargeOpen}
            onCancel={() => setDischargeOpen(false)}
            footer={false}
          >
            <Form form={dischargeForm} layout="vertical" onFinish={(v) => dischargeMutation.mutate(v)}>
              <Form.Item
                name="discharged_at"
                label="Chiqish vaqti"
                rules={[{ required: true, message: "Vaqtni tanlang" }]}
              >
                <DatePicker showTime format="DD.MM.YYYY HH:mm" className="!w-full" />
              </Form.Item>
              <Form.Item name="discharge_diagnosis" label="Yakuniy tashxis">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="discharge_notes" label="Tavsiyalar">
                <Input.TextArea rows={3} placeholder="Uyda davolanish, keyingi ko'rik..." />
              </Form.Item>
              <p className="text-[12px] text-[#8F99A3] mb-3">
                Chiqarilgandan keyin hisob yopiladi: muolaja va yozuv qo'shib bo'lmaydi.
              </p>
              <button
                type="submit"
                disabled={dischargeMutation.isLoading}
                className="w-full h-[40px] rounded-[8px] bg-[#E5484D] text-white font-[500] cursor-pointer disabled:opacity-70"
              >
                {dischargeMutation.isLoading ? "Saqlanmoqda..." : "Chiqarish"}
              </button>
            </Form>
          </Modal>
        </>
      )}
    </Drawer>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-[#8F99A3]">{label}</p>
      <div className="font-[500]">{children}</div>
    </div>
  );
}

// ========================= Xona qo'shish / tahrirlash =========================

function RoomModal({
  room,
  open,
  onClose,
  notify,
}: {
  room: InpatientRoom | null;
  open: boolean;
  onClose: () => void;
  notify: Notify;
}) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(
        room
          ? {
              name: room.name,
              room_type: room.room_type,
              daily_price: room.daily_price,
              is_active: room.is_active,
            }
          : { room_type: "standard", bed_count: 2, daily_price: 0, is_active: true }
      );
    }
  }, [open, room]);

  const { mutate, isLoading } = useMutation(
    (values: any) =>
      room
        ? AvitcenaAdmin.updateRoom(room.id, {
            name: values.name,
            room_type: values.room_type,
            daily_price: values.daily_price,
            is_active: values.is_active,
          })
        : AvitcenaAdmin.createRoom({
            name: values.name,
            room_type: values.room_type,
            daily_price: values.daily_price,
            bed_count: values.bed_count,
          }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["inpatientRooms"]);
        notify("success", room ? "Xona saqlandi" : "Xona qo'shildi");
        onClose();
      },
      onError: (error) =>
        notify("error", "Saqlab bo'lmadi", apiErrorMessage(error, "Qaytadan urinib ko'ring")),
    }
  );

  return (
    <Modal title={room ? "Xonani tahrirlash" : "Xona qo'shish"} open={open} onCancel={onClose} footer={false}>
      <Form form={form} layout="vertical" onFinish={(v) => mutate(v)}>
        <Form.Item
          name="name"
          label="Xona nomi yoki raqami"
          rules={[{ required: true, whitespace: true, message: "Xona nomini kiriting" }]}
        >
          <Input placeholder="Masalan: 101 yoki VIP-1" />
        </Form.Item>
        <Form.Item
          name="room_type"
          label="Xona turi"
          rules={[{ required: true, message: "Xona turini tanlang" }]}
        >
          <Select aria-label="Xona turi" options={ROOM_TYPES} />
        </Form.Item>
        <Form.Item
          name="daily_price"
          label="Bir kunlik narx (so'm)"
          rules={[{ required: true, message: "Narxni kiriting" }]}
          extra={room ? "Yangi narx faqat bundan keyin yotqiziladiganlarga qo'llanadi" : undefined}
        >
          <InputNumber<number>
            min={0}
            className="!w-full"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
            parser={(value) => Number((value || "").replace(/\s/g, ""))}
          />
        </Form.Item>
        {room ? (
          <Form.Item name="is_active" label="Faol" valuePropName="checked">
            <Switch />
          </Form.Item>
        ) : (
          <Form.Item name="bed_count" label="Karavotlar soni">
            <InputNumber min={0} max={50} className="!w-full" />
          </Form.Item>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-[40px] rounded-[8px] bg-[#0D9488] text-white font-[500] cursor-pointer disabled:opacity-70"
        >
          {isLoading ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </Form>
    </Modal>
  );
}

// ========================= Sahifa =========================

export default function Statsionar() {
  const queryClient = useQueryClient();
  const [notifApi, contextHolder] = notification.useNotification();
  const isAdmin = SecureStorage.getItem("role") === "admin";

  const notify: Notify = (type, message, description) =>
    notifApi[type]({ message, description });

  const [tab, setTab] = useState<Tab>("active");
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomType | "">("");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [admitOpen, setAdmitOpen] = useState(false);
  const [admitBedId, setAdmitBedId] = useState<string | undefined>();
  const [openAdmissionId, setOpenAdmissionId] = useState<string | null>(null);
  const [roomModal, setRoomModal] = useState<{ open: boolean; room: InpatientRoom | null }>({
    open: false,
    room: null,
  });

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ["inpatientRooms"],
    queryFn: () => AvitcenaAdmin.getRooms(),
  });

  const rooms = roomsData?.data || [];
  const shownRooms = roomTypeFilter
    ? rooms.filter((room) => room.room_type === roomTypeFilter)
    : rooms;

  const { data: admissionsData, isLoading: admissionsLoading } = useQuery({
    queryKey: ["admissions", tab, search, page],
    queryFn: () =>
      AvitcenaAdmin.getAdmissions({
        status: tab === "discharged" ? "discharged" : "active",
        search,
        page,
        per_page: perPage,
      }),
    enabled: tab !== "rooms",
    keepPreviousData: true,
  });

  const stats = useMemo(() => {
    const beds = rooms.filter((r) => r.is_active).flatMap((r) => r.beds.filter((b) => b.is_active));
    const occupied = beds.filter((b) => b.occupant).length;
    return { total: beds.length, occupied, free: beds.length - occupied };
  }, [rooms]);

  const refreshRooms = () => queryClient.invalidateQueries(["inpatientRooms"]);

  const bedMutation = useMutation(
    (action: () => Promise<unknown>) => action(),
    {
      onSuccess: refreshRooms,
      onError: (error) =>
        notify("error", "Saqlab bo'lmadi", apiErrorMessage(error, "Qaytadan urinib ko'ring")),
    }
  );

  const openAdmit = (bedId?: string) => {
    setAdmitBedId(bedId);
    setAdmitOpen(true);
  };

  const addBed = (room: InpatientRoom) => {
    let name = String(room.beds.length + 1);
    Modal.confirm({
      title: `${room.name} xonaga karavot qo'shish`,
      content: (
        <Input
          aria-label="Karavot nomi"
          defaultValue={name}
          onChange={(e) => (name = e.target.value)}
          placeholder="Karavot raqami"
        />
      ),
      okText: "Qo'shish",
      cancelText: "Bekor qilish",
      onOk: () => bedMutation.mutateAsync(() => AvitcenaAdmin.createBed(room.id, { name })),
    });
  };

  const admissions: AdmissionListItem[] = admissionsData?.data || [];

  return (
    <div className="pr-[10px] md:pr-auto">
      {contextHolder}

      <div className="flex md:flex-row flex-col md:items-center items-start justify-between gap-3 mt-[30px] mb-4">
        <div>
          <h1 className="md:text-[22px] text-[18px] font-[600]">Statsionar</h1>
          <p className="text-[14px] md:text-[16px] text-[#8F99A3]">
            Yotgan bemorlar, xonalar va karavotlar
          </p>
        </div>
        <button
          onClick={() => openAdmit()}
          className="flex items-center gap-2 py-2.5 px-4 rounded-md text-white bg-[#0D9488] hover:shadow-md cursor-pointer text-[14px]"
        >
          <FiPlus /> Bemorni yotqizish
        </button>
      </div>

      <div className="grid md:grid-cols-3 grid-cols-1 gap-3 mb-4">
        {[
          { label: "Jami karavot", value: stats.total },
          { label: "Band", value: stats.occupied },
          { label: "Bo'sh", value: stats.free },
        ].map((card) => (
          <div key={card.label} className="border bg-white border-[#E8E8E8] rounded-[10px] px-4 py-3">
            <p className="text-[12px] text-[#8F99A3]">{card.label}</p>
            <p className="text-[22px] font-[700]">{roomsLoading ? "—" : card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 flex-wrap border-b border-[#ECEFF1] mb-4">
        {(
          [
            { key: "active", label: "Yotgan bemorlar" },
            { key: "rooms", label: "Xonalar va karavotlar" },
            { key: "discharged", label: "Chiqarilganlar" },
          ] as { key: Tab; label: string }[]
        ).map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setTab(item.key);
              setPage(1);
            }}
            className={`px-3 py-2 text-[14px] font-[500] border-b-2 -mb-[1px] cursor-pointer ${
              tab === item.key
                ? "border-[#0D9488] text-[#0D9488]"
                : "border-transparent text-[#8F99A3] hover:text-[#44525C]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "rooms" ? (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {isAdmin && (
              <button
                onClick={() => setRoomModal({ open: true, room: null })}
                className="flex items-center gap-1.5 px-3.5 h-[36px] rounded-[8px] border border-[#0D9488] text-[#0D9488] text-[13px] cursor-pointer"
              >
                <FiPlus /> Xona qo'shish
              </button>
            )}
            {[{ value: "" as const, label: "Barchasi" }, ...ROOM_TYPES].map((option) => (
              <button
                key={option.value}
                onClick={() => setRoomTypeFilter(option.value)}
                className={`px-3 h-[36px] border border-[#eaeaea] rounded-[6px] text-[13px] cursor-pointer ${
                  roomTypeFilter === option.value ? "bg-[#0D9488] text-white" : "text-black"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {roomsLoading ? (
            <div className="flex justify-center py-16">
              <Spin indicator={<LoadingOutlined spin />} size="large" />
            </div>
          ) : shownRooms.length === 0 && rooms.length > 0 ? (
            <Empty description={`${roomTypeLabel(roomTypeFilter as RoomType)} xona yo'q`} />
          ) : rooms.length === 0 ? (
            <Empty
              description={
                isAdmin
                  ? "Hali xona yo'q. \"Xona qo'shish\" tugmasi bilan boshlang"
                  : "Hali xona yo'q. Xonalarni admin qo'shadi"
              }
            />
          ) : (
            <div className="grid xl:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-3">
              {shownRooms.map((room) => (
                <div
                  key={room.id}
                  className={`border bg-white border-[#E8E8E8] rounded-[10px] p-4 ${
                    room.is_active ? "" : "opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-[600] text-[16px]">
                        {room.name} xona <RoomTypeBadge type={room.room_type} />{" "}
                        {!room.is_active && (
                          <span className="text-[11px] font-[500] text-[#8F99A3]">(nofaol)</span>
                        )}
                      </h3>
                      <p className="text-[12px] text-[#8F99A3]">{money(room.daily_price)} / kun</p>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          aria-label={`${room.name} xonani tahrirlash`}
                          title="Tahrirlash"
                          onClick={() => setRoomModal({ open: true, room })}
                          className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] border border-[#E0E6EB] cursor-pointer"
                        >
                          <FiEdit2 />
                        </button>
                        <Popconfirm
                          title="Xonani o'chirish"
                          description="Xona va uning karavotlari o'chiriladi"
                          okText="Ha"
                          cancelText="Yo'q"
                          onConfirm={() =>
                            bedMutation.mutate(() => AvitcenaAdmin.deleteRoom(room.id))
                          }
                        >
                          <button
                            aria-label={`${room.name} xonani o'chirish`}
                            title="O'chirish"
                            className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] border border-[#FDEDED] text-[#E24C4C] cursor-pointer"
                          >
                            <FiTrash2 />
                          </button>
                        </Popconfirm>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {room.beds.map((bed) => {
                      if (bed.occupant) {
                        return (
                          <button
                            key={bed.id}
                            onClick={() => setOpenAdmissionId(bed.occupant!.admission_id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-[#0D9488] text-white text-[12px] cursor-pointer"
                            title="Yotqizish tafsilotlari"
                          >
                            <LuBedDouble /> {bed.name}: {bed.occupant.patient_fio}
                          </button>
                        );
                      }

                      const usable = bed.is_active && room.is_active;
                      const items = [
                        ...(usable ? [{ key: "admit", label: "Bemor yotqizish" }] : []),
                        ...(isAdmin
                          ? [
                              {
                                key: "toggle",
                                label: bed.is_active ? "Nofaol qilish" : "Faollashtirish",
                              },
                              { key: "delete", label: "O'chirish", danger: true },
                            ]
                          : []),
                      ];

                      return (
                        <Dropdown
                          key={bed.id}
                          trigger={["click"]}
                          disabled={items.length === 0}
                          menu={{
                            items,
                            onClick: ({ key }) => {
                              if (key === "admit") openAdmit(bed.id);
                              if (key === "toggle")
                                bedMutation.mutate(() =>
                                  AvitcenaAdmin.updateBed(bed.id, { is_active: !bed.is_active })
                                );
                              if (key === "delete")
                                bedMutation.mutate(() => AvitcenaAdmin.deleteBed(bed.id));
                            },
                          }}
                        >
                          <button
                            aria-label={`${room.name} xona, ${bed.name}-karavot`}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] border border-dashed text-[12px] cursor-pointer ${
                              usable
                                ? "border-[#0D9488] text-[#0D9488]"
                                : "border-[#C7CED3] text-[#8F99A3]"
                            }`}
                          >
                            <LuBedDouble /> {bed.name}: {usable ? "bo'sh" : "nofaol"}
                          </button>
                        </Dropdown>
                      );
                    })}
                    {isAdmin && (
                      <button
                        aria-label={`${room.name} xonaga karavot qo'shish`}
                        onClick={() => addBed(room)}
                        className="px-2.5 py-1.5 rounded-[8px] border border-[#E0E6EB] text-[12px] text-[#64727B] cursor-pointer"
                      >
                        + karavot
                      </button>
                    )}
                    {room.beds.length === 0 && !isAdmin && (
                      <span className="text-[12px] text-[#8F99A3]">Karavot yo'q</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            allowClear
            aria-label="Statsionarni qidirish"
            prefix={<LuSearch className="text-[#A9B2B8] mr-1" />}
            placeholder="Bemor, telefon, xona yoki shifokor..."
            className="md:!w-[320px] !h-[40px] !mb-3"
          />

          {admissionsLoading ? (
            <div className="flex justify-center py-16">
              <Spin indicator={<LoadingOutlined spin />} size="large" />
            </div>
          ) : admissions.length === 0 ? (
            <div className="px-6 py-10 border border-[#E0E6EB] rounded-[10px] bg-white text-center text-[#8F99A3]">
              {search
                ? `"${search}" bo'yicha topilmadi`
                : tab === "active"
                ? "Hozir statsionarda bemor yo'q"
                : "Hali chiqarilgan bemor yo'q"}
            </div>
          ) : (
            admissions.map((item) => (
              <button
                key={item.id}
                onClick={() => setOpenAdmissionId(item.id)}
                className="w-full text-left px-5 py-4 border border-[#E0E6EB] bg-white rounded-[10px] mb-3 flex flex-wrap items-center justify-between gap-3 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-[220px]">
                  <span className="w-[42px] h-[42px] rounded-full bg-[#E9FBF4] text-[#0D9488] flex items-center justify-center text-[20px]">
                    <LuBedDouble />
                  </span>
                  <div>
                    <p className="font-[600] text-[15px]">{item.patient.fio}</p>
                    <p className="text-[12px] text-[#8F99A3]">
                      {item.room} xona, {item.bed}-karavot ({roomTypeLabel(item.room_type)})
                      {item.doctor ? ` · ${item.doctor}` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-[13px] text-[#44525C]">
                  <p>Kelgan: {formatDateTime(item.admitted_at)}</p>
                  {item.discharged_at && <p>Ketgan: {formatDateTime(item.discharged_at)}</p>}
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-[#8F99A3]">
                    {item.status === "active" ? `${item.days}-kun` : `${item.days} kun yotdi`}
                  </p>
                  <p className="font-[700] text-[15px]">{money(item.total)}</p>
                </div>
              </button>
            ))
          )}

          {(admissionsData?.meta?.total_items ?? 0) > perPage && (
            <div className="flex justify-end mt-2">
              <Pagination
                current={page}
                pageSize={perPage}
                total={admissionsData?.meta.total_items}
                onChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      <AdmitModal
        open={admitOpen}
        onClose={() => setAdmitOpen(false)}
        rooms={rooms}
        initialBedId={admitBedId}
        notify={notify}
        onAdmitted={(admission) => {
          setAdmitOpen(false);
          queryClient.invalidateQueries(["admissions"]);
          refreshRooms();
          setOpenAdmissionId(admission.id);
        }}
      />

      <AdmissionDrawer
        admissionId={openAdmissionId}
        onClose={() => setOpenAdmissionId(null)}
        rooms={rooms}
        notify={notify}
      />

      <RoomModal
        open={roomModal.open}
        room={roomModal.room}
        onClose={() => setRoomModal({ open: false, room: null })}
        notify={notify}
      />
    </div>
  );
}
