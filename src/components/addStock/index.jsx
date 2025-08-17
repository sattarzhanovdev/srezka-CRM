import React from 'react'
import c from './add.module.scss'
import { Icons } from '../../assets/icons'

// === НАСТРОЙКА ФОРМАТА КОДА ===
const SEND_CODE_AS_ARRAY = true; // ← если бек требует code: [".."], поставь true

// --- утилиты генерации кода ---
const translit = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();

const prefixFromName = (name) => {
  const t = translit(name).toUpperCase();
  if (!t) return 'SKU';
  const words = t.split(' ').filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 8);
  }
  const p = (words[0][0] || '') + (words[1][0] || '') + (words[2]?.[0] || '');
  return (p || 'SKU').toUpperCase();
};

const rand4 = () => Math.random().toString(36).slice(2, 6).toUpperCase();
const shortTs = () => Date.now().toString(36).slice(-4).toUpperCase();
const genCandidate = (name) => `${prefixFromName(name)}-${shortTs()}-${rand4()}`;

const createEmptyRow = () => ({
  _cid: (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
  name: '',
  quantity: '',
  price: '',
  category: '',
  price_seller: '',
  unit: 'шт',
  fixed_quantity: ''
})

const AddStock = ({ setActive }) => {
  const [rows, setRows] = React.useState([createEmptyRow()])
  const [categories, setCategories] = React.useState([])
  const [loading, setLoading] = React.useState(false)

  // множество существующих кодов (из бэка)
  const [existingCodes, setExistingCodes] = React.useState(new Set())

  // локальное состояние для "добавить категорию"
  const [catCreatorOpen, setCatCreatorOpen] = React.useState(false)
  const [newCatName, setNewCatName] = React.useState('')
  const [catSaving, setCatSaving] = React.useState(false)
  const [catError, setCatError] = React.useState('')

  const branchAPI = 'https://srezka.pythonanywhere.com/'

  React.useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setActive(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setActive])

  React.useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // тянем категории + существующие коды
  React.useEffect(() => {
    // категории
    fetch(`${branchAPI}clients/categories/`)
      .then(res => res.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(err => console.error('Не удалось загрузить категории:', err))

    // коды из товаров
    fetch(`${branchAPI}clients/stocks/`)
      .then(res => res.json())
      .then(list => {
        const all = new Set()
        ;(Array.isArray(list) ? list : []).forEach(item => {
          const code = item?.code ?? ''
          if (Array.isArray(code)) {
            code.forEach(c => c && all.add(String(c).trim()))
          } else if (typeof code === 'string') {
            code.split(',').map(s => s.trim()).filter(Boolean).forEach(c => all.add(c))
          }
        })
        setExistingCodes(all)
      })
      .catch(err => console.error('Не удалось загрузить коды:', err))
  }, [branchAPI])

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

  // нормализация (без ручного code)
  const normalize = (item) => ({
    name: item.name?.trim() || '',
    quantity: Number(item.quantity) || 0,
    price: Number(item.price) || 0,
    price_seller: Number(item.price_seller) || 0,
    unit: item.unit || 'шт',
    fixed_quantity: Number(item.fixed_quantity || item.quantity) || 0,
    category_id: item.category ? Number(item.category) : null,
  })

  const validateRow = (n) => {
    if (!n.name) return 'Укажите наименование'
    if (n.quantity < 0) return 'Количество не может быть отрицательным'
    if (n.price < 0 || n.price_seller < 0) return 'Цена не может быть отрицательной'
    return null
  }

  // генерим уникальный код, учитывая уже занятые
  const generateUniqueCode = (name, used) => {
    let tries = 0
    let candidate = genCandidate(name)
    while (used.has(candidate) && tries < 50) {
      candidate = genCandidate(name)
      tries++
    }
    used.add(candidate)
    return candidate
  }

  // ====== создание категории «на месте» ======
  const openCatCreator = () => {
    setCatError('')
    setNewCatName('')
    setCatCreatorOpen(true)
  }
  const closeCatCreator = () => {
    setCatError('')
    setNewCatName('')
    setCatCreatorOpen(false)
  }

  const saveCategory = async () => {
    const name = newCatName.trim()
    if (!name) {
      setCatError('Введите название категории')
      return
    }
    // простая проверка на дубликат по имени (регистр игнорим)
    const dup = categories.find(c => (c.name || '').toLowerCase() === name.toLowerCase())
    if (dup) {
      setCatError('Такая категория уже есть')
      return
    }
    try {
      setCatSaving(true)
      setCatError('')
      const res = await fetch(`${branchAPI}clients/categories/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`${res.status}: ${text}`)
      }
      const created = await res.json().catch(() => null)
      if (!created || !created.id) {
        // если бек вернул не объект — подстрахуемся
        // сымитируем id (не критично)
        const fakeId = Math.floor(Math.random() * 1e9)
        const newCat = { id: fakeId, name }
        setCategories(prev => [...prev, newCat])
        // выставим выбранной для всех строк, где пусто
        setRows(prev => prev.map(r => (!r.category ? { ...r, category: String(newCat.id) } : r)))
      } else {
        // нормальный сценарий
        setCategories(prev => [...prev, created])
        setRows(prev => prev.map(r => (!r.category ? { ...r, category: String(created.id) } : r)))
      }
      closeCatCreator()
    } catch (e) {
      console.error('Ошибка создания категории:', e)
      setCatError('Не удалось создать категорию')
    } finally {
      setCatSaving(false)
    }
  }

  const handleSave = async () => {
    if (loading) return
    try {
      setLoading(true)

      const nonEmpty = rows.filter(r =>
        (r.name && r.name.trim()) ||
        Number(r.quantity) > 0 ||
        Number(r.price) > 0 ||
        Number(r.price_seller) > 0
      )
      if (!nonEmpty.length) {
        alert('Нет данных для сохранения')
        setLoading(false)
        return
      }

      // локальная копия множества, чтобы в одной отправке не было дублей
      const used = new Set(existingCodes)

      // нормализуем и подставляем сгенерированные коды
      const normalized = nonEmpty.map(normalize).map(n => {
        const code = generateUniqueCode(n.name, used)
        if (SEND_CODE_AS_ARRAY) {
          return { ...n, code: [code] }
        }
        return { ...n, code }
      })

      // финальная валидация
      for (let i = 0; i < normalized.length; i++) {
        const err = validateRow(normalized[i])
        if (err) {
          alert(`Строка #${i + 1}: ${err}`)
          setLoading(false)
          return
        }
      }

      const res = await fetch(`${branchAPI}clients/stocks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized)
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        console.error('Ошибка ответа:', res.status, txt)
        alert(`Ошибка при сохранении: ${res.status}\n${txt}`)
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

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) setActive(false)
  }

  return (
    <div className={c.modalWrap} onMouseDown={onBackdrop}>
      <div className={c.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={c.header}>
          <h2>Добавление товара</h2>
          <button className={c.iconBtn} onClick={() => setActive(false)} aria-label="Закрыть">×</button>
        </div>

        {rows.map((row, idx) => (
          <div key={row._cid} className={c.formRow}>
            <div className={c.item}>
              <label htmlFor={`name-${idx}`}>Наименование</label>
              <input
                id={`name-${idx}`}
                value={row.name}
                placeholder="Введите наименование"
                onChange={e => handleChange(idx, 'name', e.target.value)}
              />
            </div>

            <div className={c.item}>
              <label htmlFor={`cat-${idx}`}>Категория</label>
              <div className={c.inlineGroup}>
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
                <button type="button" className={c.smallBtn} onClick={openCatCreator}>
                  + Новая
                </button>
              </div>

              {/* инлайн-попап создания категории */}
              {catCreatorOpen && (
                <div className={c.newCatRow}>
                  <input
                    placeholder="Название категории"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveCategory() }}
                  />
                  <button type="button" className={c.btnPrimary} onClick={saveCategory} disabled={catSaving}>
                    {catSaving ? 'Сохраняю…' : 'Сохранить'}
                  </button>
                  <button type="button" className={c.btnGhost} onClick={closeCatCreator} disabled={catSaving}>
                    Отмена
                  </button>
                  {!!catError && <div className={c.errorMsg}>{catError}</div>}
                </div>
              )}
            </div>

            <div className={c.item}>
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

            <div className={c.item}>
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

            <div className={c.item}>
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

            <div className={c.item}>
              <label htmlFor={`unit-${idx}`}>Ед. изм.</label>
              <select
                id={`unit-${idx}`}
                value={row.unit}
                onChange={e => handleChange(idx, 'unit', e.target.value)}
              >
                <option value="шт">шт</option>
                <option value="упак">упак</option>
                <option value="кг">кг</option>
                <option value="л">л</option>
              </select>
            </div>

            <div className={c.item} style={{ alignSelf: 'end' }}>
              <button type="button" className={c.btnDanger} onClick={() => removeRow(idx)} disabled={rows.length === 1}>
                Удалить строку
              </button>
            </div>
          </div>
        ))}

        <div className={c.footerLeft}>
          <button type="button" className={c.btnPrimaryGhost} onClick={addRow}>
            <img src={Icons.plus} alt="" /> Добавить строку
          </button>
        </div>

        <div className={c.footer}>
          <button type="button" className={c.btnGhost} onClick={() => setActive(false)} disabled={loading}>Отменить</button>
          <button type="button" className={c.btnPrimary} onClick={handleSave} disabled={loading}>
            <img src={Icons.addGreen} alt="" /> {loading ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddStock