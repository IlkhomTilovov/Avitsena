import {
  AutoComplete,
  DatePicker,
  Form,
  Input,
  notification,
  Select,
  Spin,
  TreeSelect,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { OneMedAdmin } from "../queries/query";
import { LoadingOutlined, CheckCircleFilled } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { FiUpload, FiCamera } from "react-icons/fi";
import {
  LuUser,
  LuCalendar,
  LuMapPin,
  LuRuler,
  LuWeight,
  LuDroplet,
  LuIdCard,
  LuBookUser,
  LuFileText,
  LuInfo,
  LuHash,
  LuPhone,
} from "react-icons/lu";
import { BsGenderMale, BsGenderFemale } from "react-icons/bs";

import "../App.css";

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

function GenderToggle({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (val: string) => void;
}) {
  const options = [
    { value: "male", label: "Erkak", icon: BsGenderMale, color: "#2D6FE0" },
    { value: "female", label: "Ayol", icon: BsGenderFemale, color: "#D6468A" },
  ];
  return (
    <div className="flex items-center gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange?.(opt.value)}
          className={`flex-1 flex items-center justify-center gap-2 h-[40px] rounded-[8px] border text-[14px] font-[500] cursor-pointer transition-colors ${
            value === opt.value
              ? "border-[#0D9488] bg-[#E9FBF4] text-[#0D9488]"
              : "border-[#E0E6EB] text-[#44525C] hover:bg-[#F9FAFB]"
          }`}
        >
          <span
            className="flex items-center justify-center w-[18px] h-[18px] rounded-full text-[11px]"
            style={{
              backgroundColor: value === opt.value ? "#fff" : `${opt.color}1A`,
              color: opt.color,
            }}
          >
            <opt.icon />
          </span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function BloodGroupGrid({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (val: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
      {BLOOD_GROUPS.map((bg) => (
        <button
          key={bg}
          type="button"
          onClick={() => onChange?.(bg)}
          className={`flex items-center justify-center gap-1 h-[40px] rounded-[8px] border text-[13px] font-[600] cursor-pointer transition-colors ${
            value === bg
              ? "border-[#E24C4C] bg-[#FDEDED] text-[#E24C4C]"
              : "border-[#E0E6EB] text-[#44525C] hover:bg-[#F9FAFB]"
          }`}
        >
          <LuDroplet className="text-[12px]" />
          {bg}
        </button>
      ))}
    </div>
  );
}

const DOCUMENT_TYPES = [
  { value: "idcard", label: "ID karta", icon: LuIdCard },
  { value: "pasport", label: "Pasport", icon: LuBookUser },
  { value: "driver_license", label: "Guvohnoma", icon: LuFileText },
];

function DocumentTypeToggle({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (val: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {DOCUMENT_TYPES.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange?.(opt.value)}
          className={`flex items-center justify-center gap-1.5 h-[40px] rounded-[8px] border text-[13px] font-[500] cursor-pointer transition-colors ${
            value === opt.value
              ? "border-[#0D9488] bg-[#E9FBF4] text-[#0D9488]"
              : "border-[#E0E6EB] text-[#44525C] hover:bg-[#F9FAFB]"
          }`}
        >
          <opt.icon className="text-[14px]" />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const BMI_MIN = 15;
const BMI_MAX = 35;

function BmiBar({ value }: { value: number | null }) {
  const markerPct =
    value != null
      ? Math.min(100, Math.max(0, ((value - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100))
      : 0;
  return (
    <div>
      <div className="relative h-[8px] rounded-full overflow-hidden flex">
        <div className="flex-[3.5]" style={{ backgroundColor: "#6AA9F4" }} />
        <div className="flex-[6.5]" style={{ backgroundColor: "#3FC98B" }} />
        <div className="flex-[5]" style={{ backgroundColor: "#F5C344" }} />
        <div className="flex-[5]" style={{ backgroundColor: "#EF6F6C" }} />
        <div
          className="absolute top-1/2 h-[14px] w-[3px] rounded-full bg-[#1A2430]"
          style={{
            left: `${markerPct}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[#8F99A3] mt-1.5">
        <span>Ozg'in &lt;18.5</span>
        <span>Normal</span>
        <span>Ortiqcha 25+</span>
        <span>Semizlik 30+</span>
      </div>
    </div>
  );
}

// ------- Types ---------
type pasport = {
  series: string;
  number: string;
  jshr: string;
  issued_by: string;
  issued_date: Dayjs;
  expiry_date: Dayjs;
};
type driver = {
  number: string;
  jshr: string;
};
type sendResponseValuesType = {
  first_name: string;
  middle_name: string;
  last_name: string;
  phone: string;
  document_type: string;
  pasport?: pasport;
  idcard?: pasport;
  driver_license?: driver;
  gender: string;
  date_of_birth: Dayjs;
  blood_group: string;
  country: string;
  height: number;
  weight: number;
};
// Servis modeli
type Service = {
  id: string;
  name: string;
  price: number;
};

export type PatientOption = {
  key: string;
  value: string;
  label: React.ReactNode;
};
type Document = {
  series: string;
  number: string;
  jshr: string;
  issued_by: string;
  issued_date: string;
  expiry_date: string;
};

type DriverLicense = {
  number: string;
  jshr: string;
};

export type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  phone: string;
  home_phone: string | null;
  gender: "male" | "female";
  blood_group: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  date_of_birth: string; // backend string qaytaradi
  country: string;
  region: string;
  address: string;
  height: number;
  weight: number;
  status: string;
  document_type: "pasport" | "idcard" | "driver_license";
  pasport: Document | null;
  idcard: Document | null;
  driver_license: DriverLicense | null;
  created_at: string;
  updated_at: string;
};
export type PatientSelectResponse = {
  success: boolean;
  data: Patient; // bunda date_of_birth, pasport.issued_date ham string edi
};

export type PatientResponse = {
  success: boolean;
  message: string;
  data: Patient;
};
export type PatientRequest = Omit<
  sendResponseValuesType,
  "date_of_birth" | "pasport" | "idcard"
> & {
  date_of_birth: string;
  pasport?: Omit<Document, "issued_date" | "expiry_date"> & {
    issued_date: string;
    expiry_date: string;
  };
  idcard?: Omit<Document, "issued_date" | "expiry_date"> & {
    issued_date: string;
    expiry_date: string;
  };
  driver_license?: DriverLicense;
};

export type Category = {
  id: string;
  name: string;
  services: Service[];
};
// ------- Component ---------
export default function Registration() {
  const [form] = Form.useForm();
  const [docType, setDocType] = useState("");
  const watchedValues = Form.useWatch([], form) as
    | Partial<sendResponseValuesType>
    | undefined;
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [isFormDisabled, setIsFormDisabled] = useState(false);

  // natification

  type NotificationType = "success" | "info" | "warning" | "error";

  const [api, contextHolder] = notification.useNotification();

  const openNotificationWithIcon = (
    type: NotificationType,
    message: string
  ) => {
    api[type]({
      message: "Notification Title",
      description: message,
    });
  };

  // Shifokor tanlaganda ID ni ushlab turadigan state
  const [handleSelectDoctorState, setHandleSelectDoctorState] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const obj = {
    doctor: handleSelectDoctorState,
    services: selectedServices,
  };

  // yangi tashrif
  const { mutate: addNewVisitMutate, isLoading: newVisitLoading } = useMutation<
    any,
    Error,
    string
  >(
    (id) =>
      OneMedAdmin.addNewVisit(id, {
        doctor: handleSelectDoctorState,
        services: selectedServices,
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["patient", obj]);
        setHandleSelectDoctorState("");
        form.resetFields();
        setSelectedPatientId(null);
        setSelectedServices([]);
        setIsFormDisabled(false);
        openNotificationWithIcon("success", "Bemorga doctor biriktirildi");
      },
      onError: (error) => {
        console.log(error);
      },
    }
  );

  // Yangi bemor qo‘shish
  // Saqlab, darhol qabulga yozish uchun bayroq
  const [pendingVisitAfterSave, setPendingVisitAfterSave] = useState(false);

  const { mutate: addPatientMutate, isLoading: addPatientLoading } =
    useMutation<PatientResponse, Error, PatientRequest>(
      (obj) => OneMedAdmin.addPatient(obj),
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries();

          if (pendingVisitAfterSave) {
            setSelectedPatientId(data.data.id);
            setIsFormDisabled(true);
            setPendingVisitAfterSave(false);
          } else {
            form.resetFields();
            setSelectedPatientId(null); // ✅ yangi ID saqlaymiz
            setIsFormDisabled(false); // yangi bemorda forma tahrirlanadi
          }
          openNotificationWithIcon("success", "Yangi bemor qo‘shildi");
        },
        onError: (err) => {
          setPendingVisitAfterSave(false);
          openNotificationWithIcon("error", err.message);
          // showMessage("Yangi bemor muvaffaqqiyatli qo'shildi!");
          // error("Xatolik yuz berdi!");
        },
      }
    );

  // Eski bemorni yangilash
  const { mutate: updatePatientMutate, isLoading: updatePatientLoading } =
    useMutation<PatientResponse, Error, { id: string; obj: PatientRequest }>(
      ({ id, obj }) => OneMedAdmin.updatePatient(id, obj),
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries();

          if (pendingVisitAfterSave) {
            setSelectedPatientId(data.data.id);
            setIsFormDisabled(true);
            setPendingVisitAfterSave(false);
          } else {
            form.resetFields();
            setIsFormDisabled(false);
            setSelectedPatientId(null);
          }
          openNotificationWithIcon("success", "Bemor yangilandi");
          // success("Bemor muvaffaqqiyatli yangilandi!");
        },
        onError: () => {
          setPendingVisitAfterSave(false);
          // error("Xatolik yuz berdi!");
        },
      }
    );

  // Submit qilganda POST/PUT aniqlash
  const handleSendPatientValues = (value: sendResponseValuesType) => {
    const object: PatientRequest = {
      ...value,
      phone: value.phone ? `+998${value.phone.replace(/^\+?998/, "")}` : "",
      date_of_birth: value.date_of_birth?.format("YYYY-MM-DD"),
      pasport: value.pasport
        ? {
            ...value.pasport,
            issued_date: value.pasport.issued_date?.format("YYYY-MM-DD"),
            expiry_date: value.pasport.expiry_date?.format("YYYY-MM-DD"),
          }
        : undefined,
      idcard: value.idcard
        ? {
            ...value.idcard,
            issued_date: value.idcard.issued_date?.format("YYYY-MM-DD"),
            expiry_date: value.idcard.expiry_date?.format("YYYY-MM-DD"),
          }
        : undefined,
    };

    if (selectedPatientId) {
      // Agar ID bor → update
      updatePatientMutate({ id: selectedPatientId, obj: object });
    } else {
      // Agar ID yo‘q → yangi create
      addPatientMutate(object);
    }
  };

  // Search
  const [options, setOptions] = useState<PatientOption[]>([]);
  const [value, setValue] = useState("");
  const { mutate: searchMutate } = useMutation<any, Error, string>(
    (search) => OneMedAdmin.searchPatient(search),
    {
      onSuccess: (data) => {
        const mapped = data.data.map((item: any) => ({
          key: item.id,
          value: item.first_name + " " + item.last_name,
          label: (
            <div key={item.id}>
              {item.first_name} {item.last_name}
            </div>
          ),
        }));
        setOptions(mapped);
      },
    }
  );

  const handleSearch = (text: string) => {
    setValue(text);
    if (text.trim() !== "") {
      searchMutate(text);
    } else {
      setOptions([]);
    }
  };

  // Select qilganda eski bemorni olish
  const { mutate: selectMutate } = useMutation<
    PatientSelectResponse,
    Error,
    string
  >((id: string) => OneMedAdmin.selectPatient(id), {
    onSuccess: (data) => {
      // setSelectedPatientId(data.data.id);
      setDocType(data.data.document_type);
      form.setFieldsValue({
        first_name: data.data.first_name,
        last_name: data.data.last_name,
        middle_name: data.data.middle_name,
        phone: data.data.phone
          ? data.data.phone.replace(/^\+?998/, "")
          : data.data.phone,
        gender: data.data.gender,
        blood_group: data.data.blood_group,
        document_type: data.data.document_type,
        country: data.data.country,
        region: data.data.region,
        address: data.data.address,
        height: data.data.height,
        weight: data.data.weight,
        date_of_birth: data.data.date_of_birth
          ? dayjs(data.data.date_of_birth)
          : null,
        pasport: data.data.pasport
          ? {
              series: data.data.pasport.series,
              number: data.data.pasport.number,
              jshr: data.data.pasport.jshr,
              issued_by: data.data.pasport.issued_by,
              issued_date: data.data.pasport.issued_date
                ? dayjs(data.data.pasport.issued_date)
                : null,
              expiry_date: data.data.pasport.expiry_date
                ? dayjs(data.data.pasport.expiry_date)
                : null,
            }
          : undefined,
        idcard: data.data.idcard
          ? {
              series: data.data.idcard.series,
              number: data.data.idcard.number,
              jshr: data.data.idcard.jshr,
              issued_by: data.data.idcard.issued_by,
              issued_date: data.data.idcard.issued_date
                ? dayjs(data.data.idcard.issued_date)
                : null,
              expiry_date: data.data.idcard.expiry_date
                ? dayjs(data.data.idcard.expiry_date)
                : null,
            }
          : undefined,
        driver_license: data.data.driver_license
          ? {
              number: data.data.driver_license.number,
              jshr: data.data.driver_license.jshr,
            }
          : undefined,
      });
    },
    onError: () => {
      // setSelectedPatientId(null);
      form.resetFields();
    },
  });

  const handleSelect = (val: string, option: any) => {
    setSelectedPatientId(option.key);
    setIsFormDisabled(true); // ✅ eski bemor bo‘lsa forma disable
    selectMutate(option.key);
    console.log(val);
  };

  const handleDoctorSubmit = () => {
    if (!selectedPatientId) {
      console.error("Avval bemorni qo'shing!");
      return;
    }

    addNewVisitMutate(selectedPatientId);
  };

  const handleDocType = (value: string) => {
    setDocType(value);
  };

  // Shifokor tanlaganda ID ni ushlab turadigan state

  // 3. Xodimlar (shifokorlar) ro‘yxati
  const { data: employeesData } = useQuery({
    queryKey: ["employees", 1, 20, "", "doctor"],
    queryFn: () => OneMedAdmin.getEmployeesFilter(1, 20, "", "doctor"),
    keepPreviousData: true,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // 4. Doktordan xizmatlar olish
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["services", handleSelectDoctorState],
    queryFn: () => OneMedAdmin.getServicesFromDoctor(handleSelectDoctorState),
    enabled: !!handleSelectDoctorState,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // Select uchun shifokor options
  const employeeOptions =
    employeesData?.data?.map((item: any) => ({
      value: item.id,
      label: item.fio,
    })) || [];

  // TreeSelect uchun service daraxti

  const treeData2 = categories
    ? categories.map((category: Category) => ({
        value: category.id,
        title: category.name,
        selectable: false,
        children: category.services.map((srv: Service) => ({
          value: srv.id,
          title: srv.name,
        })),
      }))
    : [];

  // if (addPatientLoading || updatePatientLoading) {
  //   return (
  //     <div className="absolute left-0 top-0 z-[9999] w-full h-screen flex justify-center items-center bg-white/20 backdrop:blur-2xl">
  //       <Spin indicator={<LoadingOutlined spin />} size="large" />
  //     </div>
  //   );
  // }

  // ------- Progress / derived values -------
  const requiredFieldsList = [
    watchedValues?.first_name,
    watchedValues?.last_name,
    watchedValues?.date_of_birth,
  ];
  const requiredFilledCount = requiredFieldsList.filter(Boolean).length;
  const requiredComplete = requiredFilledCount === requiredFieldsList.length;

  const computedAge = watchedValues?.date_of_birth
    ? dayjs().diff(dayjs(watchedValues.date_of_birth), "year")
    : null;

  const importantFieldsList = [
    watchedValues?.middle_name,
    watchedValues?.phone,
    watchedValues?.gender,
    watchedValues?.blood_group,
    watchedValues?.document_type,
  ];
  const importantFilledCount = importantFieldsList.filter(Boolean).length;
  const importantComplete = importantFilledCount === importantFieldsList.length;

  const heightNum = Number(watchedValues?.height);
  const weightNum = Number(watchedValues?.weight);
  const computedBmi =
    heightNum > 0 && weightNum > 0
      ? Number((weightNum / (heightNum / 100) ** 2).toFixed(1))
      : null;

  const overallPercent = Math.round(
    ((requiredFilledCount + importantFilledCount) /
      (requiredFieldsList.length + importantFieldsList.length)) *
      100
  );
  const currentStep = !requiredComplete ? 1 : !importantComplete ? 2 : 3;

  // Ctrl+Enter / Cmd+Enter orqali saqlash
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        form.submit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [form]);

  return (
    <div className="w-full flex justify-center py-2 flex-col pr-[10px] md:pr-auto ">
      {contextHolder}
      {/* Search */}
      <div className="border md:w-full w-full border-[#e3e3e3] rounded-[10px] px-6 py-4 mb-3 register">
        <Form form={form} className="flex items-center">
          <Form.Item name="search" className="!m-0 relative flex-1">
            <AutoComplete
              value={value}
              options={options}
              onSelect={handleSelect}
              onSearch={handleSearch}
              onChange={(data) => setValue(data)}
              placeholder="Bemor qidiring..."
              className="!w-full !h-[40px]"
              notFoundContent="Bemor topilmadi!"
            />
          </Form.Item>
          <button className="px-[30px] bg-[#2B7FFF] !h-[40px] rounded-l-[0px] rounded-md text-white font-[500] cursor-pointer">
            Izlash
          </button>
        </Form>
      </div>

      {/* Sarlavha va yordamchi tugmalar */}
      <div className="flex md:flex-row flex-col md:items-center items-start justify-between gap-3 mb-3">
        <div>
          <h1 className="text-[22px] font-[700]">
            {selectedPatientId
              ? "Bemor ma'lumotlarini yangilash"
              : "Yangi bemorni ro'yxatga olish"}
          </h1>
          <p className="text-[13px] text-[#8F99A3]">
            Ma'lumotlarni kiriting — bemor kartasi avtomatik yaratiladi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => alert("Excel'dan import tez orada qo'shiladi")}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border border-[#E0E6EB] text-[13px] font-[500] text-[#44525C] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
          >
            <FiUpload /> Excel'dan import
          </button>
          <button
            type="button"
            onClick={() => alert("Pasportni skanerlash tez orada qo'shiladi")}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border border-[#E0E6EB] text-[13px] font-[500] text-[#44525C] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
          >
            <FiCamera /> Pasportni skanerlash
          </button>
        </div>
      </div>

      {/* Progress stepper */}
      <div className="relative overflow-hidden rounded-[16px] bg-gradient-to-r from-[#0D9488] to-[#14B8A6] px-6 py-5 mb-4">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1200 110"
          preserveAspectRatio="none"
        >
          <polyline
            points="0,70 220,70 255,25 290,95 325,50 360,70 1200,70"
            fill="none"
            stroke="#fff"
            strokeOpacity="0.18"
            strokeWidth="2"
          />
        </svg>
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 md:gap-5">
            {[
              { step: 1, label: "Majburiy", hint: "3 ta maydon" },
              { step: 2, label: "Muhim", hint: "5 ta maydon" },
              { step: 3, label: "Qo'shimcha", hint: "Ixtiyoriy" },
            ].map((item, idx, arr) => (
              <div key={item.step} className="flex items-center gap-3 md:gap-5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-[34px] h-[34px] shrink-0 rounded-[10px] flex items-center justify-center text-[13px] font-[700] ${
                      currentStep === item.step
                        ? "bg-white text-[#0D9488]"
                        : "border border-white/50 text-white"
                    }`}
                  >
                    {item.step}
                  </span>
                  <div className="hidden sm:block">
                    <p className="text-[13px] font-[600] text-white leading-tight">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-white/70 leading-tight">
                      {item.hint}
                    </p>
                  </div>
                </div>
                {idx < arr.length - 1 && (
                  <span className="hidden md:block w-[50px] h-px bg-white/30" />
                )}
              </div>
            ))}
          </div>
          <div className="text-right">
            <p className="text-[11px] text-white/70">Forma to'ldirilishi</p>
            <p className="text-[22px] font-[700] text-white leading-tight">
              {overallPercent}%
            </p>
          </div>
        </div>
        <div className="relative mt-4 h-[5px] rounded-full bg-white/25 overflow-hidden">
          <div
            className="h-full rounded-full bg-white transition-all duration-300"
            style={{ width: `${Math.max(overallPercent, 2)}%` }}
          />
        </div>
      </div>

      {/* Forma */}
      <Form
        form={form}
        onFinish={handleSendPatientValues}
        layout="vertical"
        className="border md:w-full w-full border-[#e3e3e3] rounded-[20px]"
        disabled={isFormDisabled} // ✅ shu joyda disable
      >
        <div className="px-[24px] py-5">
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 md:col-span-3 flex md:flex-col flex-row items-start md:items-start gap-3">
              <span className="w-[44px] h-[44px] shrink-0 rounded-[14px] bg-[#E9FBF4] text-[#0D9488] text-[18px] flex items-center justify-center">
                <LuUser />
              </span>
              <div>
                <h3 className="text-[15px] font-[600]">Majburiy ma'lumotlar</h3>
                <p className="text-[11px] text-[#8F99A3] mt-0.5">
                  Bemorni tizimda aniqlash uchun zarur bo'lgan asosiy ma'lumotlar
                </p>
                {requiredComplete ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-[600] text-[#0D9488] bg-[#E9FBF4] px-2 py-1 rounded-full mt-2.5">
                    <CheckCircleFilled /> To'ldirildi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-[600] text-[#D4443F] bg-[#FDECEC] px-2 py-1 rounded-full mt-2.5">
                    {requiredFilledCount} / 3 to'ldirildi
                  </span>
                )}
              </div>
            </div>

            <div className="col-span-12 md:col-span-9 flex flex-col gap-4">
              {/* Bemor rasmi */}
              <div className="flex md:flex-row flex-col md:items-center items-start justify-between gap-3 border border-dashed border-[#BFE3DD] bg-[#F3FBF9] rounded-[12px] px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="w-[42px] h-[42px] shrink-0 rounded-[10px] bg-white border border-[#E0E6EB] flex items-center justify-center text-[#8F99A3] text-[18px]">
                    <FiCamera />
                  </span>
                  <div>
                    <p className="text-[13px] font-[600]">Bemor rasmi</p>
                    <p className="text-[11px] text-[#8F99A3]">
                      JPG yoki PNG, 5 MB gacha · ixtiyoriy
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => alert("Rasm yuklash tez orada qo'shiladi")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border border-[#E0E6EB] bg-white text-[12px] font-[500] text-[#44525C] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                  >
                    <FiUpload /> Yuklash
                  </button>
                  <button
                    type="button"
                    onClick={() => alert("Kamera orqali olish tez orada qo'shiladi")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border border-[#E0E6EB] bg-white text-[12px] font-[500] text-[#44525C] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                  >
                    <FiCamera /> Kamera
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-3">
                <Form.Item
                  name="first_name"
                  label="Ism"
                  rules={[{ required: true, message: "Ismni kiriting" }]}
                  className="md:col-span-2 col-span-6"
                >
                  <Input
                    autoFocus
                    placeholder="Ismini kiriting"
                    prefix={<LuUser className="text-[#8F99A3]" />}
                    className="w-full !h-[40px]"
                    suffix={
                      watchedValues?.first_name ? (
                        <CheckCircleFilled className="text-[#1DC981]" />
                      ) : null
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="last_name"
                  label="Familiya"
                  rules={[{ required: true, message: "Familyani kiriting" }]}
                  className="md:col-span-2 col-span-6"
                >
                  <Input
                    placeholder="Familiyasini kiriting"
                    prefix={<LuUser className="text-[#8F99A3]" />}
                    className="w-full  !h-[40px]"
                    suffix={
                      watchedValues?.last_name ? (
                        <CheckCircleFilled className="text-[#1DC981]" />
                      ) : null
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="date_of_birth"
                  label="Tug'ilgan sana"
                  rules={[{ required: true, message: "Tug'ilgan sanani kiriting" }]}
                  className="md:col-span-2 col-span-6"
                  extra={
                    <span className="flex items-center gap-1 text-[11px] text-[#0D9488]">
                      {computedAge !== null ? (
                        <>
                          <CheckCircleFilled /> {computedAge} yosh
                        </>
                      ) : (
                        <span className="flex items-center gap-1 text-[#8F99A3]">
                          <LuInfo /> Yosh avtomatik hisoblanadi
                        </span>
                      )}
                    </span>
                  }
                >
                  <DatePicker
                    className="w-full !h-[40px]"
                    placeholder="kk.oo.yyyy"
                    suffixIcon={<LuCalendar className="text-[#8F99A3]" />}
                  />
                </Form.Item>
              </div>
            </div>
          </div>
        </div>

        <div className="px-[24px] pb-5 border-t border-[#F0F2F3] pt-5">
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 md:col-span-3 flex md:flex-col flex-row items-start gap-3">
              <span className="w-[44px] h-[44px] shrink-0 rounded-[14px] bg-[#FEF3E6] text-[#D98A1B] text-[18px] flex items-center justify-center">
                <LuPhone />
              </span>
              <div>
                <h3 className="text-[15px] font-[600]">Muhim ma'lumotlar</h3>
                <p className="text-[11px] text-[#8F99A3] mt-0.5">
                  Bog'lanish, jins, qon guruhi va shaxsni tasdiqlovchi hujjat
                </p>
                {importantComplete ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-[600] text-[#0D9488] bg-[#E9FBF4] px-2 py-1 rounded-full mt-2.5">
                    <CheckCircleFilled /> To'ldirildi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-[600] text-[#B5820A] bg-[#FEF6E6] px-2 py-1 rounded-full mt-2.5">
                    {importantFilledCount} / 5 to'ldirildi
                  </span>
                )}
              </div>
            </div>

            <div className="col-span-12 md:col-span-9 flex flex-col gap-4">
          <div className="grid grid-cols-6 gap-3">
            <Form.Item
              name="middle_name"
              label="Otasining ismi"
              className="md:col-span-2 col-span-6"
            >
              <Input
                placeholder="Masalan: Olimovich"
                prefix={<LuUser className="text-[#8F99A3]" />}
                className="w-full !h-[40px]"
              />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Telefon raqam"
              className="md:col-span-2 col-span-6"
              extra={
                <span className="text-[11px] text-[#8F99A3]">
                  SMS eslatmalar uchun
                </span>
              }
            >
              <Input
                addonBefore="🇺🇿 +998"
                placeholder="90 123 45 67"
                className="w-full !h-[40px]"
              />
            </Form.Item>

            <Form.Item
              name="gender"
              label="Jinsi"
              className="remove-required md:col-span-2 col-span-6"
              rules={[{ required: true, message: "Jinsini kiriting" }]}
            >
              <GenderToggle />
            </Form.Item>

            <Form.Item
              name="blood_group"
              label="Qon guruhi"
              className="md:col-span-6 col-span-6"
              extra={
                <span className="text-[11px] text-[#8F99A3]">
                  Bilmasa bo'sh qoldiring
                </span>
              }
            >
              <BloodGroupGrid />
            </Form.Item>

            <Form.Item
              name="document_type"
              label="Hujjat turi"
              className="md:col-span-3 col-span-6"
            >
              <DocumentTypeToggle onChange={handleDocType} />
            </Form.Item>

            <div className="md:col-span-3 col-span-6">
              <p className="text-[14px] mb-[8px]">Seriya va raqam</p>
              {!docType ? (
                <Input
                  disabled
                  placeholder="Avval hujjat turini tanlang"
                  prefix={<LuHash className="text-[#8F99A3]" />}
                  className="w-full !h-[40px]"
                />
              ) : docType === "driver_license" ? (
                <Form.Item name={["driver_license", "number"]} className="!mb-0">
                  <Input
                    placeholder="Guvohnoma raqami"
                    prefix={<LuHash className="text-[#8F99A3]" />}
                    className="w-full !h-[40px]"
                  />
                </Form.Item>
              ) : (
                <div className="flex gap-2">
                  <Form.Item
                    name={[docType, "series"]}
                    className="!mb-0 !w-[90px] shrink-0"
                  >
                    <Input placeholder="AA" className="w-full !h-[40px]" />
                  </Form.Item>
                  <Form.Item name={[docType, "number"]} className="!mb-0 flex-1">
                    <Input
                      placeholder="1234567"
                      prefix={<LuHash className="text-[#8F99A3]" />}
                      className="w-full !h-[40px]"
                    />
                  </Form.Item>
                </div>
              )}
            </div>
          </div>
          {/* pasport  */}
          {docType === "pasport" ? (
            <div>
              <h4 className="md:text-[16px] text-[14px] font-[500] mb-2">
                Pasport qo'shimcha ma'lumotlari
              </h4>
              <div className="grid grid-cols-6 gap-3">
                <Form.Item
                  name={["pasport", "jshr"]}
                  className="md:col-span-2 col-span-6"
                >
                  <Input
                    placeholder="JSHR raqami"
                    className="w-full !h-[40px]"
                  />
                </Form.Item>
                <Form.Item
                  name={["pasport", "issued_by"]}
                  className="md:col-span-2 col-span-6"
                >
                  <Input
                    placeholder="Kim tomonidan berilgan"
                    className="w-full !h-[40px]"
                  />
                </Form.Item>
                <Form.Item
                  name={["pasport", "issued_date"]}
                  className="md:col-span-1 col-span-6"
                >
                  <DatePicker
                    className="w-full !h-[40px]"
                    placeholder="Berilgan sana"
                  />
                </Form.Item>
                <Form.Item
                  name={["pasport", "expiry_date"]}
                  className="md:col-span-1 col-span-6"
                >
                  <DatePicker
                    className="w-full !h-[40px]"
                    placeholder="Amal qilish muddati"
                  />
                </Form.Item>
              </div>
            </div>
          ) : docType === "idcard" ? (
            <div>
              <h4 className="md:text-[16px] text-[14px] font-[500] mb-2">
                ID karta qo'shimcha ma'lumotlari
              </h4>
              <div className="grid grid-cols-6 gap-3">
                <Form.Item
                  name={["idcard", "jshr"]}
                  className="md:col-span-2 col-span-6"
                >
                  <Input
                    placeholder="JSHR raqami"
                    className="w-full !h-[40px]"
                  />
                </Form.Item>
                <Form.Item
                  name={["idcard", "issued_by"]}
                  className="md:col-span-2 col-span-6"
                >
                  <Input
                    placeholder="Kim tomonidan berilgan"
                    className="w-full !h-[40px]"
                  />
                </Form.Item>
                <Form.Item
                  name={["idcard", "issued_date"]}
                  className="md:col-span-1 col-span-6"
                >
                  <DatePicker
                    className="w-full !h-[40px]"
                    placeholder="Berilgan sana"
                  />
                </Form.Item>
                <Form.Item
                  name={["idcard", "expiry_date"]}
                  className="md:col-span-1 col-span-6"
                >
                  <DatePicker
                    className="w-full !h-[40px]"
                    placeholder="Amal qilish muddati"
                  />
                </Form.Item>
              </div>
            </div>
          ) : docType === "driver_license" ? (
            <div>
              <h4 className="md:text-[16px] text-[14px] font-[500] mb-2">
                Haydovchilik guvohnomasi qo'shimcha ma'lumotlari
              </h4>
              <div className="grid grid-cols-6 gap-3">
                <Form.Item
                  name={["driver_license", "jshr"]}
                  className="md:col-span-3 col-span-6"
                >
                  <Input
                    placeholder="JSHR raqami"
                    className="w-full  !h-[40px]"
                  />
                </Form.Item>
              </div>
            </div>
          ) : (
            ""
          )}
            </div>
          </div>
        </div>

        <div className="px-[24px] pb-5 border-t border-[#F0F2F3] pt-5">
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 md:col-span-3 flex md:flex-col flex-row items-start gap-3">
              <span className="w-[44px] h-[44px] shrink-0 rounded-[14px] bg-[#EAF1FF] text-[#2D6FE0] text-[18px] flex items-center justify-center">
                <LuMapPin />
              </span>
              <div>
                <h3 className="text-[15px] font-[600]">Qo'shimcha ma'lumotlar</h3>
                <p className="text-[11px] text-[#8F99A3] mt-0.5">
                  Manzil va jismoniy ko'rsatkichlar. Keyinroq ham to'ldirish
                  mumkin
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-[600] text-[#64727B] bg-[#F1F5F4] px-2 py-1 rounded-full mt-2.5">
                  Ixtiyoriy
                </span>
              </div>
            </div>

            <div className="col-span-12 md:col-span-9 flex flex-col gap-4">
          <div className="grid grid-cols-6 gap-3">
            <Form.Item
              name="country"
              label="Davlati"
              className="md:col-span-2 col-span-6"
              initialValue="uz"
            >
              <Select
                className="w-full  !h-[40px]"
                options={[{ value: "uz", label: "🇺🇿 O'zbekiston" }]}
              />
            </Form.Item>
            <Form.Item
              name="region"
              label="Shahar / Viloyat"
              className="md:col-span-2 col-span-6"
            >
              <Input
                placeholder="Masalan: Toshkent"
                prefix={<LuMapPin className="text-[#8F99A3]" />}
                className="w-full !h-[40px]"
              />
            </Form.Item>
            <Form.Item
              name="address"
              label="Tuman, qishloq"
              className="md:col-span-2 col-span-6"
            >
              <Input
                placeholder="Masalan: Chilonzor"
                prefix={<LuMapPin className="text-[#8F99A3]" />}
                className="w-full  !h-[40px]"
              />
            </Form.Item>

            <Form.Item
              name="height"
              label="Bo'yi"
              className="md:col-span-3 col-span-6"
            >
              <Input
                prefix={<LuRuler className="text-[#8F99A3]" />}
                suffix="sm"
                className="w-full  !h-[40px]"
              />
            </Form.Item>
            <Form.Item
              name="weight"
              label="Og'irligi"
              className="md:col-span-3 col-span-6"
            >
              <Input
                prefix={<LuWeight className="text-[#8F99A3]" />}
                suffix="kg"
                className="w-full  !h-[40px]"
              />
            </Form.Item>
          </div>

          <div className="mt-1 flex md:flex-row flex-col md:items-center gap-3 md:gap-6">
            <p className="text-[13px] font-[500] shrink-0">
              Tana massasi indeksi
            </p>
            <div className="flex-1">
              <BmiBar value={computedBmi} />
            </div>
            <p className="text-[11px] text-[#8F99A3] md:w-[180px] shrink-0">
              Bo'y va og'irlik kiritilganda avtomatik hisoblanadi
              {computedBmi != null && (
                <span className="block font-[600] text-[#0D9488]">
                  BMI: {computedBmi}
                </span>
              )}
            </p>
          </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 bg-white border-t border-[#F0F2F3] px-[24px] py-3.5 flex md:flex-row flex-col md:items-center items-stretch justify-between gap-3 rounded-b-[20px]">
          <p className="text-[11px] text-[#8F99A3] flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded border border-[#E0E6EB] bg-[#F9FAFB] font-[600]">
              Tab
            </kbd>
            keyingi maydon
            <span className="text-[#D0D5DA]">·</span>
            <kbd className="px-1.5 py-0.5 rounded border border-[#E0E6EB] bg-[#F9FAFB] font-[600]">
              Ctrl
            </kbd>
            +
            <kbd className="px-1.5 py-0.5 rounded border border-[#E0E6EB] bg-[#F9FAFB] font-[600]">
              Enter
            </kbd>
            saqlash
          </p>

          <div className="flex flex-wrap gap-3 justify-end">
            <button
              onClick={() => form.resetFields()}
              className="md:px-[30px] bg-[#d7d7d753] hover:shadow-md transition-all duration-150 py-2.5 text-[12px] md:text-[16px] rounded-md text-black font-[500] cursor-pointer"
              type="button"
            >
              Tozalash
            </button>
            {selectedPatientId && (
              <button
                onClick={() => {
                  form.resetFields(),
                    setSelectedPatientId(null),
                    setIsFormDisabled(false);
                }}
                className="md:px-[30px] hover:shadow-md transition-all duration-150  bg-[#d7d7d753] py-2.5 text-[12px] md:text-[16px] rounded-md text-black font-[500] cursor-pointer  flex justify-center items-center"
                type="button"
              >
                Yangi bemor qo'shish
              </button>
            )}
            {isFormDisabled ? (
              <div
                onClick={() => setIsFormDisabled(false)}
                className="md:px-[30px] hover:shadow-md transition-all duration-150  bg-[#2B7FFF] rounded-md text-[12px] md:text-[16px] text-white font-[500] cursor-pointer !w-[150px] flex justify-center items-center"
              >
                O'zgartirish
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPendingVisitAfterSave(true);
                    form.submit();
                  }}
                  className="md:px-[30px] hover:shadow-md transition-all duration-150 border border-[#0D9488] text-[#0D9488] text-[12px] md:text-[16px] rounded-md font-[500] cursor-pointer flex justify-center items-center gap-1.5"
                >
                  {pendingVisitAfterSave &&
                  (addPatientLoading || updatePatientLoading) ? (
                    <Spin indicator={<LoadingOutlined spin />} />
                  ) : (
                    <>
                      <CheckCircleFilled /> Qo'shib, qabulga yozish
                    </>
                  )}
                </button>
                <button
                  type="submit"
                  className="md:px-[30px] hover:shadow-md transition-all duration-150 bg-[#0D9488] text-[12px] md:text-[16px] rounded-md text-white font-[500] cursor-pointer !w-[150px] flex justify-center items-center"
                >
                  {selectedPatientId ? (
                    !pendingVisitAfterSave &&
                    (addPatientLoading || updatePatientLoading) ? (
                      <Spin
                        indicator={<LoadingOutlined spin />}
                        className="!text-white"
                      />
                    ) : (
                      "Yangilash"
                    )
                ) : (
                  "Bemorni qo'shish"
                )}
                </button>
              </>
            )}
          </div>
        </div>
      </Form>
      {/* Servise qo'shsih */}

      {selectedPatientId ? (
        <div className=" border md:w-full w-full border-[#e3e3e3] rounded-[20px] px-[24px] py-[10px] mt-4 mb-5">
          <h3 className="md:text-[18px] text-[14px] font-[600] mt-4">
            Bemorni shifokorga biriktirish
          </h3>
          <div className="grid grid-cols-6 gap-3 mt-2">
            <div className="flex flex-col gap-1 md:col-span-2 col-span-6">
              <label className="text-sm">Shifokor</label>
              <Select
                className="w-full !h-[40px]"
                onChange={(val) => setHandleSelectDoctorState(val)}
                options={employeeOptions}
                // value={selectedDoctor}
              />
            </div>

            {handleSelectDoctorState && (
              <div className="flex flex-col gap-1 md:col-span-2 col-span-6">
                <label className="text-sm ">Servislar</label>
                <TreeSelect
                  showSearch
                  style={{ width: "100%" }}
                  className="!min-h-[40px]"
                  multiple
                  placeholder="Please select"
                  allowClear
                  treeCheckable
                  treeDefaultExpandAll
                  showCheckedStrategy={TreeSelect.SHOW_CHILD}
                  treeData={treeData2}
                  value={selectedServices}
                  onChange={(val) => setSelectedServices(val)}
                />
              </div>
            )}
          </div>
          <div className="px-[24px] pb-4 flex gap-4 justify-end mt-3 md:mt-auto">
            <button
              onClick={handleDoctorSubmit}
              className="px-[30px] hover:shadow-md transition-all duration-150 !h-[42px] text-[14px] bg-[#2B7FFF] rounded-md text-white font-[500] cursor-pointer !w-[150px] flex justify-center items-center"
            >
              {newVisitLoading ? (
                <Spin
                  indicator={<LoadingOutlined spin />}
                  className="!text-white"
                />
              ) : (
                "Biriktirish"
              )}
            </button>
          </div>
        </div>
      ) : (
        ""
      )}
    </div>
  );
}
