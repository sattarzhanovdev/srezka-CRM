import React, { useEffect, useState } from 'react'
import Barcode from 'react-barcode'
import { useNavigate } from 'react-router-dom'
import { API } from '../../api'

const Codes = () => {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [code, setCode] = useState('')
  const [stock, setStock] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [highlight, setHighlight] = useState(-1)

  const navigate = useNavigate()

  useEffect(() => {
    API.getStocks()
      .then(res => setStock(res.data))
      .catch(err => console.error('Ошибка загрузки склада', err))
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setName(val)

    if (val.length < 1) {
      setSuggestions([])
      return
    }

    const match = stock.filter(item =>
      item.name.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 5)

    setSuggestions(match)
    setHighlight(-1)
  }

  const chooseItem = (item) => {
    setName(item.name)
    setPrice(item.price || '')
    const firstCode = typeof item.code === 'string'
      ? item.code.split(',')[0].trim()
      : item.code
    setCode(firstCode)
    setSuggestions([])
  }

  const handleKey = (e) => {
    if (!suggestions.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => (h + 1) % suggestions.length)
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => (h - 1 + suggestions.length) % suggestions.length)
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const item = suggestions[highlight >= 0 ? highlight : 0]
      if (item) chooseItem(item)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 500 }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Введите наименование товара"
          value={name}
          onChange={handleChange}
          onKeyDown={handleKey}
          style={{ width: '100%', height: 40, padding: '0 10px' }}
        />

        {suggestions.length > 0 && (
          <ul style={{
            position: 'absolute', top: 42, left: 0, right: 0,
            border: '1px solid #ccc', background: '#fff',
            listStyle: 'none', margin: 0, padding: 0, zIndex: 10
          }}>
            {suggestions.map((item, idx) => (
              <li key={item.id}
                  onMouseDown={() => chooseItem(item)}
                  style={{
                    padding: 10, cursor: 'pointer',
                    background: idx === highlight ? '#f0f0f0' : '#fff'
                  }}
              >
                {item.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <input
        type="number"
        placeholder="Стоимость товара"
        value={price}
        onChange={e => setPrice(e.target.value)}
        style={{ width: '100%', height: 40, marginTop: 10, padding: '0 10px' }}
      />

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <button
          disabled={!code}
          onClick={() =>
            navigate(`/codes-print/${code}/${encodeURIComponent(name)}/${price}`)
          }
          style={btn('green', !code)}
        >
          Распечатать
        </button>
      </div>

      {code && (
        <div style={{ marginTop: 30 }}>
          <h3>{name}</h3>
          <h4>Стоимость: {price} сом</h4>
          <Barcode value={code} width={1} height={50} fontSize={12} />
        </div>
      )}
    </div>
  )
}

const btn = (color, disabled) => ({
  flex: 1,
  height: 46,
  background: disabled ? '#ccc' : color,
  color: '#fff',
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  borderRadius: 5,
  fontSize: 16
})

export default Codes