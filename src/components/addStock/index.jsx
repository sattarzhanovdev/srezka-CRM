import React from 'react'
import c from './add.module.scss'
import { Icons } from '../../assets/icons'

const createEmptyRow = () => ({
  _cid: (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
  name: '',
  quantity: '',
  price: '',
  category: '',
  price_seller: '',
  code: '',
  unit: 'шт',
  fixed_quantity: ''
})

const AddStock = ({ setActive, selectedBranch }) => {
  const [rows, setRows] = React.useState([createEmptyRow()])
  const [categories, setCategories] = React.useState([])
  const [loading, setLoading] = React.useState(false)

  const branchAPI = 'http://127.0.0.1:8000/'

  const handleChange = (index, field, value) => {
    setRows(prev =>
      prev.map((row, i) => {
        if (i !== index) return row
        if (field === 'quantity') {
          return {
            ...row,
            quantity: value,
            fixed_quantity: row.fixed_quantity || value
          }
        }
        return { ...row, [field]: value }
      })
    )
  }

  const addRow = () => setRows(prev => [...prev, createEmptyRow()])
  const removeRow = (index) =>
    setRows(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))

  // code → МАССИВ ['123','456'] (без пустых)
  const normalize = (item) => ({
    name: item.name?.trim() || '',
    code: item.code
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),                 // ← массив строк, НЕТ join
    quantity: Number(item.quantity) || 0,
    price: Number(item.price) || 0,
    price_seller: Number(item.price_seller) || 0,
    unit: item.unit || 'шт',
    fixed_quantity: Number(item.fixed_quantity || item.quantity) || 0,
    // если на бэке поле называется category_id — поменяй ключ ниже
    category: item.category ? Number(item.category) : null,
  })

  const validateRow = (n) => {
    if (!n.name) return 'Укажите наименование'
    if (!Array.isArray(n.code) || n.code.length === 0) return 'Укажите код(ы)'
    if (n.quantity < 0) return 'Количество не может быть отрицательным'
    if (n.price < 0 || n.price_seller < 0) return 'Цена не может быть отрицательной'
    return null
  }

  const handleSave = async () => {
    if (loading) return
    try {
      setLoading(true)

      const nonEmpty = rows.filter(r =>
        (r.name && r.name.trim()) ||
        (r.code && r.code.trim()) ||
        Number(r.quantity) > 0 ||
        Number(r.price) > 0 ||
        Number(r.price_seller) > 0
      )
      if (!nonEmpty.length) {
        alert('Нет данных для сохранения')
        setLoading(false)
        return
      }

      const payload = nonEmpty.map(normalize)

      for (let i = 0; i < payload.length; i++) {
        const err = validateRow(payload[i])
        if (err) {
          alert(`Строка #${i + 1}: ${err}`)
          setLoading(false)
          return
        }
      }

      const res = await fetch(`${branchAPI}clients/stocks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) // массив объектов
      })

      if (!res.ok) {
        let msg = ''
        try { msg = await res.text() } catch {}
        console.error('Ошибка ответа:', res.status, msg)
        alert(`Ошибка при сохранении: ${res.status}\n${msg}`)
        return
      }

      alert('Товары успешно добавлены')
      setActive(false)
      window.location.reload()
    } catch (err) {
      console.error('Ошибка при сохранении товара:', err)
      alert('Сеть/сервер недоступны')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetch(`${branchAPI}clients/categories/`)
      .then(res => res.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(err => console.error('Не удалось загрузить категории:', err))
  }, [branchAPI])

  return (
    <div className={c.addExpense}>
      <div className={c.addExpense__header}>
        <h2>Добавление товара</h2>
      </div>

      {rows.map((row, idx) => (
        <div key={row._cid} className={c.addExpense__form}>
          <div className={c.addExpense__form__item}>
            <label htmlFor={`code-${idx}`}>Код</label>
            <input
              id={`code-${idx}`}
              value={row.code}
              placeholder="Коды через запятую (например 123, 456)"
              onChange={e => handleChange(idx, 'code', e.target.value)}
            />
          </div>

          <div className={c.addExpense__form__item}>
            <label htmlFor={`name-${idx}`}>Наименование</label>
            <input
              id={`name-${idx}`}
              value={row.name}
              placeholder="Введите наименование"
              onChange={e => handleChange(idx, 'name', e.target.value)}
            />
          </div>

          <div className={c.addExpense__form__item}>
            <label htmlFor={`cat-${idx}`}>Категория</label>
            <select
              id={`cat-${idx}`}
              value={row.category}
              onChange={e => handleChange(idx, 'category', e.target.value)}
            >
              <option value="">‒ выберите ‒</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className={c.addExpense__form__item}>
            <label htmlFor={`qty-${idx}`}>Количество</label>
            <input
              id={`qty-${idx}`}
              type="number"
              value={row.quantity}
              placeholder="0"
              onChange={e => handleChange(idx, 'quantity', e.target.value)}
              min="0"
            />
          </div>

          <div className={c.addExpense__form__item}>
            <label htmlFor={`ps-${idx}`}>Цена поставщика</label>
            <input
              id={`ps-${idx}`}
              type="number"
              value={row.price_seller}
              placeholder="0"
              onChange={e => handleChange(idx, 'price_seller', e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className={c.addExpense__form__item}>
            <label htmlFor={`pr-${idx}`}>Цена продажи</label>
            <input
              id={`pr-${idx}`}
              type="number"
              value={row.price}
              placeholder="0"
              onChange={e => handleChange(idx, 'price', e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className={c.addExpense__form__item} style={{alignSelf:'flex-end'}}>
            <button type="button" onClick={() => removeRow(idx)} disabled={rows.length === 1}>
              Удалить строку
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={addRow}>
        <img src={Icons.plus} alt="" /> Добавить строку
      </button>

      <div className={c.res}>
        <button type="button" onClick={() => setActive(false)} disabled={loading}>Отменить</button>
        <button type="button" onClick={handleSave} disabled={loading}>
          <img src={Icons.addGreen} alt="" /> {loading ? 'Сохраняю…' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

export default AddStock