import React from 'react'
import c from './workers.module.scss'
import { API } from '../../api'
import { Components } from '..'

const ExpensesTable = () => {
  const [month, setMonth] = React.useState('')
  const [data, setData] = React.useState(null)
  const [active, setActive] = React.useState(false)

  React.useEffect(() => {
    const date = new Date()
    const m = date.toLocaleString('ru', { month: 'long' })
    setMonth(m.charAt(0).toUpperCase() + m.slice(1))
  }, [])

  React.useEffect(() => {
    API.getTransactions()
      .then(res => {
        // фильтруем только расходы
        const expenses = res.data.filter(item => item.type === 'expense')
        // сортируем по дате убыванию
        const sorted = expenses.sort((a, b) => new Date(b.date) - new Date(a.date))
        setData(sorted)
      })
      .catch(err => console.error('Ошибка загрузки расходов:', err))
  }, [])

  return (
    <div className={c.workers}>
      <div className={c.table}>
        <div className={c.table__header}>
          <h2>Расходы за {month}</h2>
          <button onClick={() => setActive(true)}>
            + Добавить
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Наименование</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {
              data && data.map((item, index) => (
                <tr key={index}>
                  <td>{new Date(item.date).toLocaleDateString('ru-RU')}</td>
                  <td>{item.name}</td>
                  <td>{item.amount} сом</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {
        active && <Components.AddExpense setActive={setActive} />
      }
    </div>
  )
}

export default ExpensesTable
