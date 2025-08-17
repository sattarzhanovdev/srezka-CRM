import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoIosArrowRoundBack } from 'react-icons/io';
import { BiPrinter } from 'react-icons/bi';
import s from './receipt.module.scss';

const Receipt = () => {
  const navigate = useNavigate();
  const sale = JSON.parse(localStorage.getItem('receipt'));

  if (!sale) return <p>Нет данных для чека</p>;

  const sum   = Number(sale.total);

  return (
    /* 👇 важно: id статичный, className — из модуля */
    <div id="invoicePos" className={s.invoicePos}>
      <h1 className={s.title}>Чек №{sale.id}</h1>

      <table className={s.table}>
        <thead>
          <tr>
            <th>Поз.</th>
            <th className={s.left}>Товар</th>
            <th>Кол-во</th>
            <th className={s.right}>Сумма</th>
          </tr>
        </thead>

        <tbody>
          {sale.items.map((it, i) => (
            <tr key={it.code}>
              <td>{i + 1}</td>
              <td className={s.left}>{it.name}</td>
              <td>{it.quantity}</td>
              <td className={s.right}>{Number(it.total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr><td colSpan="3">Итого:</td><td className={s.right}>{sum.toFixed(2)}</td></tr>
          <tr className={s.grand}><td colSpan="3">К оплате:</td><td className={s.right}>{sum.toFixed(2)}</td></tr>
        </tfoot>
      </table>

      <p className={s.footer}>Спасибо за покупку!</p>

      {/* кнопки (видимы только на экране) */}
      <div className={s.buttons}>
        <button className={s.back} onClick={() => navigate(-1)}><IoIosArrowRoundBack /></button>
        <button className={s.print} onClick={() => window.print()}>Печать&nbsp;<BiPrinter /></button>
      </div>
    </div>
  );
};

export default Receipt;