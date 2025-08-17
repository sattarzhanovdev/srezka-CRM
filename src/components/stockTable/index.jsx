import React from 'react';
import c from './workers.module.scss';
import { Icons } from '../../assets/icons';
import { API } from '../../api';
import { Components } from '..';
// import Barcode from 'react-barcode';

const STOCK_API = 'https://srezka.pythonanywhere.com'; // ← без завершающего слэша

const StockTable = () => {
  const [month, setMonth] = React.useState('');
  const [clients, setClients] = React.useState([]);        // ← по умолчанию массив
  const [active, setActive] = React.useState(false);
  const [editActive, setEditActive] = React.useState(false);
  const [selectedWeek, setSelectedWeek] = React.useState(5);
  const [categories, setCategories] = React.useState([]);
  const [selectedCategory, setSelectedCategory] = React.useState(''); // будем хранить ID в виде строки

  React.useEffect(() => {
    const now = new Date();
    const monthName = now.toLocaleString('ru', { month: 'long' });
    setMonth(monthName.charAt(0).toUpperCase() + monthName.slice(1));

    // товары
    fetch(`${STOCK_API}/clients/stocks/`)
      .then(res => res.json())
      .then(data => setClients(Array.isArray(data) ? data.slice().reverse() : []))
      .catch(err => console.error('Ошибка загрузки товаров:', err));
  }, []);

  React.useEffect(() => {
    // категории
    fetch(`${STOCK_API}/clients/categories/`)
      .then(res => res.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(err => console.error('Ошибка загрузки категорий:', err));
  }, []);

  const getWeekNumber = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    const day = d.getDate();
    if (day >= 1 && day <= 7) return 1;
    if (day >= 8 && day <= 14) return 2;
    if (day >= 15 && day <= 21) return 3;
    if (day >= 22) return 4;
    return null;
  };

  const filterGoods = () => {
    let filtered = clients;

    // фильтр по неделе (если нужен)
    if (selectedWeek !== 5) {
      filtered = filtered?.filter(item => getWeekNumber(item.appointment_date) === selectedWeek);
    }

    // фильтр по категории (по ID, а не по имени)
    if (selectedCategory) {
      filtered = filtered?.filter(item => {
        const catId = item?.category?.id;
        return String(catId || '') === String(selectedCategory);
      });
    }

    return filtered || [];
  };

  const filteredItems = filterGoods();

  const totalAdded      = filteredItems.reduce((a, b) => a + Number(b.fixed_quantity || 0), 0);
  const totalLeft       = filteredItems.reduce((a, b) => a + Number(b.quantity || 0), 0);
  const totalBuyAmount  = filteredItems.reduce((a, b) => a + Number((b.price_seller || 0) * (b.fixed_quantity || 0)), 0);
  const totalSellAmount = filteredItems.reduce((a, b) => a + Number((b.price || 0) * (b.fixed_quantity || 0)), 0);

  return (
    <div className={c.workers}>
      <div className={c.table}>
        <div className={c.filtersRow}>
          <select
            className={c.filteration}
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="">‒ Все категории ‒</option>
            {categories.map(item => (
              <option key={item.id} value={String(item.id)}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <table>
          <thead>
            <tr>
              <th>_</th>
              <th>{filteredItems.length} позиций</th>
              <th></th>
              <th>{totalAdded}</th>
              <th>{totalLeft}</th>
              <th>{totalBuyAmount} сом</th>
              <th>{totalSellAmount} сом</th>
              <th></th>
            </tr>
            <tr>
              <th><img src={Icons.edit} alt="edit" /></th>
              <th>№</th>
              <th>Наименование</th>
              <th>Было добавлено</th>
              <th>Осталось</th>
              <th>Цена поставщика</th>
              <th>Цена продажи</th>
              <th>
                <button onClick={() => setActive(true)}>+ Добавить</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item, i) => {
                const qty = Number(item.quantity || 0);
                const rowStyle =
                  qty <= 30 ? { background: 'rgba(255, 0, 0, 0.15)' } :
                  qty <= 50 ? { background: 'rgba(255, 255, 0, 0.15)' } :
                  {};

                return (
                  <tr key={item.id} style={rowStyle}>
                    <td>
                      <img
                        src={Icons.edit}
                        alt="edit"
                        onClick={() => {
                          localStorage.setItem('editStock', JSON.stringify(item));
                          setEditActive(true);
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td>{i + 1}</td>
                    <td>{item.name}</td>
                    <td>{item.fixed_quantity}</td>
                    <td>{item.quantity}</td>
                    <td>{item.price_seller}</td>
                    <td>{item.price}</td>
                    {/* Если нужен штрихкод, раскомментируй и проверь формат code */}
                    {/* <td>
                      {item.code ? (
                        <Barcode
                          value={Array.isArray(item.code) ? (item.code[0] || '') : String(item.code).split(',')[0]?.trim() || ''}
                          width={0.6}
                          height={20}
                          fontSize={12}
                        />
                      ) : <span>Нет кода</span>}
                    </td> */}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#888' }}>Товаров нет</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editActive && <Components.EditStock setActive={setEditActive} selectedBranch="karabalta" />}
      {active && <Components.AddStock setActive={setActive} selectedBranch="karabalta" />}
    </div>
  );
};

export default StockTable;