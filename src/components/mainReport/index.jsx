import React, { useEffect, useMemo, useState } from "react";
import c from "./mainReport.module.scss";
import { Icons } from "../../assets/icons";
import { API } from "../../api";

// --- helpers ---
const fmt = (v) => Number(v || 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
const dateKey = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

const PERIODS = [
  { key: "month", label: "Текущий месяц" },
  { key: "7d", label: "7 дней" },
  { key: "30d", label: "30 дней" },
  { key: "today", label: "Сегодня" },
  { key: "custom", label: "Свой период" },
];

export default function MainReport() {
  const [sales, setSales] = useState([]);         // [{id,total,date,payment_type,items:[{quantity,price,...}]}]
  const [tx, setTx] = useState([]);               // [{id, type: 'income'|'expense', amount, date, ...}]
  const [loading, setLoading] = useState(true);

  // период
  const [period, setPeriod] = useState("month");
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);

  // для шапки с «оборот/прибыль»
  const [benefit, setBenefit] = useState(0);

  // загрузка
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [salesRes, txRes] = await Promise.all([API.getSales(), API.getTransactions()]);
        const salesData = Array.isArray(salesRes?.data) ? salesRes.data : [];
        const txData = Array.isArray(txRes?.data) ? txRes.data : [];
        setSales(salesData);
        setTx(txData);

        // оборот за всё время (можно не считать, но оставляю чтобы твой блок «оборот/прибыль» заполнялся)
        setBenefit(salesData.reduce((s, v) => s + Number(v.total || 0), 0));
      } catch (e) {
        console.error("Ошибка загрузки MainReport:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // авто-границы периода
  useEffect(() => {
    const now = new Date();
    if (period === "month") {
      setFrom(startOfMonth(now));
      setTo(endOfMonth(now));
    } else if (period === "7d") {
      const s = new Date(now); s.setDate(s.getDate() - 6);
      setFrom(new Date(s.getFullYear(), s.getMonth(), s.getDate()));
      setTo(now);
    } else if (period === "30d") {
      const s = new Date(now); s.setDate(s.getDate() - 29);
      setFrom(new Date(s.getFullYear(), s.getMonth(), s.getDate()));
      setTo(now);
    } else if (period === "today") {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const e = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59, 59);
      setFrom(s); setTo(e);
    }
    // custom — руками
  }, [period]);

  const inRange = (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    return (!from || d >= from) && (!to || d <= to);
  };

  // отфильтрованные массивы
  const fSales = useMemo(() => sales.filter(s => inRange(s.date)), [sales, from, to]);
  const fTx = useMemo(() => tx.filter(t => inRange(t.date)), [tx, from, to]);

  // агрегаты
  const stats = useMemo(() => {
    // продажи
    const orders = fSales.length;
    const revenue = fSales.reduce((s, v) => s + Number(v.total || 0), 0);
    const itemsSold = fSales.reduce((s, v) => s + (v.items || []).reduce((q, i) => q + Number(i.quantity || 0), 0), 0);
    const aov = orders ? revenue / orders : 0;

    // оплата
    const cash = fSales.filter(s => (s.payment_type || "").toLowerCase() === "cash")
      .reduce((s, v) => s + Number(v.total || 0), 0);
    const card = fSales.filter(s => (s.payment_type || "").toLowerCase() === "card")
      .reduce((s, v) => s + Number(v.total || 0), 0);

    // расходы (из Transaction)
    const expense = fTx.filter(t => t.type === "expense").reduce((s, v) => s + Number(v.amount || 0), 0);
    const income = fTx.filter(t => t.type === "income").reduce((s, v) => s + Number(v.amount || 0), 0);

    // «прибыль» (как ты считаешь во Front: выручка - расходы)
    const profit = revenue - expense;

    return { orders, itemsSold, revenue, aov, cash, card, expense, income, profit };
  }, [fSales, fTx]);

  // сравнение с прошлым месяцем
  const compare = useMemo(() => {
    if (!from || !to) return { revDeltaPct: 0, expDeltaPct: 0, proDeltaPct: 0 };
    const curRev = stats.revenue;
    const curExp = stats.expense;
    const curProf = stats.profit;

    const prevEnd = new Date(from); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = startOfMonth(prevEnd);

    const isPrevRange = (iso) => {
      if (!iso) return false;
      const d = new Date(iso);
      return d >= prevStart && d <= endOfMonth(prevEnd);
    };

    const prevSales = sales.filter(s => isPrevRange(s.date));
    const prevTx = tx.filter(t => isPrevRange(t.date));

    const prevRev = prevSales.reduce((s, v) => s + Number(v.total || 0), 0);
    const prevExp = prevTx.filter(t => t.type === "expense").reduce((s, v) => s + Number(v.amount || 0), 0);
    const prevProf = prevRev - prevExp;

    const pct = (cur, prev) => (prev ? ((cur - prev) / prev) * 100 : (cur ? 100 : 0));
    return {
      revDeltaPct: pct(curRev, prevRev),
      expDeltaPct: pct(curExp, prevExp),
      proDeltaPct: pct(curProf, prevProf),
    };
  }, [from, to, stats, sales, tx]);

  // тренд по дням (барчарт div-ами)
  const trend = useMemo(() => {
    if (!from || !to) return { days: [], sales: [], expenses: [], max: 0 };
    const days = [];
    const cur = new Date(from);
    const end = new Date(to);
    cur.setHours(0,0,0,0); end.setHours(0,0,0,0);

    const salesAgg = {};
    const expAgg = {};

    for (const s of fSales) {
      const k = dateKey(s.date);
      salesAgg[k] = (salesAgg[k] || 0) + Number(s.total || 0);
    }
    for (const t of fTx.filter(x => x.type === "expense")) {
      const k = dateKey(t.date);
      expAgg[k] = (expAgg[k] || 0) + Number(t.amount || 0);
    }

    while (cur <= end) {
      const k = cur.toISOString().slice(0,10);
      days.push(k.slice(8,10)); // день месяца
      cur.setDate(cur.getDate() + 1);
    }

    const salesArr = days.map((d, i) => {
      // восстановим yyyy-mm-dd
      const base = new Date(from);
      base.setDate(base.getDate() + i);
      const key = base.toISOString().slice(0,10);
      return salesAgg[key] || 0;
    });
    const expArr = days.map((d, i) => {
      const base = new Date(from);
      base.setDate(base.getDate() + i);
      const key = base.toISOString().slice(0,10);
      return expAgg[key] || 0;
    });

    const max = Math.max(1, ...salesArr, ...expArr);
    return { days, sales: salesArr, expenses: expArr, max };
  }, [from, to, fSales, fTx]);

  // последние продажи/расходы (для таблиц)
  const recentSales = useMemo(
    () => [...fSales].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10),
    [fSales]
  );
  const recentExpenses = useMemo(
    () => [...fTx.filter(t => t.type === "expense")].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10),
    [fTx]
  );

  return (
    <div className={c.wrap}>
      <div className={c.header}>
        <div className={c.hLeft}>
          <h2>📊 Главный отчёт</h2>
          <div className={c.sub}>Все ключевые метрики за выбранный период</div>
        </div>

        <div className={c.filters}>
          <div className={c.periods}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                className={`${c.btn} ${c.pill} ${period === p.key ? c.active : ""}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className={c.custom}>
              <label>
                От
                <input
                  type="date"
                  value={from ? new Date(from).toISOString().slice(0,10) : ""}
                  onChange={e => setFrom(e.target.value ? new Date(e.target.value) : null)}
                />
              </label>
              <label>
                До
                <input
                  type="date"
                  value={to ? new Date(to).toISOString().slice(0,10) : ""}
                  onChange={e => setTo(e.target.value ? new Date(e.target.value) : null)}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Верхние KPI-карточки */}
      <div className={c.cards}>
        <div className={c.card}>
          <div className={c.cardUp}>
            <img src={Icons.date} alt="" /><h3>Оборот (выручка)</h3>
          </div>
          <div className={c.cardDown}>
            <div className={c.value}>{fmt(stats.revenue)} сом</div>
            <div className={c.delta} data-positive={compare.revDeltaPct >= 0}>
              {compare.revDeltaPct >= 0 ? "▲" : "▼"} {fmt(Math.abs(compare.revDeltaPct))}%
              <span>к прошлому месяцу</span>
            </div>
          </div>
        </div>

        <div className={c.card}>
          <div className={c.cardUp}>
            <img src={Icons.expenses} alt="" /><h3>Расходы</h3>
          </div>
          <div className={c.cardDown}>
            <div className={c.value}>{fmt(stats.expense)} сом</div>
            <div className={c.delta} data-positive={compare.expDeltaPct < 0}>
              {compare.expDeltaPct < 0 ? "▲" : "▼"} {fmt(Math.abs(compare.expDeltaPct))}%
              <span>меньше/больше прошл. мес.</span>
            </div>
          </div>
        </div>

        <div className={c.card}>
          <div className={c.cardUp}>
            <img src={Icons.document} alt="" /><h3>Прибыль (выручка − расходы)</h3>
          </div>
          <div className={c.cardDown}>
            <div className={c.value}>{fmt(stats.profit)} сом</div>
            <div className={c.delta} data-positive={compare.proDeltaPct >= 0}>
              {compare.proDeltaPct >= 0 ? "▲" : "▼"} {fmt(Math.abs(compare.proDeltaPct))}%
              <span>к прошлому месяцу</span>
            </div>
          </div>
        </div>

        <div className={c.card}>
          <div className={c.cardUp}>
            <img src={Icons.date} alt="" /><h3>Средний чек</h3>
          </div>
          <div className={c.cardDown}>
            <div className={c.value}>{fmt(stats.aov)} сом</div>
            <div className={c.rowMini}>
              <div><b>{stats.orders}</b><span>заказов</span></div>
              <div><b>{stats.itemsSold}</b><span>тов. позиций</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Разложение оплат + мини-барчарт */}
      <div className={c.grid2}>
        <div className={c.panel}>
          <div className={c.panelTitle}>Разложение оплат</div>
          <div className={c.paySplit}>
            <div className={c.splitRow}>
              <span>Наличные</span>
              <b>{fmt(stats.cash)} сом</b>
            </div>
            <div className={c.progress}>
              <div
                className={c.barCash}
                style={{ width: `${stats.revenue ? (stats.cash / stats.revenue) * 100 : 0}%` }}
              />
            </div>
            <div className={c.splitRow}>
              <span>Карта</span>
              <b>{fmt(stats.card)} сом</b>
            </div>
            <div className={c.progress}>
              <div
                className={c.barCard}
                style={{ width: `${stats.revenue ? (stats.card / stats.revenue) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className={c.panel}>
          <div className={c.panelTitle}>Тренд: выручка vs расходы</div>
          <div className={c.chart}>
            <div className={c.chartInner}>
              {trend.days.map((d, i) => {
                const sH = Math.round((trend.sales[i] / trend.max) * 100);
                const eH = Math.round((trend.expenses[i] / trend.max) * 100);
                return (
                  <div className={c.col} key={i} title={`День ${d}\nВыручка: ${fmt(trend.sales[i])}\nРасходы: ${fmt(trend.expenses[i])}`}>
                    <div className={c.barSales} style={{ height: `${sH}%` }} />
                    <div className={c.barExpenses} style={{ height: `${eH}%` }} />
                    <div className={c.colLabel}>{d}</div>
                  </div>
                );
              })}
            </div>
            <div className={c.legend}>
              <span className={c.dotSales} /> выручка
              <span className={c.dotExpenses} /> расходы
            </div>
          </div>
        </div>
      </div>

      {/* Таблицы: последние продажи/расходы */}
      <div className={c.grid2}>
        <div className={c.panel}>
          <div className={c.panelTitle}>Последние продажи</div>
          <div className={c.tableWrap}>
            <table className={c.table}>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Оплата</th>
                  <th>Позиций</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.length === 0 && (
                  <tr><td colSpan={4} className={c.empty}>Нет продаж за период</td></tr>
                )}
                {recentSales.map((s) => (
                  <tr key={s.id}>
                    <td>{(s.date || "").slice(0,19).replace("T"," ")}</td>
                    <td className={c.cap}>{(s.payment_type || "").toLowerCase() === "card" ? "Карта" : "Наличные"}</td>
                    <td>{(s.items || []).reduce((q,i)=>q+Number(i.quantity||0),0)}</td>
                    <td><b>{fmt(s.total)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={c.panel}>
          <div className={c.panelTitle}>Последние расходы</div>
          <div className={c.tableWrap}>
            <table className={c.table}>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>ID</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.length === 0 && (
                  <tr><td colSpan={3} className={c.empty}>Нет расходов за период</td></tr>
                )}
                {recentExpenses.map((t) => (
                  <tr key={t.id}>
                    <td>{(t.date || "").slice(0,19).replace("T"," ")}</td>
                    <td>{t.id}</td>
                    <td><b>{fmt(t.amount)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Твой старый блок — сохранил, но сделал аккуратнее */}
      <div className={c.cards2}>
        <div className={c.cardMini}>
          <div className={c.cardUp}><img src={Icons.date} alt="date" /><h3>Оборот / Прибыль (all-time)</h3></div>
          <div className={c.cardDownRow}>
            <div className={c.big}>{fmt(benefit)} сом</div>
            <div className={c.bigMuted}>/ {fmt(benefit - stats.expense)} сом</div>
          </div>
        </div>

        <div className={c.cardMini}>
          <div className={c.cardUp}><img src={Icons.expenses} alt="expenses" /><h3>Расходы (период)</h3></div>
          <div className={c.cardDownRow}>
            <div className={c.big}>{fmt(stats.expense)} сом</div>
          </div>
        </div>
      </div>

      {loading && <div className={c.loader}>Загружаю отчёт…</div>}
    </div>
  );
}