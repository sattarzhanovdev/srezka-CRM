import React from 'react'
import c from './workers.module.scss'
import { Components } from '..'
import { API } from '../../api'

const FinancesTable = () => {
  const [month, setMonth] = React.useState('')
  const [active, setActive] = React.useState(false)
  const [data, setData] = React.useState([])
  const [selectedSale, setSelectedSale] = React.useState(null)

  React.useEffect(() => {
    const date = new Date()
    const m = date.toLocaleString('ru', { month: 'long' })
    setMonth(m.charAt(0).toUpperCase() + m.slice(1))
  }, [])

  React.useEffect(() => {
    API.getSales()
      .then(res => setData(res.data))
      .catch(err => console.error('Ошибка загрузки транзакций:', err))
  }, [])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleString('ru', { month: 'long' })
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${day} - ${hours}:${minutes}`
  }

  return (
    <div className={c.workers}>
      <div className={c.table}>
        <table>
          <thead>
            <tr>
              <th>Время</th>
              <th>Прайс по итогу</th>
              <th>Тип оплаты</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>
                  <div className={c.date}>
                    {formatDate(item.date)}
                  </div>
                </td>
                <td>{item.total} сом</td>
                <td>{item.payment_type === 'cash' ? 'Наличными' : 'Картой'}</td>
                <td>
                  <button onClick={() => setSelectedSale(item)}>
                    👁 Подробнее
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active && <Components.AddProfit setActive={setActive} />}

      {selectedSale && (
        <div className={c.popupOverlay} onClick={() => setSelectedSale(null)}>
          <div className={c.popup} onClick={e => e.stopPropagation()}>
            <h3 className={c.popupTitle}>Продажа от {formatDate(selectedSale.date)}</h3>

            <table className={c.popupTable}>
              <thead>
                <tr>
                  <th>Наименование</th>
                  <th>Цена</th>
                  <th>Кол-во</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {selectedSale.items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.name}</td>
                    <td>{item.price} сом</td>
                    <td>{item.quantity}</td>
                    <td>{(item.price * item.quantity).toFixed(2)} сом</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={c.popupFooter}>
              <button className={c.closeBtn} onClick={() => setSelectedSale(null)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinancesTable