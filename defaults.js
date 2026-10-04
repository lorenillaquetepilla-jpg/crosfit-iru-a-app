// Datos de partida del box. La directora los cambia desde la app (pestaña Box).
export const DEFAULT_BOX = {
  name: "CrossFit Iruña",
  cancelHours: 2,     // hasta cuántas horas antes se puede cancelar una reserva
  bookDays: 7,        // con cuántos días de antelación se puede reservar
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
  { id: "endurance", name: "Endurance", c: "#2B6CB0" },
  { id: "kids", name: "Kids", c: "#2F8F5B" },
  { id: "open", name: "Open box", c: "#8A7F82" }
];

function weekSlots() {
  const s = [];
  let n = 0;
  const add = (d, start, end, type, cap = 14) => s.push({ id: "s" + (++n), d, s: start, e: end, type, cap });
  for (let d = 0; d < 5; d++) {
    add(d, "07:00", "08:00", "crossfit");
    add(d, "09:30", "10:30", "crossfit");
    add(d, "13:30", "14:30", "crossfit");
    add(d, "17:30", "18:30", "crossfit");
    add(d, "18:30", "19:30", "crossfit");
    add(d, "19:30", "20:30", "crossfit");
    add(d, "20:30", "21:30", d % 2 ? "halter" : "crossfit");
    add(d, "10:30", "13:30", "open", 10);
  }
  add(0, "18:30", "19:30", "endurance", 10);
  add(2, "19:30", "20:30", "gim", 10);
  add(4, "17:30", "18:30", "kids", 10);
  add(5, "10:00", "11:00", "crossfit");
  add(5, "09:00", "12:00", "open", 10);
  add(6, "09:00", "12:00", "open", 10);
  return s;
}
export const DEFAULT_SCHEDULE = { slots: weekSlots(), off: {} };

export const LIFTS = ["Back squat", "Front squat", "Peso muerto", "Clean", "Power clean", "Snatch", "Power snatch",
  "Clean & jerk", "Press estricto", "Push press", "Press banca", "Thruster"];
