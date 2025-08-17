import React from 'react'
import c from './mainReport.module.scss'
import { Icons } from '../../assets/icons'
import { API } from '../../api'

const MainReport = () => {
  const [data, setData] = React.useState({
    monthly_income: 0,
    monthly_expense: 0,
    monthly_profit: 0,
    monthly_clients: 0
  })
  const [benefit, setBenefit] = React.useState(0)

  React.useEffect(() => {
    API.getTransactions()
      .then(res => {
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        const thisMonthTransactions = res.data.filter(tx => {
          const txDate = new Date(tx.date)
          return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
        })

        const income = thisMonthTransactions
          .filter(tx => tx.type === 'income')
          .reduce((sum, tx) => sum + Number(tx.amount), 0)

        const expense = thisMonthTransactions
          .filter(tx => tx.type === 'expense')
          .reduce((sum, tx) => sum + Number(tx.amount), 0)

        const profit = income - expense

        const clientsCount = thisMonthTransactions
          .filter(tx => tx.client)
          .map(tx => tx.client)
          .filter((v, i, arr) => arr.indexOf(v) === i).length

        setData({
          monthly_income: income,
          monthly_expense: expense,
          monthly_profit: profit,
          monthly_clients: clientsCount
        })
      })
      .catch(err => {
        console.error('Ошибка загрузки:', err)
      })
    API.getSales()
      .then(res => 
        setBenefit(res.data.reduce((a, b) => Number(a)+Number(b.total), 0)) // для отладки, можно убрать позже
      )
  }, [])

  return (
    <div className={c.reports}>
      <div className={c.card}>
        <div className={c.up}>
          <img src={Icons.date} alt="date" />
          <h3>Оборот за месяц / Прибыль</h3>
        </div>
        <div className={c.down}>
          <h1>{benefit} / {benefit-data.monthly_expense}</h1>
          {/* <button>Посмот  реть</button> */}
        </div>
      </div>
      <div className={c.card}>
        <div className={c.up}>
          <img src={Icons.expenses} alt="expenses" />
          <h3>Расходы за месяц</h3>
        </div>
        <div className={c.down}>
          <h1>{data.monthly_expense}</h1>
          {/* <button>Посмотреть</button> */}
        </div>
      </div>
      {/* <div className={c.card}>
        <div className={c.up}>
          <img src={Icons.document} alt="document" />
          <h3>Клиентов за месяц</h3>
        </div>
        <div className={c.down}>
          <h1>{data.monthly_clients}</h1>
          <button>Посмотреть</button>
        </div>
      </div> */}
    </div>
  )
}

export default MainReport
