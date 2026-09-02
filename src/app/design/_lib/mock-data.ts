// Datos mock para la exploración visual (/design). NO representan datos
// reales ni se conectan a Supabase.

export type PunchStatus = "WORKING" | "OUTSIDE";

export type MockStudent = {
  id: string;
  name: string;
  classGroup: string;
  status: PunchStatus;
  checkIn: string | null;
};

export const students: MockStudent[] = [
  { id: "1", name: "Carlos López", classGroup: "DAM2", status: "WORKING", checkIn: "08:02" },
  { id: "2", name: "Ana García", classGroup: "DAW1", status: "OUTSIDE", checkIn: null },
  { id: "3", name: "Pedro Martín", classGroup: "ASIR2", status: "WORKING", checkIn: "08:17" },
  { id: "4", name: "Laura Sánchez", classGroup: "DAM2", status: "WORKING", checkIn: "07:58" },
  { id: "5", name: "Marcos Rodríguez", classGroup: "DAW1", status: "WORKING", checkIn: "08:05" },
  { id: "6", name: "Marta Fernández", classGroup: "SMR1", status: "OUTSIDE", checkIn: null },
  { id: "7", name: "Javier Ruiz", classGroup: "ASIR2", status: "WORKING", checkIn: "08:11" },
  { id: "8", name: "Sofía Navarro", classGroup: "DAM2", status: "WORKING", checkIn: "08:00" },
  { id: "9", name: "Alejandro Torres", classGroup: "DAW1", status: "WORKING", checkIn: "08:09" },
  { id: "10", name: "Lucía Moreno", classGroup: "SMR1", status: "WORKING", checkIn: "08:03" },
  { id: "11", name: "Pablo Iglesias", classGroup: "ASIR2", status: "OUTSIDE", checkIn: null },
  { id: "12", name: "Elena Castro", classGroup: "DAM2", status: "WORKING", checkIn: "07:55" },
  { id: "13", name: "Hugo Ortega", classGroup: "DAW1", status: "WORKING", checkIn: "08:14" },
  { id: "14", name: "Claudia Vidal", classGroup: "SMR1", status: "WORKING", checkIn: "08:06" },
  { id: "15", name: "Marcos Gil", classGroup: "ASIR2", status: "WORKING", checkIn: "08:02" },
  { id: "16", name: "Irene Delgado", classGroup: "DAM2", status: "OUTSIDE", checkIn: null },
  { id: "17", name: "Álvaro Molina", classGroup: "DAW1", status: "WORKING", checkIn: "08:08" },
  { id: "18", name: "Nerea Campos", classGroup: "SMR1", status: "WORKING", checkIn: "07:59" },
  { id: "19", name: "Rubén Pascual", classGroup: "ASIR2", status: "WORKING", checkIn: "08:12" },
  { id: "20", name: "Paula Domínguez", classGroup: "DAM2", status: "WORKING", checkIn: "08:01" },
  { id: "21", name: "David Herrera", classGroup: "DAW1", status: "OUTSIDE", checkIn: null },
  { id: "22", name: "Cristina Vega", classGroup: "SMR1", status: "WORKING", checkIn: "08:04" },
  { id: "23", name: "Sergio Blanco", classGroup: "ASIR2", status: "WORKING", checkIn: "08:07" },
  { id: "24", name: "Andrea Serrano", classGroup: "DAM2", status: "OUTSIDE", checkIn: null },
  { id: "25", name: "Iván Cortés", classGroup: "DAW1", status: "OUTSIDE", checkIn: null },
];

export const presentCount = students.filter((s) => s.status === "WORKING").length;
export const outsideCount = students.filter((s) => s.status === "OUTSIDE").length;

export type MockHistoryEntry = {
  id: string;
  student: string;
  classGroup: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  duration: string | null;
  flagged?: boolean;
};

export const historyEntries: MockHistoryEntry[] = [
  { id: "h1", student: "Carlos López", classGroup: "DAM2", date: "02 SEP", checkIn: "08:03", checkOut: null, duration: null },
  { id: "h2", student: "Pedro Martín", classGroup: "ASIR2", date: "02 SEP", checkIn: "08:17", checkOut: null, duration: null },
  { id: "h3", student: "Carlos López", classGroup: "DAM2", date: "01 SEP", checkIn: "08:02", checkOut: "14:01", duration: "5h 59m" },
  { id: "h4", student: "Ana García", classGroup: "DAW1", date: "01 SEP", checkIn: "08:10", checkOut: "13:45", duration: "5h 35m" },
  { id: "h5", student: "Sofía Navarro", classGroup: "DAM2", date: "01 SEP", checkIn: "08:00", checkOut: "14:02", duration: "6h 02m" },
  { id: "h6", student: "Marcos Rodríguez", classGroup: "DAW1", date: "31 AGO", checkIn: "08:05", checkOut: null, duration: null, flagged: true },
  { id: "h7", student: "Carlos López", classGroup: "DAM2", date: "31 AGO", checkIn: "08:05", checkOut: "14:03", duration: "5h 58m" },
  { id: "h8", student: "Laura Sánchez", classGroup: "DAM2", date: "31 AGO", checkIn: "07:58", checkOut: "14:10", duration: "6h 12m" },
  { id: "h9", student: "Javier Ruiz", classGroup: "ASIR2", date: "31 AGO", checkIn: "08:11", checkOut: "13:59", duration: "5h 48m" },
  { id: "h10", student: "Elena Castro", classGroup: "DAM2", date: "30 AGO", checkIn: "07:55", checkOut: "14:00", duration: "6h 05m" },
  { id: "h11", student: "Rubén Pascual", classGroup: "ASIR2", date: "30 AGO", checkIn: "08:12", checkOut: "13:50", duration: "5h 38m", flagged: true },
  { id: "h12", student: "Nerea Campos", classGroup: "SMR1", date: "30 AGO", checkIn: "07:59", checkOut: "14:04", duration: "6h 05m" },
];

export const currentStudent = {
  name: "Carlos López",
  classGroup: "DAM2",
  status: "WORKING" as PunchStatus,
  checkIn: "08:03",
  recent: [
    { date: "01 SEP", checkIn: "08:02", checkOut: "14:01" },
    { date: "31 AGO", checkIn: "08:05", checkOut: "14:03" },
    { date: "30 AGO", checkIn: "08:01", checkOut: "13:58" },
  ],
};

export const currentTeacher = {
  name: "Álvaro",
};

export const today = {
  weekday: "MIÉRCOLES",
  date: "02 SEPTIEMBRE 2026",
};

// Historial individual determinista (para el detalle de alumno). No usa
// Math.random para que el resultado sea estable entre servidor y cliente.
const PAST_DATES = ["01 SEP", "31 AGO", "28 AGO", "27 AGO"];

function shiftMinutes(time: string, delta: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + delta;
  const hh = Math.floor(((total % 1440) + 1440) / 60) % 24;
  const mm = ((total % 60) + 60) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function studentHistoryFor(student: MockStudent) {
  const base = student.checkIn ?? "08:05";
  return PAST_DATES.map((date, i) => {
    const seed = (Number(student.id) + i) % 7;
    const checkIn = shiftMinutes(base, seed - 3);
    const checkOut = shiftMinutes(checkIn, 355 + seed * 6);
    return { date, checkIn, checkOut, duration: `${5 + (seed % 2)}h ${45 + seed * 2}m` };
  });
}
