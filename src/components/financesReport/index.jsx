import React, { useEffect, useMemo, useState } from "react";
import styles from "./mainReport.module.scss";
// Если у тебя есть общий API helper — раскомментируй:
// import { API } from "../../api";

const API_BASE = "https://srezka.pythonanywhere.com"; // ← поправь на боевой, если нужно

// Фоллбек-обращения напрямую (если нет API helper)
const api = {
  getSales: async () => {
    const r = await fetch(`${API_BASE}/clients/sales/`);
    return { data: await r.json() };
  },
  getStocks: async () => {
    const r = await fetch(`${API_BASE}/clients/stocks/`);
    return { data: await r.json() };
  },
  getTransactionsSummary: async () => {
    const r = await fetch(`${API_BASE}/clients/transactions/summary/`);
    return { data: await r.json() };
  },
};

const PERIODS = [
  { key: "today",   label: "Сегодня" },
  { key: "7d",      label: "7 дней" },
  { key: "30d",     label: "30 дней" },
  { key: "month",   label: "Текущий месяц" },
  { key: "custom",  label: "Свой период" },
];

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function fmtMoney(n) {
  const v = Number(n || 0);
  return v.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function inRange(iso, from, to) {
  if (!iso) return false;
  const d = new Date(iso);
  return (!from || d >= from) && (!to || d <= to);
}

export default function UnitEconomy() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);              // [{id, total, date, items:[{code,name,price,quantity,total}]}]
  const [stocks, setStocks] = useState([]);            // [{code | [code], price, price_seller, quantity, ...}]
  const [txSummary, setTxSummary] = useState({         // твой summary endpoint
    month: { added_today: 0 },
    daily_expense: 0,
    monthly_expense: 0,
  });

  // фильтр по периоду
  const [period, setPeriod] = useState("30d");
  const [from, setFrom]     = useState(null);
  const [to, setTo]         = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [s, st, t] = await Promise.all([
          // API ? API.getSales() : api.getSales(),
          api.getSales(),
          api.getStocks(),
          api.getTransactionsSummary(),
        ]);
        setSales(Array.isArray(s.data) ? s.data : []);
        setStocks(Array.isArray(st.data) ? st.data : []);
        setTxSummary(t.data || {});
      } catch (e) {
        console.error("Ошибка загрузки юнит-экономики:", e);
        alert("Не удалось загрузить данные для аналитики");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // высчитать границы периода
  useEffect(() => {
    const now = new Date();
    if (period === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      setFrom(start);
      setTo(new Date(start.getTime() + 24 * 3600 * 1000 - 1));
    } else if (period === "7d") {
      const start = new Date(now); start.setDate(now.getDate() - 6);
      setFrom(new Date(start.getFullYear(), start.getMonth(), start.getDate()));
      setTo(now);
    } else if (period === "30d") {
      const start = new Date(now); start.setDate(now.getDate() - 29);
      setFrom(new Date(start.getFullYear(), start.getMonth(), start.getDate()));
      setTo(now);
    } else if (period === "month") {
      const start = startOfMonth(now);
      setFrom(start);
      setTo(now);
    } else if (period === "custom") {
      // не трогаем — руками
    }
  }, [period]);

  // карта себестоимостей по коду
  const costByCode = useMemo(() => {
    const map = new Map();
    for (const s of stocks) {
      // code может быть строкой "1,2" или массивом — нормализуем
      const codes = Array.isArray(s.code)
        ? s.code
        : (s.code || "").toString().split(",").map(x=>x.trim()).filter(Boolean);
      for (const c of codes) {
        // берём последнюю известную себестоимость
        map.set(c, Number(s.price_seller || 0));
      }
    }
    return map;
  }, [stocks]);

  // отфильтрованные продажи по периоду
  const filteredSales = useMemo(() => {
    if (!from && !to) return sales;
    return sales.filter(s => inRange(s.date, from, to));
  }, [sales, from, to]);

  // расчёты
  const calc = useMemo(() => {
    let orders = 0;
    let itemsCnt = 0;
    let revenue = 0;             // выручка
    let servicesRevenue = 0;     // услуги (если проводишь как отдельные позиции)
    let discounts = 0;           // скидки (отрицательные позиции)
    let cogs = 0;                // себестоимость (по Stock.price_seller)
    let returns = 0;             // возвраты (если в items total < 0 и это возврат)
    const productProfit = new Map(); // по SKU: {name, revenue, cogs, profit, qty}

    for (const sale of filteredSales) {
      orders += 1;
      for (const it of sale.items || []) {
        const q = Number(it.quantity) || 0;
        const p = Number(it.price) || 0;
        const lineSum = q * p;

        // классификация позиций
        const isDiscount = p < 0 || String(it.code).toUpperCase() === "DISCOUNT";
        const isService  = String(it.code).toUpperCase() === "SERVICE";

        itemsCnt += q;
        revenue += lineSum;

        if (isDiscount) discounts += lineSum;
        if (isService)  servicesRevenue += lineSum;

        // себестоимость только для товарных позиций
        if (!isDiscount && !isService) {
          const cost = Number(costByCode.get(String(it.code)) || 0);
          cogs += q * cost;

          // агрегация по продукту
          const key = String(it.code || it.name || "unknown");
          const prev = productProfit.get(key) || { name: it.name, revenue: 0, cogs: 0, profit: 0, qty: 0 };
          prev.revenue += lineSum;
          prev.cogs    += q * cost;
          prev.profit   = prev.revenue - prev.cogs;
          prev.qty     += q;
          prev.name     = it.name;
          productProfit.set(key, prev);
        }

        // простая эвристика возврата: отрицательный qty или total (если так у тебя пишется)
        if ((q < 0) || (lineSum < 0 && !isDiscount)) {
          returns += Math.abs(lineSum);
        }
      }
    }

    const grossProfit = revenue - cogs;
    const grossMargin = revenue ? (grossProfit / revenue) : 0;
    const aov = orders ? (revenue / orders) : 0; // средний чек
    const topProducts = Array.from(productProfit.values())
      .sort((a,b) => b.profit - a.profit)
      .slice(0, 10);

    // стоимость склада (на текущий момент)
    let invCost = 0, invRetail = 0;
    for (const s of stocks) {
      const qty = Number(s.quantity) || 0;
      invCost   += qty * Number(s.price_seller || 0);
      invRetail += qty * Number(s.price || 0);
    }

    return {
      orders, itemsCnt, revenue, servicesRevenue, discounts, returns,
      cogs, grossProfit, grossMargin, aov, topProducts,
      invCost, invRetail,
      dailyExpense: Number(txSummary?.daily_expense || 0),
      monthlyExpense: Number(txSummary?.monthly_expense || 0),
    };
  }, [filteredSales, costByCode, stocks, txSummary]);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h2>📊 Юнит-экономика</h2>

        <div className={styles.filters}>
          <div className={styles.periods}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                className={`${styles.btn} ${styles.pill} ${period === p.key ? styles.active : ""}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className={styles.custom}>
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

      {/* Cards row */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Выручка</div>
          <div className={styles.cardValue}>{fmtMoney(calc.revenue)} сом</div>
          <div className={styles.cardHint}>За период</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Себестоимость (COGS)</div>
          <div className={styles.cardValue}>{fmtMoney(calc.cogs)} сом</div>
          <div className={styles.cardHint}>На основе текущего price_seller</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Валовая прибыль</div>
          <div className={styles.cardValue}>{fmtMoney(calc.grossProfit)} сом</div>
          <div className={styles.cardHint}>Маржа: {(calc.grossMargin*100).toFixed(1)}%</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Средний чек (AOV)</div>
          <div className={styles.cardValue}>{fmtMoney(calc.aov)} сом</div>
          <div className={styles.cardHint}>{calc.orders} заказов</div>
        </div>
      </div>

      {/* Breakdown */}
      <div className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>Разложение выручки</div>
          <div className={styles.lines}>
            <div className={styles.line}><span>Товарная выручка</span><b>{fmtMoney(calc.revenue - calc.servicesRevenue - calc.discounts)} сом</b></div>
            <div className={styles.line}><span>Услуги</span><b>{fmtMoney(calc.servicesRevenue)} сом</b></div>
            <div className={styles.line}><span>Скидки</span><b className={styles.red}>{fmtMoney(calc.discounts)} сом</b></div>
            <div className={styles.sep} />
            <div className={styles.line}><span>COGS</span><b>{fmtMoney(calc.cogs)} сом</b></div>
            <div className={styles.line}><span>Возвраты (эвристика)</span><b>{fmtMoney(calc.returns)} сом</b></div>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>Затраты и запас</div>
          <div className={styles.lines}>
            <div className={styles.line}><span>Расходы за сегодня</span><b>{fmtMoney(calc.dailyExpense)} сом</b></div>
            <div className={styles.line}><span>Расходы за месяц</span><b>{fmtMoney(calc.monthlyExpense)} сом</b></div>
            <div className={styles.sep} />
            <div className={styles.line}><span>Стоимость склада (по себестоимости)</span><b>{fmtMoney(calc.invCost)} сом</b></div>
            <div className={styles.line}><span>Розничная стоимость склада</span><b>{fmtMoney(calc.invRetail)} сом</b></div>
          </div>
        </div>
      </div>

      {/* Top products */}
      <div className={styles.panel}>
        <div className={styles.panelTitle}>ТОП SKU по прибыли</div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Товар</th>
                <th>Кол-во</th>
                <th>Выручка</th>
                <th>COGS</th>
                <th>Прибыль</th>
                <th>Маржа</th>
              </tr>
            </thead>
            <tbody>
              {calc.topProducts.length === 0 && (
                <tr><td colSpan={6} className={styles.empty}>Нет данных за выбранный период</td></tr>
              )}
              {calc.topProducts.map((p, i) => (
                <tr key={i}>
                  <td className={styles.left}>{p.name}</td>
                  <td>{p.qty}</td>
                  <td>{fmtMoney(p.revenue)}</td>
                  <td>{fmtMoney(p.cogs)}</td>
                  <td>{fmtMoney(p.profit)}</td>
                  <td>{p.revenue ? ((p.profit / p.revenue) * 100).toFixed(1) : "0.0"}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw orders table (добавляет прозрачности) */}
      <div className={styles.panel}>
        <div className={styles.panelTitle}>Продажи за период</div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>№</th>
                <th>Позиции</th>
                <th>Выручка</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 && (
                <tr><td colSpan={4} className={styles.empty}>Нет продаж в периоде</td></tr>
              )}
              {filteredSales.map((s) => (
                <tr key={s.id}>
                  <td>{(s.date || "").slice(0,19).replace("T"," ")}</td>
                  <td>{s.id}</td>
                  <td>{(s.items || []).reduce((q,i)=>q+(Number(i.quantity)||0),0)}</td>
                  <td>{fmtMoney(Number(s.total || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading && <div className={styles.loader}>Загружаю аналитику…</div>}
    </div>
  );
}