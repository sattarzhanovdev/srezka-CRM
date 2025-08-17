import React from 'react';
import c from './workers.module.scss';
import { periods } from '../../utils';
import { Icons } from '../../assets/icons';
import { API } from '../../api';
import { Components } from '..';

const ClientsTable = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const [clients, setClients] = React.useState(null);
  const [active, setActive] = React.useState(false);
  const [editActive, setEditActive] = React.useState(false);
  const [selectedWeek, setSelectedWeek] = React.useState(5); // 5 — Весь месяц
  const [selectedMonthIndex, setSelectedMonthIndex] = React.useState(currentMonth);
  const [selectedYear, setSelectedYear] = React.useState(currentYear);

  const monthList = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const yearList = [2024, 2025];

  React.useEffect(() => {
    API.getClients()
      .then(res => {
        setClients(res.data);
      });
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('ru-RU', { month: 'long' });
    return `${day} ${month}`;
  };

  const getWeekNumber = (dateStr) => {
    const day = new Date(dateStr).getDate();
    if (day >= 1 && day <= 7) return 1;
    if (day >= 8 && day <= 14) return 2;
    if (day >= 15 && day <= 21) return 3;
    if (day >= 22) return 4;
    return null;
  };

  const filteredClients = clients?.filter(item => {
    const date = new Date(item.appointment_date);
    const clientMonth = date.getMonth();
    const clientYear = date.getFullYear();

    if (clientMonth !== selectedMonthIndex || clientYear !== selectedYear) return false;

    if (selectedWeek === 5) return true; // Весь месяц
    const clientWeek = getWeekNumber(item.appointment_date);
    return clientWeek === selectedWeek;
  });

  return (
    <div className={c.workers}>
      <div className={c.title}>
        <div className={c.left}>
          <button onClick={() => setActive(true)}>
            + Добавить
          </button>
          <div className={c.search}>
            <img src={Icons.search} alt="search" />
            <input type="text" placeholder="Найти клиентов" />
          </div>
        </div>
        <div className={c.right}>
          <div className={c.date}>
            {/* <span>{monthList[selectedMonthIndex]} {selectedYear}</span> */}
            <select
              value={selectedMonthIndex}
              onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
            >
              {monthList.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {yearList.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <span className={c.line}></span>
          <div className={c.periods}>
            {periods.map(item => (
              <button
                key={item.id}
                className={selectedWeek === item.id ? c.active : ''}
                onClick={() => setSelectedWeek(item.id)}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={c.table}>
        <table>
          <thead>
            <tr>
              <th><img src={Icons.edit} alt="edit" /></th>
              <th>Дата</th>
              <th>Ф.И.О клиента</th>
              <th>Телефон</th>
              <th className={c.services}>Процедуры</th>
              <th>Сотрудник</th>
              <th>Прайс по итогу</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(filteredClients) && filteredClients.length > 0 ? (
              filteredClients.reverse().map(item => (
                <tr key={item.id}>
                  <td onClick={() => {
                    console.log(item);
                    
                    localStorage.setItem('clientId', item.id);
                    setEditActive(true)
                  }}>
                    <img src={Icons.edit} alt="edit" />
                  </td>
                  <td>
                    <div className={c.date}>{formatDate(item.appointment_date)}</div>
                    <div className={c.date}>{item.time}</div>
                  </td>
                  <td>{item.name}</td>
                  <td>{item.phone}</td>
                  <td className={c.services}>
                    {Array.isArray(item?.services) && item.services.length > 0 ? (
                      item.services.map((value, idx) => (
                        <div key={idx} className={c.service}>
                          {value.name}
                        </div>
                      ))
                    ) : (
                      <div className={c.service}>-</div>
                    )}
                  </td>
                  <td>
                    {item?.services?.map(service => (
                      <div key={service.id} className={c.worker}>
                        {service.assigned}
                      </div>
                    ))}
                  </td>
                  <td>
                    {Array.isArray(item?.services)
                      ? item.services.reduce((sum, obj) => sum + Number(obj.price || 0), 0) +
                        (Array.isArray(item.product)
                          ? item.product.reduce((sum, obj) => sum + (Number(obj.price || 0) * Number(obj.amount || 0)), 0)
                          : 0)
                      : 0}
                  </td>
                  <td>
                    {
                      item.status
                    }
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td><img src={Icons.edit} alt="edit" /></td>
                <td colSpan={6}>Клиентов нет</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {active && <Components.AddClient setActive={setActive} />}
      {editActive && <Components.EditClient setActive={setEditActive} />}
    </div>
  );
};

export default ClientsTable;
