// Datos de partida del box. La directora los cambia desde la app (pestaña Box).
export const DEFAULT_BOX = {
  name: "CrossFit Iruña",
  cancelHours: 2,     // hasta cuántas horas antes se puede cancelar una reserva
  openDays: 2,        // las reservas de una clase se abren estos días antes…
  openTime: "21:00",
  maxPerDay: 2,       // reservas máximas por persona y día (0 = sin límite); se puede cambiar por socio  // …a esta hora (la del miércoles se abre el lunes a las 21:00)
  discounts: { semester: 6, year: 10 },
  plans: [
    { id: "p1", name: "Pack 1", price: 59, classes: 4, open: 4 },
    { id: "p2", name: "Pack 2", price: 71, classes: 8, open: 4 },
    { id: "p3", name: "Pack 3", price: 82, classes: 12, open: 8 },
    { id: "p4", name: "Pack 4", price: 94, classes: 16, open: 12 },
    { id: "ilim", name: "Ilimitada", price: 105, classes: null, open: 3 },
    { id: "open", name: "Ilimitada solo Open", price: 85, classes: 0, open: null }
  ],
  // Bonos de pago único: añaden clases sueltas a la cuenta del atleta.
  passes: [
    { id: "x1", name: "Clase suelta", price: 15, credits: 1 },
    { id: "x10", name: "Bono 10 clases", price: 110, credits: 10 }
  ]
};

export const CLASS_TYPES = [
  { id: "crossfit", name: "CrossFit", c: "#6B2D3A" },
  { id: "halter", name: "Halterofilia", c: "#1F1F1F" },
  { id: "gim", name: "Gimnásticos", c: "#B07A12" },
  { id: "endurance", name: "Endurance", c: "#7A4FB5" },
  { id: "kids", name: "Kids", c: "#2F8F5B" },
  { id: "open", name: "Open", c: "#2B7BB9" },
  { id: "outdoor", name: "Open Outdoor", c: "#3E8E5A" }
];

function weekSlots() {
  // Horario real de CrossFit Iruña (copiado de Aimharder, octubre 2026)
  const s = [];
  let n = 0;
  const add = (d, start, end, type, cap) => s.push({ id: "s" + (++n), d, s: start, e: end, type, cap });
  const h = (a, b) => [a, b];
  const weekday = [
    [h("06:30", "07:30"), [["open", 10], ["crossfit", 16]]],
    [h("07:30", "08:30"), [["open", 10], ["crossfit", 16]]],
    [h("08:30", "09:30"), [["open", 10]]],
    [h("09:30", "10:30"), [["open", 10], ["crossfit", 16]]],
    [h("10:30", "11:30"), [["open", 10], ["crossfit", 16]]],
    [h("11:30", "12:30"), [["open", 30]]],
    [h("12:30", "13:30"), [["open", 30]]],
    [h("13:30", "14:30"), [["open", 30]]],
    [h("14:30", "15:30"), [["open", 10], ["crossfit", 16]]],
    [h("16:00", "17:00"), [["open", 14], ["crossfit", 16]]],
    [h("17:00", "18:00"), [["open", 10], ["crossfit", 16], ["outdoor", 6]]],
    [h("18:00", "19:00"), [["open", 14], ["crossfit", 16], ["outdoor", 6]]],
    [h("19:00", "20:00"), [["open", 14], ["crossfit", 16], ["outdoor", 6]]],
    [h("20:00", "21:00"), [["open", 14], ["crossfit", 16]]]
  ];
  for (let d = 0; d < 5; d++) for (const [[a, b], list] of weekday) for (const [type, cap] of list) add(d, a, b, type, cap);
  add(5, "09:00", "10:00", "open", 14); add(5, "09:00", "10:00", "crossfit", 16);
  add(5, "10:00", "11:00", "open", 14); add(5, "10:00", "11:00", "crossfit", 16);
  add(5, "11:00", "12:00", "open", 14);
  add(6, "10:00", "11:00", "open", 14); add(6, "10:00", "11:00", "crossfit", 16);
  return s;
}
export const DEFAULT_SCHEDULE = { slots: weekSlots(), off: {} };

export const LIFTS = ["Back squat", "Front squat", "Peso muerto", "Clean", "Power clean", "Snatch", "Power snatch",
  "Clean & jerk", "Press estricto", "Push press", "Press banca", "Thruster"];
