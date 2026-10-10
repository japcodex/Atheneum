import { esc, icon } from "./ui.js";

export function validMonth(value) {
  return (
    typeof value === "string" &&
    /^(19\d{2}|20\d{2}|21\d{2}|2200)-(0[1-9]|1[0-2])$/.test(value)
  );
}

export function monthLabel(month) {
  if (!validMonth(month)) return "Mês de leitura";
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

/** Calendar arithmetic uses UTC so month navigation is independent of DST. */
export function shiftMonth(month, offset) {
  if (!validMonth(month)) return month;
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber - 1 + offset, 1))
    .toISOString()
    .slice(0, 7);
  return validMonth(next) ? next : month;
}

function goalField(name, label, value, help) {
  return `<div class="field"><label for="monthly-${name}">${label}</label><input id="monthly-${name}" name="${name}" type="number" min="0" max="1000000" step="1" inputmode="numeric" value="${Number(value) || 0}" required aria-describedby="monthly-${name}-help"><small id="monthly-${name}-help">${help}</small><span class="field-error" data-error="${name}"></span></div>`;
}

export function renderMonthlyGoalForm({ store, month }) {
  const selectedMonth = validMonth(month)
    ? month
    : store.stats().today.slice(0, 7);
  const goal = store.state.goals.monthly?.[selectedMonth] || {};
  return `<form id="monthly-goal-form" class="monthly-goal-form"><p class="monthly-form-intro">Um mês cabe em muitas histórias. Escolha o que quer alcançar em ${esc(monthLabel(selectedMonth))} e ajuste no seu ritmo.</p><div class="book-form"><div class="field full-width"><label for="monthly-month">Mês da meta</label><input id="monthly-month" name="month" type="month" value="${selectedMonth}" min="1900-01" max="2200-12" required><span class="field-error" data-error="month"></span></div>${goalField("books", "Livros a concluir", goal.books, "Conta cada livro concluído pela primeira vez no mês.")}${goalField("pages", "Páginas a ler", goal.pages, "Soma as páginas das suas sessões de leitura.")}${goalField("minutes", "Minutos de leitura", goal.minutes, "Soma o tempo registrado nas suas sessões.")}<div class="field"><label for="monthly-paused">Situação da meta</label><select id="monthly-paused" name="paused"><option value="false" ${!goal.paused ? "selected" : ""}>Em andamento</option><option value="true" ${goal.paused ? "selected" : ""}>Em pausa</option></select><small>Pausar preserva suas sessões e seu progresso.</small><span class="field-error" data-error="paused"></span></div></div><p class="monthly-form-note">Use zero nos objetivos que não quiser acompanhar. A conquista mensal é liberada quando todos os objetivos definidos forem alcançados e a meta estiver em andamento.</p><div class="form-actions"><span class="form-help">Seu histórico é salvo neste navegador.</span><button class="primary-button" type="submit">Salvar meta mensal ${icon("arrow")}</button></div></form>`;
}

export const renderGoalForm = renderMonthlyGoalForm;
