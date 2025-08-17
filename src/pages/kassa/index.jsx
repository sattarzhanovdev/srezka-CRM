import React, { act, useEffect, useMemo, useState } from "react";
import styles from "./kassa.module.scss";

const API_BASE   = "https://srezka.pythonanywhere.com";
const CATS_URL   = `${API_BASE}/clients/categories/`;
const STOCKS_URL = `${API_BASE}/clients/stocks/`;
const SALES_URL  = `${API_BASE}/clients/sales/`;

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

  // модалки: скидка / услуга
  const [discountOpen, setDiscountOpen] = useState(false);
  const [serviceOpen, setServiceOpen]   = useState(false);

  // формы модалок
  const [discountForm, setDiscountForm] = useState({ name: "Скидка", qty: 1, price: 0 });
  const [serviceForm,  setServiceForm]  = useState({ name: "", qty: 1, price: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [c, s] = await Promise.all([fetch(CATS_URL), fetch(STOCKS_URL)]);
        const cats   = (await c.json()) || [];
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
            stock: Number(g.quantity) || 0,     // остаток
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

  // суммы
  const goodsTotal    = useMemo(() => cart.filter(x => !x.isDiscount && !x.isService)
                                      .reduce((s, i) => s + i.qty * i.price, 0), [cart]);
  const servicesTotal = useMemo(() => cart.filter(x => x.isService)
                                      .reduce((s, i) => s + i.qty * i.price, 0), [cart]);
  const discountsTotal = useMemo(() => cart.filter(x => x.isDiscount)
                                      .reduce((s, i) => s + i.qty * i.price, 0), [cart]); // отрицательное
  const total = goodsTotal + servicesTotal + discountsTotal;

  const anyOverstock = cart.some(row => typeof row.stock === "number" && row.qty > row.stock);

  // общее кол-во этого товара уже в корзине (по id)
  const getCartQtyByProduct = (productId) =>
    cart.filter(x => x.id === productId && !x.isService && !x.isDiscount)
        .reduce((s, i) => s + i.qty, 0);

  // ——— корзина (товары) с ограничением по stock ———
  const addToCart = (p, useCode) => {
    if ((p.stock || 0) <= 0) {
      alert("Нет остатка на складе");
      return;
    }
    const code = useCode || p.codes?.[0] || "";
    setCart(prev => {
      const already = prev.filter(x => x.id === p.id && !x.isService && !x.isDiscount)
                          .reduce((s, i) => s + i.qty, 0);
      if (already >= p.stock) {
        alert("Недостаточно остатка");
        return prev;
      }
      const ix = prev.findIndex(x => x.id === p.id && x.code === code && !x.isService && !x.isDiscount);
      if (ix >= 0) {
        const nextQty = prev[ix].qty + 1;
        if (nextQty + (already - prev[ix].qty) > p.stock) {
          alert("Недостаточно остатка");
          return prev;
        }
        const next = [...prev];
        next[ix] = { ...next[ix], qty: nextQty };
        return next;
      }
      return [...prev, { ...p, qty: 1, code }];
    });
  };

  const changeQty = (id, code, d) =>
    setCart(prev => prev.map(x => {
      // услуги/скидки не ограничиваем складом
      if (x.isService || x.isDiscount) {
        if (!(x.id === id && x.code === code)) return x;
        const nextQty = Math.max(1, x.qty + d);
        return { ...x, qty: nextQty };
      }
      if (!(x.id === id && x.code === code)) return x;
      const currentTotalOthers = prev
        .filter(o => o.id === id && !(o.id === id && o.code === code))
        .reduce((s, i) => s + (i.isService || i.isDiscount ? 0 : i.qty), 0);
      const nextQty = Math.max(1, x.qty + d);
      const maxAllowed = Math.max(0, (x.stock ?? 0) - currentTotalOthers);
      return { ...x, qty: Math.min(nextQty, maxAllowed || 1) };
    }));

  const setQty = (id, code, v) =>
    setCart(prev => prev.map(x => {
      const clean = isNaN(v) ? 1 : Math.max(1, Math.floor(v));
      if (x.isService || x.isDiscount) {
        if (!(x.id === id && x.code === code)) return x;
        return { ...x, qty: clean };
      }
      if (!(x.id === id && x.code === code)) return x;
      const currentTotalOthers = prev
        .filter(o => o.id === id && !(o.id === id && o.code === code))
        .reduce((s, i) => s + (i.isService || i.isDiscount ? 0 : i.qty), 0);
      const maxAllowed = Math.max(1, (x.stock ?? 0) - currentTotalOthers);
      return { ...x, qty: Math.min(clean, maxAllowed) };
    }));

  const setPrice = (id, code, v) =>
    setCart(prev => prev.map(x => (x.id === id && x.code === code ? { ...x, price: isNaN(v) ? 0 : v } : x)));

  const removeRow = (id, code) =>
    setCart(prev => prev.filter(x => !(x.id === id && x.code === code)));

  // ——— добавление СКИДКИ/УСЛУГИ ———
  const addDiscount = () => {
    const name = (discountForm.name || "Скидка").trim();
    const qty  = Math.max(1, Number(discountForm.qty) || 1);
    let price  = Number(discountForm.price) || 0;
    if (price > 0) price = -price; // скидка всегда минус
    if (!price) return alert("Введите сумму скидки");

    setCart(prev => [
      ...prev,
      {
        id: `disc-${Date.now()}`,
        code: "DISCOUNT",
        name,
        subtitle: "",
        qty,
        price,
        isDiscount: true, // помечаем
      },
    ]);
    setDiscountOpen(false);
    setDiscountForm({ name: "Скидка", qty: 1, price: 0 });
  };

  const addService = () => {
    const name = (serviceForm.name || "").trim();
    const qty  = Math.max(1, Number(serviceForm.qty) || 1);
    const price = Number(serviceForm.price) || 0;
    if (!name)  return alert("Укажите наименование услуги");
    if (!price) return alert("Укажите стоимость услуги > 0");

    setCart(prev => [
      ...prev,
      {
        id: `svc-${Date.now()}`,
        code: "SERVICE",
        name,
        subtitle: "",
        qty,
        price,
        isService: true, // помечаем
      },
    ]);
    setServiceOpen(false);
    setServiceForm({ name: "", qty: 1, price: 0 });
  };

  // ——— продажа с валидацией ———
  const handleSell = async () => {
    if (!cart.length) return alert("Корзина пуста");

    // финальная проверка остатков (только для товарных позиций)
    for (const row of cart) {
      if (!row.isService && !row.isDiscount && typeof row.stock === "number" && row.qty > row.stock) {
        alert(`Недостаточно остатка: «${row.name}». Доступно: ${row.stock}`);
        return;
      }
    }

    try {
      setLoading(true);

      // отправляем в бек только товарные строки (чтобы не падал serializer),
      // а total — по всему чеку (товары + услуги + скидки)
      const backendItems = cart
        .filter(i => !i.isService && !i.isDiscount)
        .map(i => ({
          code: i.code,
          name: i.name,
          price: Number(i.price) || 0,
          quantity: i.qty,
          total: (Number(i.price) * i.qty).toFixed(2),
        }));

      const payload = {
        total: total.toFixed(2),
        payment_type: payment,
        items: backendItems,
      };

      const res = await fetch(SALES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data = null;
      if (res.ok) data = await res.json().catch(() => null);

      // чек на фронте — со всеми позициями
      const receiptItems = cart.map(i => ({
        code: i.code,
        name: i.name,
        price: Number(i.price) || 0,
        quantity: i.qty,
        total: (Number(i.price) * i.qty),
      }));

      const builtReceipt = {
        id: data?.id ?? Math.floor(Math.random() * 1e6),
        date: data?.date ?? new Date().toISOString(),
        payment_type: data?.payment_type ?? payment,
        total: total.toFixed(2),
        items: receiptItems,
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
                {cart.map(row => {
                  const isFreeQty = row.isService || row.isDiscount;
                  const maxForThisLine = isFreeQty
                    ? undefined
                    : Math.max(1, row.stock - (getCartQtyByProduct(row.id) - row.qty));
                  const over = !isFreeQty && typeof row.stock === "number" && row.qty > row.stock;

                  return (
                    <tr key={`${row.id}-${row.code}`}>
                      <td className={styles.td}>
                        <div className={styles.name}>
                          {row.name}
                          {row.isDiscount && <span className={styles.badgeRed}>Скидка</span>}
                          {row.isService && <span className={styles.badgeBlue}>Услуга</span>}
                        </div>
                        <div className={styles.sub}>{row.subtitle || ""}</div>
                        {!isFreeQty && <div className={styles.code}>Код: {row.code}</div>}
                      </td>

                      <td className={styles.td}>
                        <div className={styles.qtyBox}>
                          <button
                            className={`${styles.btn} ${styles.btnQty}`}
                            onClick={() => changeQty(row.id, row.code, -1)}
                            disabled={row.qty <= 1}
                          >−</button>
                          <input
                            type="number"
                            min={1}
                            {...(!isFreeQty ? { max: maxForThisLine } : {})}
                            value={row.qty}
                            onChange={(e) => setQty(row.id, row.code, parseInt(e.target.value, 10))}
                            className={styles.inputQty}
                          />
                          <button
                            className={`${styles.btn} ${styles.btnQty}`}
                            onClick={() => changeQty(row.id, row.code, 1)}
                            disabled={!isFreeQty && row.qty >= maxForThisLine}
                          >+</button>
                        </div>
                        {!isFreeQty && (
                          <div className={styles.stockInfo}>
                            Остаток: {Math.max(0, row.stock - getCartQtyByProduct(row.id))} ед
                          </div>
                        )}
                        {over && (
                          <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                            Превышен остаток!
                          </div>
                        )}
                      </td>

                      <td className={styles.td}>
                        <input
                          type="number"
                          step={0.01}
                          value={row.price}
                          onChange={(e) => setPrice(row.id, row.code, parseFloat(e.target.value))}
                          className={styles.inputPrice}
                        />
                      </td>

                      <td className={`${styles.td} ${styles.sum}`}>
                        {(row.qty * row.price).toFixed(2)}
                      </td>

                      <td className={styles.td}>
                        <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => removeRow(row.id, row.code)}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className={styles.cartActions}>
              <div className={styles.totalRow}>
                <span>К оплате:</span>
                <b>{total.toFixed(2)}</b>
              </div>
              <button
                className={`${styles.btn} ${styles.btnOk}`}
                onClick={handleSell}
                disabled={!cart.length || loading || anyOverstock}
                title={anyOverstock ? "Исправьте количество — превышен остаток" : ""}
              >
                {loading ? "⏳ Продаю..." : "✅ Продать"}
              </button>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.detailsGrid}>
              <div className={styles.detailLine}><span>Товары</span><b>{goodsTotal.toFixed(2)}</b></div>
              <div className={styles.detailLine}><span>Услуги</span><b>{servicesTotal.toFixed(2)}</b></div>
              <div className={styles.detailLine}><span>Скидки</span><b style={{color:'#ef4444'}}>{discountsTotal.toFixed(2)}</b></div>
              <div className={styles.detailBtns}>
                <button className={styles.btn} onClick={() => setServiceOpen(true)}>Добавить услугу</button>
                <button className={styles.btn} onClick={() => setDiscountOpen(true)}>Добавить скидку</button>
              </div>
            </div>
          </div>
        </div>

        {/* Правая колонка */}
        <div>
          <div className={styles.tabs}>
            {categories.map(c => (
              <button
                key={c.id}
                className={`${styles.btn} ${styles.btnPill} ${c.name === activeCat ? styles.btnActive : ""}`}
                onClick={() => setActiveCat(c.name)}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className={styles.search}>
            <input placeholder="Поиск по названию…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          <div className={styles.cards}>
            {products.map(p => {
              const already = getCartQtyByProduct(p.id);
              const noStock = (p.stock || 0) <= 0 || already >= p.stock;
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={styles.card}
                  disabled={noStock}
                  title={noStock ? "Нет остатка" : ""}
                >
                  <div className={styles.cardImg}>
                    {p.img ? <img src={p.img} alt="" /> : <div className={styles.noImg}>📦</div>}
                  </div>
                  <div>
                    <div className={styles.cardName}>{p.name}</div>
                    {p.subtitle && <div className={styles.cardSub}>{p.subtitle}</div>}
                    <div className={styles.cardStock}>
                      Остаток: {Math.max(0, p.stock - already)} ед
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Модалка: СКИДКА */}
      {discountOpen && (
        <div className={styles.modalWrap} onMouseDown={() => setDiscountOpen(false)}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <h3>Добавить скидку</h3>
            <div className={styles.formRow}>
              <label>Наименование</label>
              <input
                className={styles.input}
                value={discountForm.name}
                onChange={e => setDiscountForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Скидка"
              />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formRow}>
                <label>Количество</label>
                <input
                  type="number"
                  className={styles.input}
                  min={1}
                  value={discountForm.qty}
                  onChange={e => setDiscountForm(f => ({ ...f, qty: parseInt(e.target.value || "1", 10) }))}
                />
              </div>
              <div className={styles.formRow}>
                <label>Сумма (положительная)</label>
                <input
                  type="number"
                  step={0.01}
                  className={styles.input}
                  value={discountForm.price}
                  onChange={e => setDiscountForm(f => ({ ...f, price: parseFloat(e.target.value || "0") }))}
                  placeholder="например 100"
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={() => setDiscountOpen(false)}>Отмена</button>
              <button className={`${styles.btn} ${styles.btnOk}`} onClick={addDiscount}>Добавить</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка: УСЛУГА */}
      {serviceOpen && (
        <div className={styles.modalWrap} onMouseDown={() => setServiceOpen(false)}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <h3>Добавить услугу</h3>
            <div className={styles.formRow}>
              <label>Наименование</label>
              <input
                className={styles.input}
                value={serviceForm.name}
                onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Например: Доставка"
              />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formRow}>
                <label>Количество</label>
                <input
                  type="number"
                  className={styles.input}
                  min={1}
                  value={serviceForm.qty}
                  onChange={e => setServiceForm(f => ({ ...f, qty: parseInt(e.target.value || "1", 10) }))}
                />
              </div>
              <div className={styles.formRow}>
                <label>Стоимость</label>
                <input
                  type="number"
                  step={0.01}
                  className={styles.input}
                  value={serviceForm.price}
                  onChange={e => setServiceForm(f => ({ ...f, price: parseFloat(e.target.value || "0") }))}
                  placeholder="например 150"
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={() => setServiceOpen(false)}>Отмена</button>
              <button className={`${styles.btn} ${styles.btnOk}`} onClick={addService}>Добавить</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка чека */}
      {receiptOpen && (
        <div className={styles.modalWrap} onMouseDown={() => setReceiptOpen(false)}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <h3>Чек</h3>
            <div className={styles.receiptInfo}>
              <div><b>№</b> {receipt?.id ?? "—"}</div>
              <div><b>Дата</b> {(receipt?.date || new Date().toISOString()).slice(0,19).replace("T"," ")}</div>
              <div><b>Оплата</b> {receipt?.payment_type === "card" ? "Карта" : "Наличные"}</div>
            </div>

            <h3>Оплачено!</h3>
            <div className={styles.modalActions}>
              <button 
                className={styles.btn} 
                onClick={() => {
                  newReceipt()
                  window.location.reload(); // перезагружаем страницу, чтобы обновить данные
                }}
              >
                Закрыть
              </button>
            </div>

            {/* <table className={styles.rTable}>
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
            </table> */}

            {/* <div className={styles.modalActions}>
              <button className={styles.btn} onClick={newReceipt}>Новый чек</button>
              <button className={`${styles.btn} ${styles.btnOk}`} onClick={printReceipt}>Печать</button>
            </div> */}
          </div>
        </div>
      )}

      {loading && (
        <div className={styles.loader}><div className={styles.spinner} /> Обработка…</div>
      )}
    </div>
  );
}