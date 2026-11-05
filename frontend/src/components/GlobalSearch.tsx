import { useEffect, useRef, useState } from "react";
import { AutoComplete, Input, InputRef } from "antd";
import dayjs from "dayjs";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import SecureStorage from "react-secure-storage";
import { AvitcenaAdmin } from "../queries/query";
import { useDebouncedValue } from "../utils/useDebouncedValue";

const MIN_SEARCH_LENGTH = 2;
const RESULT_LIMIT = 5;

const PLACEHOLDERS: Record<string, string> = {
  admin: "Bemor, shifokor yoki qabulni qidiring...",
  registrator: "Bemor yoki qabulni qidiring...",
  doctor: "Bemor yoki qabulni qidiring...",
  superadmin: "Klinikani qidiring...",
};

const PATIENT_BASE_PATHS: Record<string, string> = {
  admin: "/patients",
  registrator: "/register/patients",
  doctor: "/doctor/patients",
};

function resultLabel(title: string, subtitle?: string | null) {
  return (
    <div>
      <p className="text-[13px] font-[500] truncate">{title}</p>
      {subtitle && (
        <p className="text-[11px] text-[#8F99A3] truncate">{subtitle}</p>
      )}
    </div>
  );
}

async function searchFor(role: string, term: string) {
  if (role === "superadmin") {
    const clinics = await AvitcenaAdmin.getClinics(1, RESULT_LIMIT, term);

    return [
      {
        title: "Klinikalar",
        options: (clinics.data || []).map((clinic: any) => ({
          value: `clinic:${clinic.id}`,
          path: `/superadmin/clinics?search=${encodeURIComponent(clinic.name)}`,
          label: resultLabel(clinic.name, clinic.phone),
        })),
      },
    ];
  }

  const patientsPath = PATIENT_BASE_PATHS[role];

  const [patients, visits, doctors] = await Promise.all([
    AvitcenaAdmin.getPatientsAll(1, RESULT_LIMIT, term),
    AvitcenaAdmin.getTodayVisits(1, RESULT_LIMIT, undefined, undefined, term, true),
    role === "admin"
      ? AvitcenaAdmin.getEmployeesFilter(1, RESULT_LIMIT, term, "doctor")
      : Promise.resolve(null),
  ]);

  return [
    {
      title: "Bemorlar",
      options: (patients.data || []).map((patient) => ({
        value: `patient:${patient.id}`,
        path: `${patientsPath}/${patient.id}`,
        label: resultLabel(
          `${patient.first_name} ${patient.last_name}`,
          [patient.code, patient.phone].filter(Boolean).join(" • ")
        ),
      })),
    },
    {
      title: "Shifokorlar",
      options: (doctors?.data || []).map((doctor: any) => ({
        value: `doctor:${doctor.id}`,
        path: `/employees/${doctor.id}`,
        label: resultLabel(doctor.fio, doctor.phone),
      })),
    },
    {
      title: "Qabullar",
      options: (visits.data || []).map((visit: any) => ({
        value: `visit:${visit.id}`,
        path: `${patientsPath}/${visit.patient?.id}`,
        label: resultLabel(
          visit.patient?.fio,
          [dayjs(visit.created_at).format("DD.MM.YYYY"), visit.queue, visit.doctor?.fio]
            .filter(Boolean)
            .join(" • ")
        ),
      })),
    },
  ];
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<InputRef>(null);
  const role = (SecureStorage.getItem("role") as string | null) || "";

  const [value, setValue] = useState("");
  const term = useDebouncedValue(value.trim());
  const canSearch = !!PLACEHOLDERS[role] && term.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const { data: groups, isFetching, isError } = useQuery({
    queryKey: ["globalSearch", role, term],
    queryFn: () => searchFor(role, term),
    enabled: canSearch,
    keepPreviousData: true,
  });

  const options = canSearch
    ? (groups || [])
        .filter((group) => group.options.length > 0)
        .map((group) => ({ label: group.title, options: group.options }))
    : [];

  const isTyping = value.trim() !== term;

  const notFoundContent = !canSearch ? null : isTyping || isFetching ? (
    <span className="text-[13px] text-[#8F99A3]">Qidirilmoqda...</span>
  ) : (
    <span className="text-[13px] text-[#8F99A3]">
      {isError ? "Qidirib bo'lmadi, qayta urinib ko'ring" : "Hech narsa topilmadi"}
    </span>
  );

  return (
    <AutoComplete
      value={value}
      onChange={setValue}
      options={options}
      filterOption={false}
      notFoundContent={notFoundContent}
      onSelect={(_val, option: any) => {
        setValue("");
        inputRef.current?.blur();
        navigate(option.path);
      }}
      className="w-full"
    >
      <Input
        ref={inputRef}
        aria-label="Qidiruv"
        placeholder={PLACEHOLDERS[role] || "Qidirish..."}
        suffix={
          <span className="text-[11px] text-[#A9B2B8] border border-[#E0E6EB] rounded-[4px] px-1.5 py-0.5">
            Ctrl K
          </span>
        }
        className="w-full !h-[40px] !rounded-[10px] !bg-[#F9FAFB] text-[13px]"
      />
    </AutoComplete>
  );
}
