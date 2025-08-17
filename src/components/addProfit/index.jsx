import React from 'react'
import c from './add.module.scss'
import { Icons } from '../../assets/icons'
import { API } from '../../api'

const AddProfit = ({ setActive }) => {
  const [count, setCount] = React.useState(1)
  const [data, setData] = React.useState([{ type: 'income', name: '', amount: '' }])

  const handleChange = (index, field, value) => {
    const newData = [...data]
    newData[index] = { ...newData[index], [field]: value }
    setData(newData)
  }

  const handleAddForm = () => {
    setCount(prev => prev + 1)
    setData(prev => [...prev, { type: 'income', name: '', amount: '' }])
  }

  const handleSave = () => {
    const payload = data.map(item => ({
      type: 'income',
      name: item.name || '',
      amount: parseFloat(item.amount) || 0
    }))

    API.postTransactions(payload)
      .then(() => {
        setActive(false)
      })
      .catch(err => console.error(err))
  }

  return (
    <div className={c.addExpense}>
      <div className={c.addExpense__header}>
        <h2>Добавить прибыли</h2>
      </div>

      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={c.addExpense__form}
        >
          <div className={c.addExpense__form__item}>
            <label htmlFor={`name-${index}`}>Наименование прибыли</label>
            <input
              type="text"
              id={`name-${index}`}
              placeholder="Введите наимаенование"
              value={data[index]?.name || ''}
              onChange={e => handleChange(index, 'name', e.target.value)}
            />
          </div>
          <div className={c.addExpense__form__item}>
            <label htmlFor={`amount-${index}`}>Сумма</label>
            <input
              type="number"
              id={`amount-${index}`}
              placeholder="Введите сумму"
              value={data[index]?.amount || ''}
              onChange={e => handleChange(index, 'amount', e.target.value)}
            />
          </div>
        </div>
      ))}

      <button onClick={handleAddForm}>
        <img src={Icons.plus} alt="plus" />
        Добавить наименование
      </button>

      <div className={c.res}>
        <button onClick={() => setActive(false)}>
          Отменить
        </button>
        <button onClick={handleSave}>
          <img src={Icons.addGreen} alt="add" />
          Сохранить
        </button>
      </div>
    </div>
  )
}

export default AddProfit
