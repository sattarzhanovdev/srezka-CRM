import React from 'react'
import c from './mainReport.module.scss'
import { Icons } from '../../assets/icons'
import { API } from '../../api'

const FinancesReport = () => {
  const [summary, setSummary] = React.useState({
    added_today: 0,
    daily_expense: 0,
    monthly_expense: 0,
  })

  React.useEffect(() => {
    API.getTransactionsSummary()
      .then(res => {
        setSummary({
          added_today: res.data.month?.added_today || 0,
          daily_expense: res.data.daily_expense || 0,
          monthly_expense: res.data.monthly_expense || 0,
        })
      })
      .catch(err => {
        console.error('Ошибка при загрузке отчёта:', err)
      })
  }, [])

  return (
    <div className={c.reports}>
      <div className={c.card}>
        <div className={c.up}>
          <img src={Icons.date} alt="date" /> 
          <h3>Итого закупа за сегодня</h3>
        </div>
        <div className={c.down}>
          <h1>{summary.added_today} наименований</h1>
        </div>
      </div>
      <div className={c.card}>
        <div className={c.up}>
          <img src={Icons.expenses} alt="expenses" />
          <h3>Расходы за сегодня</h3>
        </div>
        <div className={c.down}>
          <h1>{summary.daily_expense} сом</h1>
        </div>
      </div>
      <div className={c.card}>
        <div className={c.up}>
          <img src={Icons.document} alt="document" />
          <h3>Расходов за месяц</h3>
        </div>
        <div className={c.down}>
          <h1>{summary.monthly_expense} сом</h1>
        </div>
      </div>
    </div>
  )
}

export default FinancesReport
