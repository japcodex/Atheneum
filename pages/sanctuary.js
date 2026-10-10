import { esc, heading, fmtDate } from "../lib/ui.js";
import { monthLabel, validMonth } from "../lib/goals.js";

const number = (value) =>
  new Intl.NumberFormat("pt-BR").format(Math.max(0, Number(value) || 0));
const ratio = (value, target) =>
  target > 0 ? Math.min(1, Math.max(0, value / target)) : 0;
const percent = (value) => Math.round(Math.min(1, Math.max(0, value)) * 100);

function dateLabel(value) {
  return value && !Number.isNaN(Date.parse(value))
    ? fmtDate(value)
    : "Data não informada";
}

/** Small engraved marks: all artwork is local and decorative. */
function medalMark(kind) {
  const marks = {
    book: '<path d="M24 19v28M11 16c5-1 9 0 13 3 4-3 8-4 13-3v27c-5-1-9 0-13 3-4-3-8-4-13-3Z"/>',
    books: '<path d="M13 44V16h7v28m4 0V13h7v31m6-1-3-26 6-1 3 26M9 45h36"/>',
    note: '<path d="m15 38 3-10L35 11l7 7-17 17-10 3Zm3-10 7 7M14 43h29"/><path d="m31 15 7 7"/>',
    list: '<path d="M16 14h22v31H16V14Zm5 8h12m-12 8h12m-12 8h8M11 17v23"/>',
    compass:
      '<circle cx="27" cy="28" r="16"/><path d="m33 21-3 11-10 5 4-12 9-4ZM27 8v3m0 34v3M7 28h3m34 0h3"/>',
    ritual:
      '<circle cx="27" cy="28" r="12"/><path d="M27 20v9l6 4M27 8v4m0 32v4M7 28h4m32 0h4M13 14l3 3m22 22 3 3M41 14l-3 3M16 39l-3 3"/>',
    trophy:
      '<path d="M18 12h18v12c0 8-4 12-9 12s-9-4-9-12V12Zm0 5h-6v6c0 6 4 8 8 8m16-14h6v6c0 6-4 8-8 8M27 36v8m-8 0h16"/>',
    month:
      '<rect x="12" y="14" width="30" height="30" rx="2"/><path d="M12 22h30M20 10v8m14-8v8m-15 16 5 5 11-11"/>',
  };
  return `<svg class="medal-mark" viewBox="0 0 54 56" aria-hidden="true">${marks[kind] || marks.book}</svg>`;
}

function progressMeter(value, target, label) {
  return `<div class="sanctuary-meter" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${target || 100}" aria-valuenow="${target ? Math.min(value, target) : 0}" aria-valuetext="${esc(target ? `${number(value)} de ${number(target)}` : "Sem meta definida")}"><span style="width:${percent(ratio(value, target))}%"></span></div>`;
}

function monthlyMetric(monthly, key, label, unit) {
  const value = monthly[key],
    target = monthly.targets[key];
  return `<div class="monthly-metric"><div><span>${label}</span><strong>${number(value)}${target ? ` <small>/ ${number(target)}</small>` : ""}</strong></div>${progressMeter(value, target, label)}<small>${target ? `${percent(ratio(value, target))}% da meta de ${unit}` : `Sem meta de ${unit} definida`}</small></div>`;
}

function monthlyGoal(monthly) {
  const configured = Object.values(monthly.targets).some(
    (target) => target > 0,
  );
  const ringPercent = configured ? percent(monthly.completion) : 0;
  const status = !configured
    ? "UM MÊS, NOVAS POSSIBILIDADES"
    : monthly.goal?.paused
      ? "META EM PAUSA"
      : monthly.achieved
        ? "META DO MÊS ALCANÇADA"
        : "SEU CAPÍTULO ESTÁ EM ANDAMENTO";
  const note = !configured
    ? "Escolha livros, páginas ou minutos. Pequenos objetivos dão forma ao seu próximo capítulo."
    : monthly.goal?.paused
      ? "Sua meta está pausada. As leituras continuam no histórico e você pode retomá-la quando quiser."
      : monthly.achieved
        ? "Cada objetivo deste mês foi alcançado. A marca dessa conquista fica guardada na sua jornada."
        : "O progresso vem das conclusões e das sessões registradas na Sala de leitura.";
  return `<section class="monthly-ledger" aria-labelledby="monthly-title" data-reveal>
    <div class="monthly-heading"><div><span class="eyebrow red">CADERNO DE LEITURA · META MENSAL</span><h2 id="monthly-title">${esc(monthLabel(monthly.month))}</h2></div><div class="monthly-navigation"><button class="monthly-arrow" data-action="monthly-prev" data-month="${monthly.month}" aria-label="Ver mês anterior">←</button><button class="monthly-arrow" data-action="monthly-next" data-month="${monthly.month}" aria-label="Ver mês seguinte">→</button></div></div>
    <div class="monthly-overview"><div class="monthly-ring ${monthly.achieved ? "is-complete" : ""} ${monthly.goal?.paused ? "is-paused" : ""}" aria-label="${configured ? `${ringPercent}% da meta mensal` : "Meta mensal ainda não definida"}"><svg viewBox="0 0 160 160" aria-hidden="true"><circle class="monthly-ring-track" cx="80" cy="80" r="67"/><circle class="monthly-ring-fill" cx="80" cy="80" r="67" pathLength="100" stroke-dasharray="${ringPercent} 100"/></svg><div><strong>${configured ? `${ringPercent}<small>%</small>` : "—"}</strong><span>${configured ? "DO SEU OBJETIVO" : "SEU PRÓXIMO MARCO"}</span></div></div><div class="monthly-intro"><span class="eyebrow ${monthly.achieved ? "red" : ""}">${status}</span><h3>${monthly.achieved ? "Um mês para guardar." : "De página em página."}</h3><p>${note}</p><button class="secondary-button" data-action="monthly-goal" data-month="${monthly.month}">${monthly.goal ? "Editar meta do mês" : "Criar meta para este mês"} ↗</button></div></div>
    <div class="monthly-metrics">${monthlyMetric(monthly, "books", "Livros concluídos", "livros")}${monthlyMetric(monthly, "pages", "Páginas lidas", "páginas")}${monthlyMetric(monthly, "minutes", "Minutos de leitura", "minutos")}</div>
    <p class="monthly-footnote">${number(monthly.sessions)} ${monthly.sessions === 1 ? "sessão registrada" : "sessões registradas"} neste mês · Você pode escolher uma ou mais metas.</p>
  </section>`;
}

function readingCalendar(state, month, today) {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const offset = (firstWeekday + 6) % 7,
    activity = new Map();
  for (const session of state.sessions) {
    if (!session.day?.startsWith(`${month}-`)) continue;
    const saved = activity.get(session.day) || {
      sessions: 0,
      pages: 0,
      minutes: 0,
    };
    saved.sessions += 1;
    saved.pages += Number(session.pages) || 0;
    saved.minutes += Number(session.duration) || 0;
    activity.set(session.day, saved);
  }
  const blanks = Array.from(
    { length: offset },
    () => '<span class="habit-blank" aria-hidden="true"></span>',
  ).join("");
  const cells = Array.from({ length: days }, (_, index) => {
    const calendarDay = `${month}-${String(index + 1).padStart(2, "0")}`,
      entry = activity.get(calendarDay);
    const description = entry
      ? `${index + 1}: ${entry.sessions} ${entry.sessions === 1 ? "sessão" : "sessões"}, ${entry.pages} páginas e ${entry.minutes} minutos`
      : `${index + 1}: sem sessão registrada`;
    return `<span class="habit-day ${entry ? "has-session" : ""} ${calendarDay === today ? "is-today" : ""} ${calendarDay > today ? "is-future" : ""}" role="listitem" aria-label="${esc(description)}" title="${esc(description)}">${index + 1}</span>`;
  }).join("");
  return `<section class="reading-calendar" aria-labelledby="habit-title" data-reveal><div class="sanctuary-section-heading"><span class="eyebrow red">O RITMO DAS SUAS PÁGINAS</span><h2 id="habit-title">Seu ritual de leitura.</h2></div><p>${number(activity.size)} ${activity.size === 1 ? "dia com leitura" : "dias com leitura"} em ${esc(monthLabel(month))}.</p><div class="habit-weekdays" aria-hidden="true">${["S", "T", "Q", "Q", "S", "S", "D"].map((day) => `<span>${day}</span>`).join("")}</div><div class="habit-calendar" role="list" aria-label="Dias de leitura de ${esc(monthLabel(month))}">${blanks}${cells}</div><div class="habit-legend"><span><i class="has-session" aria-hidden="true"></i>Leitura registrada</span><span><i class="is-today" aria-hidden="true"></i>Hoje</span></div><a class="text-button" href="#leitura">Registrar uma sessão ↗</a></section>`;
}

function levelAndYear(state, stats) {
  const annualTarget = Number(state.goals.annualBooks) || 0;
  return `<section class="sanctuary-year" aria-labelledby="annual-title" data-reveal><div class="sanctuary-level"><div class="reader-seal" aria-hidden="true"><span>GUARDIÃO DAS HISTÓRIAS</span><img src="assets/logo.svg" alt=""><strong>${stats.level}</strong><small>NÍVEL DO LEITOR</small></div><div><span class="eyebrow red">A ORDEM DOS LEITORES</span><h2>${esc(stats.levelTitle)}</h2><p>${number(stats.xp)} XP guardados · ${number(stats.xpToNext)} XP para o próximo nível.</p>${progressMeter(stats.levelProgress, 200, "Progresso para o próximo nível")}<small>Iniciar uma leitura: +10 XP · Concluir: +50 XP. Cada recompensa é concedida uma vez por livro.</small></div></div><div class="sanctuary-annual"><span class="eyebrow red">SEU ANO EM LIVROS · ${state.goals.year}</span><h2 id="annual-title">Uma história maior.</h2><div class="sanctuary-annual-count">${number(stats.annualBooks)} <small>/ ${number(annualTarget)} livros</small></div>${progressMeter(stats.annualBooks, annualTarget, "Meta anual de livros")}<div><p>${state.goals.paused ? "Meta anual em pausa. Seu histórico está preservado." : `${percent(ratio(stats.annualBooks, annualTarget))}% da meta anual alcançada.`}</p><button class="text-button" data-action="goals">Ajustar meta anual ↗</button></div></div></section>`;
}

function achievementList(state, stats, monthly) {
  const completedGenres = new Set(
    state.rewards
      .filter((reward) => reward.type === "finish")
      .map((reward) => reward.genre)
      .filter(Boolean),
  ).size;
  const annualTarget = Number(state.goals.annualBooks) || 0;
  const items = [
    {
      id: "first-book",
      title: "Primeira travessia",
      description: "Conclua seu primeiro livro.",
      mark: "book",
      value: stats.finishedBooks,
      target: 1,
      unit: "livro",
    },
    {
      id: "first-note",
      title: "Ideia guardada",
      description: "Guarde sua primeira anotação.",
      mark: "note",
      value: stats.notes,
      target: 1,
      unit: "anotação",
    },
    {
      id: "first-list",
      title: "Curador da estante",
      description: "Crie sua primeira lista.",
      mark: "list",
      value: stats.lists,
      target: 1,
      unit: "lista",
    },
    {
      id: "five-books",
      title: "Leitor constante",
      description: "Conclua cinco livros.",
      mark: "books",
      value: stats.finishedBooks,
      target: 5,
      unit: "livros",
    },
    {
      id: "ten-books",
      title: "Colecionador de histórias",
      description: "Conclua dez livros.",
      mark: "books",
      value: stats.finishedBooks,
      target: 10,
      unit: "livros",
    },
    {
      id: "three-genres",
      title: "Novos horizontes",
      description: "Conclua livros de três gêneros.",
      mark: "compass",
      value: completedGenres,
      target: 3,
      unit: "gêneros",
    },
    {
      id: "seven-days",
      title: "Sete dias de leitura",
      description: "Registre sessões em sete dias seguidos.",
      mark: "ritual",
      value: stats.bestStreak,
      target: 7,
      unit: "dias seguidos",
    },
    {
      id: `annual-${state.goals.year}`,
      title: "Meta anual alcançada",
      description: `Alcance sua meta de livros em ${state.goals.year}.`,
      mark: "trophy",
      value: stats.annualBooks,
      target: annualTarget,
      unit: "livros",
      paused: state.goals.paused,
    },
    {
      id: `monthly-${monthly.month}`,
      title: "Meta mensal alcançada",
      description: `Alcance os objetivos de ${monthLabel(monthly.month)}.`,
      mark: "month",
      value: percent(monthly.completion),
      target: Object.values(monthly.targets).some((target) => target > 0)
        ? 100
        : 0,
      unit: "%",
      paused: monthly.goal?.paused,
    },
  ];
  return `<section class="sanctuary-achievements" aria-labelledby="achievements-title"><div class="sanctuary-section-heading"><div><span class="eyebrow red">PEQUENAS GRANDES VITÓRIAS</span><h2 id="achievements-title">Selos da sua jornada.</h2></div><p>${number(state.achievements.length)} ${state.achievements.length === 1 ? "conquista guardada" : "conquistas guardadas"} · Cada selo tem sua história.</p></div><div class="sanctuary-medals">${items
    .map((item) => {
      const achievement = state.achievements.find(
          (entry) => entry.id === item.id,
        ),
        unlocked = Boolean(achievement);
      const earned = Math.min(item.value, item.target);
      const status = unlocked
        ? `CONQUISTADO EM ${dateLabel(achievement.date)}`
        : item.paused
          ? "META EM PAUSA"
          : item.target
            ? "EM CONSTRUÇÃO"
            : "DEFINA UMA META";
      const label =
        item.unit === "%"
          ? `${percent(ratio(earned, item.target))}% do objetivo`
          : `${number(earned)} / ${number(item.target)} ${item.unit}`;
      return `<article class="sanctuary-medal ${unlocked ? "is-earned" : ""}" data-reveal><div class="medal-seal" aria-hidden="true">${medalMark(item.mark)}<span>${unlocked ? "✦" : "·"}</span></div><h3>${esc(achievement?.name || item.title)}</h3><p>${esc(item.description)}</p>${progressMeter(unlocked ? 1 : earned, unlocked ? 1 : item.target, unlocked ? `${item.title}: conquista registrada` : item.title)}<small>${unlocked ? "Selo guardado no histórico." : item.target ? label : "Seu próximo objetivo começa aqui."}</small><span class="medal-state">${status}</span></article>`;
    })
    .join("")}</div></section>`;
}

function goalArchive(store, currentMonth) {
  const months = Object.keys(store.state.goals.monthly || {})
    .filter(validMonth)
    .sort()
    .reverse();
  if (!months.length)
    return '<p class="sanctuary-empty-note">Suas metas mensais formarão um arquivo de pequenos capítulos. Crie a primeira acima.</p>';
  return `<details class="monthly-archive"><summary>Arquivo das metas mensais <span>${number(months.length)} ${months.length === 1 ? "mês" : "meses"}</span></summary><div>${months
    .slice(0, 12)
    .map((month) => {
      const monthly = store.monthlyStats(month),
        achieved = store.state.achievements.some(
          (entry) => entry.id === `monthly-${month}`,
        );
      return `<button class="monthly-archive-entry ${month === currentMonth ? "is-current" : ""}" data-action="monthly-select" data-month="${month}" ${month === currentMonth ? 'aria-current="date"' : ""}><span>${esc(monthLabel(month))}</span><small>${achieved ? "✦ Conquistado" : monthly.goal?.paused ? "Em pausa" : `${percent(monthly.completion)}% alcançado`} ↗</small></button>`;
    })
    .join(
      "",
    )}</div>${months.length > 12 ? '<p class="monthly-footnote">Exibindo as 12 metas mais recentes. Use as setas do calendário para visitar os outros meses.</p>' : ""}</details>`;
}

function journeyHistory(state) {
  const entries = state.rewards
    .slice()
    .sort((first, second) =>
      String(second.date).localeCompare(String(first.date)),
    )
    .slice(0, 12);
  return `<section class="sanctuary-memory" aria-labelledby="memory-title" data-reveal><div class="sanctuary-section-heading"><span class="eyebrow red">DO PRIMEIRO AO PRÓXIMO CAPÍTULO</span><h2 id="memory-title">Memória da jornada.</h2></div>${
    entries.length
      ? `<ol class="sanctuary-timeline">${entries
          .map((reward) => {
            const book = state.books.find(
                (entry) => entry.id === reward.bookId,
              ),
              title = book?.title || reward.title || "Livro removido";
            const text =
              book && !book.deletedAt
                ? `<button class="text-button" data-action="detail" data-id="${esc(book.id)}">${esc(title)} ↗</button>`
                : `<strong>${esc(title)}</strong>`;
            return `<li><span class="journey-timeline-mark" aria-hidden="true">${reward.type === "finish" ? "✦" : "❦"}</span><div><time>${dateLabel(reward.date || reward.createdAt)}</time><span>${reward.type === "finish" ? "Livro concluído" : "Leitura iniciada"}</span>${text}</div><small>+${number(reward.xp || reward.amount)} XP</small></li>`;
          })
          .join(
            "",
          )}</ol><p class="monthly-footnote">${entries.length === 1 ? "Seu marco mais recente." : `Seus ${entries.length} marcos mais recentes.`} Conquistas permanecem guardadas mesmo quando você reorganiza o acervo.</p>`
      : '<div class="journey-empty"><span aria-hidden="true">❦</span><h3>Toda jornada tem uma primeira página.</h3><p>Ao iniciar ou concluir um livro, seu próximo marco aparecerá aqui.</p><a class="text-button" href="#leitura">Abrir a Sala de leitura ↗</a></div>'
  }</section>`;
}

/** Monthly progress is computed by the domain, never inferred from the UI. */
export function renderSanctuary({ store, commitPage, month }) {
  const stats = store.stats(),
    state = store.state;
  const selectedMonth = validMonth(month) ? month : stats.today.slice(0, 7);
  const monthly = store.monthlyStats(selectedMonth);
  commitPage(
    heading(
      "CADA PÁGINA DEIXA UMA MARCA",
      "Seu santuário.",
      "Seu tempo, seus objetivos e as histórias que ficam.",
      `<button class="secondary-button" data-action="monthly-goal" data-month="${selectedMonth}">Definir uma meta mensal ↗</button>`,
    ) +
      `<div class="sanctuary"><div class="sanctuary-stat-strip">${[
        [stats.finishedBooks, "LIVROS CONCLUÍDOS"],
        [stats.pages, "PÁGINAS EM SESSÕES"],
        [stats.duration, "MINUTOS DE LEITURA"],
        [stats.bestStreak, "DIAS NO MELHOR RITUAL"],
      ]
        .map(
          ([value, label]) =>
            `<div><strong>${number(value)}</strong><span>${label}</span></div>`,
        )
        .join(
          "",
        )}</div><div class="sanctuary-month-grid">${monthlyGoal(monthly)}<aside class="sanctuary-calendar-column">${readingCalendar(state, selectedMonth, stats.today)}${goalArchive(store, selectedMonth)}</aside></div>${levelAndYear(state, stats)}${achievementList(state, stats, monthly)}${journeyHistory(state)}</div>`,
  );
}
