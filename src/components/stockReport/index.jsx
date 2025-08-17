import React from 'react'
import c from './mainReport.module.scss'
import { Icons } from '../../assets/icons'
import { API } from '../../api'

const StockReport = () => {
  const [data, setData] = React.useState([])

  React.useEffect(() => {
    API.getStocks()
      .then(res => {
        setData(res.data);
      });
  }, [])

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  const addedToday = data.filter(item => item.date_added === today)

  return (
    <div className={c.reports}>
      <div className={c.card}>
        <div className={c.up}>
          <img src={Icons.date} alt="date" />
          <h3>Итого наименований</h3>
        </div>
        <div className={c.down}>
          <h1>{data.length} наименований</h1>
        </div>
      </div>

      <div className={c.card}>
        <div className={c.up}>
          <img src={Icons.expenses} alt="expenses" />
          <h3>Израсходовано за сегодня</h3>
        </div>
        <div className={c.down}>
          <h1>0 наименований</h1>
        </div>
      </div>

      <div className={c.card}>
        <div className={c.up}>
          <img src={Icons.document} alt="document" />
          <h3>Добавлено сегодня</h3>
        </div>
        <div className={c.down}>
          <h1>{addedToday.length} наименований</h1>
        </div>
      </div>
    </div>
  )
}

export default StockReport
