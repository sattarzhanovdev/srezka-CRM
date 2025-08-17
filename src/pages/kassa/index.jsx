import React, { useEffect, useMemo, useState } from "react";
import styles from "./kassa.module.scss";

const API_BASE = "https://srezka.pythonanywhere.com";
const CATS_URL   = `${API_BASE}/clients/categories/`;
const STOCKS_URL = `${API_BASE}/clients/stocks/`;
const SALES_URL  = `${API_BASE}/clients/sales/`; // поправь если другой роут

export default function Kassa() {
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState("Все");
  const [query, setQuery] = useState("");
  const [payment, setPayment] = useState("cash");
  const [goods, setGoods] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // чек
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, s] = await Promise.all([fetch(CATS_URL), fetch(STOCKS_URL)]);
        const cats = (await c.json()) || [];
        const stocks = (await s.json()) || [];

        setCategories([{ id: 0, name: "Все" }, ...cats]);

        const normalized = stocks.map((g) => {
          const codeArray = Array.isArray(g.code)
            ? g.code
            : (g.code || "").toString().split(",").map(t => t.trim()).filter(Boolean);
          return {
            id: g.id,
            name: g.name,
            subtitle: "",
            price: Number(g.price) || 0,
            stock: Number(g.quantity) || 0,
            categoryName: g.category?.name || "",
            img: "",
            codes: codeArray,
          };
        });
        setGoods(normalized);
      } catch (e) {
        console.error(e);
        alert("Не удалось загрузить данные");
      }
    })();
  }, []);

  const products = useMemo(() => {
    let base = goods;
    if (activeCat !== "Все") base = base.filter(p => p.categoryName === activeCat);
    if (query.trim()) {
      const re = new RegExp(query.trim(), "i");
      base = base.filter(p => re.test(p.name));
    }
    return base;
  }, [goods, activeCat, query]);

  // корзина
  const addToCart = (p, useCode) => {
    const code = useCode || p.codes[0] || "";
    setCart(prev => {
      const ix = prev.findIndex(x => x.id === p.id && x.code === code);
      if (ix >= 0) {
        const next = [...prev];
        next[ix] = { ...next[ix], qty: next[ix].qty + 1 };
        return next;
      }
      return [...prev, { ...p, qty: 1, code }];
    });
  };
  const changeQty = (id, code, d) =>
    setCart(prev => prev.map(x => (x.id === id && x.code === code ? { ...x, qty: Math.max(1, x.qty + d) } : x)));
  const setQty = (id, code, v) =>
    setCart(prev => prev.map(x => (x.id === id && x.code === code ? { ...x, qty: Math.max(1, isNaN(v) ? 1 : v) } : x)));
  const setPrice = (id, code, v) =>
    setCart(prev => prev.map(x => (x.id === id && x.code === code ? { ...x, price: isNaN(v) ? 0 : v } : x)));
  const removeRow = (id, code) =>
    setCart(prev => prev.filter(x => !(x.id === id && x.code === code)));

  const total = useMemo(() => cart.reduce((s, i) => s + i.qty * i.price, 0), [cart]);

  const handleSell = async () => {
    if (!cart.length) return alert("Корзина пуста");
    try {
      setLoading(true);
      const payload = {
        total: total.toFixed(2),
        payment_type: payment, // "cash" | "card"
        items: cart.map(i => ({
          code: i.code,
          name: i.name,
          price: Number(i.price) || 0,
          quantity: i.qty,
          total: (Number(i.price) * i.qty).toFixed(2),
        })),
      };
      const res = await fetch(SALES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data = null;
      if (res.ok) data = await res.json().catch(() => null);

      // Фоллбек: если API вернул мало полей — строим чек из текущих данных
      const builtReceipt = {
        id: data?.id ?? Math.floor(Math.random() * 1e6),
        date: data?.date ?? new Date().toISOString(),
        payment_type: data?.payment_type ?? payment,
        total: data?.total ?? payload.total,
        items: data?.items ?? payload.items,
      };
      setReceipt(builtReceipt);
      setReceiptOpen(true);
      setCart([]);
    } catch (e) {
      console.error(e);
      alert("Не удалось провести продажу");
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => window.print();
  const newReceipt = () => { setReceiptOpen(false); setReceipt(null); };

  return (
    <div className={styles.kassa}>
      <div className={styles.header}>
        <h2>🧾 Касса</h2>
        <div className={styles.payRow}>
          <label>Оплата:</label>
          <select value={payment} onChange={(e) => setPayment(e.target.value)} className={styles.select}>
            <option value="cash">Наличные</option>
            <option value="card">Карта</option>
          </select>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Левая колонка */}
        <div className={styles.cart}>
          <div className={styles.panel}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Наименование</th>
                  <th className={styles.th}>Кол-во</th>
                  <th className={styles.th}>Цена</th>
                  <th className={styles.th}>Сумма</th>
                  <th className={styles.th} style={{ width: 56 }} />
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 && (
                  <tr><td colSpan={5} className={`${styles.td} ${styles.empty}`}>Пусто — выберите товар справа</td></tr>
                )}
                {cart.map(row => (
                  <tr key={`${row.id}-${row.code}`}>
                    <td className={styles.td}>
                      <div className={styles.name}>{row.name}</div>
                      <div className={styles.sub}>{row.subtitle || ""}</div>
                      <div className={styles.code}>Код: {row.code}</div>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.qtyBox}>
                        <button className={`${styles.btn} ${styles.btnQty}`} onClick={() => changeQty(row.id, row.code, -1)}>−</button>
                        <input type="number" min={1} value={row.qty}
                          onChange={(e) => setQty(row.id, row.code, parseInt(e.target.value, 10))}
                          className={styles.inputQty}/>
                        <button className={`${styles.btn} ${styles.btnQty}`} onClick={() => changeQty(row.id, row.code, 1)}>+</button>
                      </div>
                      <div className={styles.stockInfo}>Остаток: {Math.max(0, row.stock - row.qty)} ед</div>
                    </td>
                    <td className={styles.td}>
                      <input type="number" step={0.01} value={row.price}
                        onChange={(e) => setPrice(row.id, row.code, parseFloat(e.target.value))}
                        className={styles.inputPrice}/>
                    </td>
                    <td className={`${styles.td} ${styles.sum}`}>{(row.qty * row.price).toFixed(2)}</td>
                    <td className={styles.td}>
                      <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => removeRow(row.id, row.code)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.cartActions}>
              <div className={styles.totalRow}><span>К оплате:</span><b>{total.toFixed(2)}</b></div>
              <button className={`${styles.btn} ${styles.btnOk}`} onClick={handleSell} disabled={!cart.length || loading}>
                {loading ? "⏳ Продаю..." : "✅ Продать"}
              </button>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.detailsGrid}>
              <div className={styles.detailLine}><span>Цветы</span><b>{total.toFixed(0)}</b></div>
              <div className={styles.detailLine}><span>Услуга</span><span>0</span></div>
              <div className={styles.detailLine}><span>Скидка</span><span>0%</span></div>
              <div className={styles.detailBtns}>
                <button className={styles.btn}>Добавить услугу</button>
                <button className={styles.btn}>Добавить скидку</button>
              </div>
            </div>
          </div>
        </div>

        {/* Правая колонка */}
        <div>
          <div className={styles.tabs}>
            {categories.map(c => (
              <button key={c.id} className={`${styles.btn} ${styles.btnPill} ${c.name === activeCat ? styles.btnActive : ""}`}
                onClick={() => setActiveCat(c.name)}>{c.name}</button>
            ))}
          </div>

          <div className={styles.search}>
            <input placeholder="Поиск по названию…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          <div className={styles.cards}>
            {products.map(p => (
              <button key={p.id} onClick={() => addToCart(p)} className={styles.card}>
                <div className={styles.cardImg}>
                  {p.img ? <img src={p.img} alt="" /> : <div className={styles.noImg}>📦</div>}
                </div>
                <div>
                  <div className={styles.cardName}>{p.name}</div>
                  {p.subtitle && <div className={styles.cardSub}>{p.subtitle}</div>}
                  <div className={styles.cardStock}>Остаток: {p.stock} ед</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Модалка чека */}
      {receiptOpen && (
        <div className={styles.modalWrap}>
          <div className={styles.modal}>
            <h3>Чек</h3>
            <div className={styles.receiptInfo}>
              <div><b>№</b> {receipt?.id ?? "—"}</div>
              <div><b>Дата</b> {(receipt?.date || new Date().toISOString()).slice(0,19).replace("T"," ")}</div>
              <div><b>Оплата</b> {receipt?.payment_type === "card" ? "Карта" : "Наличные"}</div>
            </div>

            <table className={styles.rTable}>
              <thead><tr><th>Наименование</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>
              <tbody>
                {(receipt?.items || []).map((it, i) => (
                  <tr key={i}>
                    <td>{it.name}</td>
                    <td>{it.quantity}</td>
                    <td>{Number(it.price).toFixed(2)}</td>
                    <td>{Number(it.total ?? it.price * it.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3}>Итого</td><td><b>{Number(receipt?.total).toFixed(2)}</b></td></tr>
              </tfoot>
            </table>

            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={newReceipt}>Новый чек</button>
              <button className={`${styles.btn} ${styles.btnOk}`} onClick={printReceipt}>Печать</button>
            </div>
          </div>
        </div>
      )}

      {/* Оверлей загрузки */}
      {loading && (
        <div className={styles.loader}><div className={styles.spinner} /> Обработка…</div>
      )}
    </div>
  );
}