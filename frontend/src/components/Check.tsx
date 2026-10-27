// Receipt.tsx
import { forwardRef } from "react";
import { Service } from "./EmployeeInfo";
import dayjs from "dayjs";

interface ReceiptData {
  patientName: string | undefined;
  patientLastName: string | undefined;
  patientDateOfBirth?: string | undefined;
  region?: string | undefined;
  date: string;
  services: Service[];
  doctor: string;
  room: string;
  queue_number: string;
  payment: number;
}

interface ReceiptProps {
  data: ReceiptData;
}

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ data }, ref) => {
  const formatted = dayjs(data.date).format("YYYY-MM-DD HH:mm");
  // console.log(data);
  return (
    <div
      ref={ref}
      style={{
        width: "58mm",
        fontFamily: "monospace",
        fontSize: "11px",
        padding: "5px",
        background: "#fff",
      }}
    >
      <h2 style={{ textAlign: "start", fontSize: "14px", marginBottom: "8px" }}>
        🧾 TITAN RENESANS MED CLINIC
      </h2>
      <hr style={{ borderTop: "1px dashed #000" }} />

      <p>
        Bemor:{" "}
        <span style={{ fontWeight: 600 }}>
          {data?.patientName} {data?.patientLastName}
        </span>
      </p>
      <p>
        Tug'ilgan sanasi:{" "}
        <span style={{ fontWeight: 600 }}>{data?.patientDateOfBirth}</span>
      </p>
      <p>
        Tuman qishloq: <span style={{ fontWeight: 600 }}>{data?.region}</span>
      </p>
      <p>
        Vaqt: <span style={{ fontWeight: 600 }}>{formatted}</span>
      </p>
      <p>
        Xizmat turi:{" "}
        <span style={{ fontWeight: 600 }}>
          {data.services?.map((i, index) => (
            <span key={i.id || index}>
              {i.name}
              {index !== data.services?.length - 1 && ", "}
            </span>
          ))}
        </span>
      </p>
      <p>
        Doktor: <span style={{ fontWeight: 600 }}>{data?.doctor}</span>
      </p>
      <p>
        Xona raqami: <span style={{ fontWeight: 600 }}>{data?.room}</span>
      </p>
      <p>
        Navbat: <span style={{ fontWeight: 600 }}>{data?.queue_number}</span>
      </p>
      <p>
        To‘lov: <span style={{ fontWeight: 600 }}>{data?.payment} so‘m</span>
      </p>

      <hr style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
      <p style={{ textAlign: "start" }}>
        Rahmat! <span style={{ fontWeight: 600 }}>Sog‘ bo‘ling!</span>
      </p>
    </div>
  );
});

export default Receipt;
