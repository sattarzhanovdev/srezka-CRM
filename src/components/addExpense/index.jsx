import React from 'react'
import c from './add.module.scss'
import { Icons } from '../../assets/icons'
import { API } from '../../api'

const AddExpense = ({ setActive }) => {
  const [count, setCount] = React.useState(1)
  const [data, setData] = React.useState([
    { name: '', price: '',}
  ])

  const handleChange = (index, field, value) => {
    const newData = [...data]
    newData[index] = { ...newData[index], [field]: value }
    setData(newData)
  }

  const handleAddForm = () => {
    setCount(prev => prev + 1)
    setData(prev => [...prev, { name: '', price: '' }])
  }

  const handleSave = () => {
    const payload = data.map(item => ({
      type: 'expense',
      name: item.name || '',
      amount: parseFloat(item.price) || 0,
    }))

    API.postTransactions(payload)
      .then(() => {
        setActive(false)
      })
      .catch(err => console.error('Ошибка при сохранении расхода:', err))
  }

  return (
    <div className={c.addExpense}>
      <div className={c.addExpense__header}>
        <h2>Добавить расхода</h2>
      </div>

      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={c.addExpense__form}>
          <div className={c.addExpense__form__item}>
            <label htmlFor={`name-${index}`}>Наименование расхода</label>
            <input
              type="text"
              id={`name-${index}`}
              placeholder="Введите наименование расхода"
              value={data[index]?.name || ''}
              onChange={e => handleChange(index, 'name', e.target.value)}
            />
          </div>
          <div className={c.addExpense__form__item}>
            <label htmlFor={`price-${index}`}>Стоимость</label>
            <input
              type="number"
              id={`price-${index}`}
              placeholder="Введите стоимость"
              value={data[index]?.price || ''}
              onChange={e => handleChange(index, 'price', e.target.value)}
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

export default AddExpense
