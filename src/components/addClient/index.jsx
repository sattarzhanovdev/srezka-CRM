import React from 'react'
import c from './add.module.scss'
import { Icons } from '../../assets/icons'
import { InputMask } from '@react-input/mask';
import { API } from '../../api';
import { Components } from '..';  

const AddClient = ({setActive}) => {
  const [count, setCount] = React.useState(1)
  const [workers, setWorkers] = React.useState(null)
  const [countSells, setCountSell] = React.useState(1)
  const [ active, setActiveState ] = React.useState(false)
  const [ type, setType ] = React.useState('')
  const [ appointments, setAppointments ] = React.useState(null)  
  const [ data, setData ] = React.useState({
    name: '',
    phone: '',
    date: '',
    time: '',
    services: [],
    product: [],
    payment: '',
    status: '',
  })

  const date = new Date()
  const todayDate = `${date.getFullYear()}-${(date.getMonth() + 1) < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1}-${date.getDate()}`

  React.useEffect(() => {
    API.getWorkers()
      .then(res => setWorkers(res.data))
  }, [])

  React.useEffect(() => {
    setData(prev => ({
      ...prev,
      services: Array.from({ length: count }, (_, i) => prev.services[i] || {
        name: '',
        assigned: '',
        price: '',
        cabinet: '', 
        time: ''
      })
    }));
  }, [count]);

  React.useEffect(() => {
    setData(prev => ({
      ...prev,
      product: Array.from({ length: countSells }, (_, i) => prev.product[i] || {
        name: '',
        price: '',
        amount: ''
      })
    }));
  }, [countSells]);

  React.useEffect(() => {
    API.getWorkers()
      .then(res => {
        const workersData = res.data;
        setWorkers(workersData);
  
        const workerNames = workersData.map(worker => worker.name);
  
        API.getClients().then(res => {
          const clients = res.data;
  
          const result = workersData.map(worker => {
            const appointments = [];
  
            clients.forEach(client => {
              if (client.appointment_date === todayDate) {
                client.services.forEach(service => {
                  if (service.assigned === worker.name) {
                    appointments.push(`${service.time} - ${service.name}`);
                  }
                });
              }
            });
  
            return {
              name: worker.name,
              appointments
            };
          });
  
          setAppointments(result);
          console.log(result);
        });
      });
  }, []);


  const updateArrayField = (arrayKey, index, field, value) => {
    setData(prev => {
      const updatedArray = [...prev[arrayKey]];
      updatedArray[index] = {
        ...updatedArray[index],
        [field]: value
      };
      return { ...prev, [arrayKey]: updatedArray };
    });
  };

  const handleAddClient = () => {
    const dataRes = {
      ...data,
      appointment_date: data.date,
      time: data.time
    }
    
    console.log(dataRes);
    


    API.postClient(dataRes)
      .then(res => {
        alert('Клиент успешно добавлен')
        setActive(false)
      })
  }

  const timeData = JSON.parse(localStorage.getItem('time'))
  const cabinetData = JSON.parse(localStorage.getItem('cabinetData'))

  React.useEffect(() => {
    if (!timeData) {
      localStorage.setItem('time', JSON.stringify([]))
    }
    if (!cabinetData) {
      localStorage.setItem('cabinetData', JSON.stringify([]))
    }
  }, [])
  return (
    <div className={c.add}>
      <div className={c.client}>
        <h2>Добавление клиента</h2>
        <form>
          <div>
            <span>Имя клиента</span>
            <input
              type="text"
              placeholder="Введите имя клиента"
              value={data.name}
              onChange={(e) =>
                setData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div>
            <span>Номер телефона</span>
            <InputMask
              mask="+996 (___) __-__-__"
              placeholder="Введите номер телефона"
              replacement={{ _: /\d/ }}
              value={data.phone}
              onChange={(e) =>
                setData((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
          </div>
          <div>
            <span>Дата приема</span>
            <InputMask
              mask="__.__.__"
              placeholder="Дата посещения клиента"
              replacement={{ _: /\d/ }}
              value={data.date}
              onChange={(e) =>
                setData((prev) => ({ ...prev, date: e.target.value }))
              }
            />
          </div>
          <div>
            <span>Время приема</span>
            <InputMask
              mask="__:__"
              placeholder="Время посещения клиента"
              replacement={{ _: /\d/ }}
              value={data.time}
              onChange={(e) =>
                setData((prev) => ({ ...prev, time: e.target.value }))
              }
            />
          </div>
        </form>
      </div>
      <div className={c.servicesAdd}>
        <h2>Добавление услуг</h2>
        <form>
          {data.services.map((service, index) => (
            <div key={index} className={c.valuesNew}>
              <div className={c.valuesIn}>
                <div>
                  <span>Наименование услуги</span>
                  <input
                    type="text"
                    placeholder="Введите наименование услуги"
                    value={service.name}
                    onChange={(e) =>
                      updateArrayField(
                        "services",
                        index,
                        "name",
                        e.target.value
                      )
                    }
                  />
                </div>
                <div>
                  <span>Назначенный</span>
                  <input
                    type="text"
                    placeholder="Введите назначенного"
                    value={service.assigned}
                  />
        
                </div>
                <div>
                  <span>Стоимость услуг</span>
                  <input
                    type="number"
                    placeholder="Введите стоимость"
                    value={service.price}
                    onChange={(e) =>
                      updateArrayField(
                        "services",
                        index,
                        "price",
                        e.target.value
                      )
                    }
                  />
                </div>
                <div>
                  <span>Время</span>
                  <InputMask
                    mask="__:__"
                    placeholder="Время посещения клиента"
                    replacement={{ _: /\d/ }}
                    onChange={(e) =>
                      updateArrayField('services', index, 'time', e.target.value)
                    }
                  />
                </div>
              </div>
              <div className={c.services}>
                <form>
                  <div>
                    {
                      appointments?.length > 0 ?
                      appointments?.map((item) => {
                        // Сортируем приёмы по времени
                        const sortedAppointments = [...(item.appointments || [])].sort((a, b) => {
                          const timeA = a.split(' - ')[0];
                          const timeB = b.split(' - ')[0];
                          return timeA.localeCompare(timeB);
                        });
  
                        let prevTimeMinutes = null;
  
                        return (
                          <label
                            onChange={() => updateArrayField('services', index, 'assigned', item.name)}
                            key={item.id}
                          >
                            <input type="radio" name="option" />
                            <p>{item.name}</p>
                            <div className={c.times}>
                              {sortedAppointments.map((timeStr, id) => {
                                const [time] = timeStr.split(' - ');
                                const [hours, minutes] = time.split(':').map(Number);
                                const currentTimeMinutes = hours * 60 + minutes;
  
                                let className = '';
  
                                if (prevTimeMinutes !== null) {
                                  const diff = currentTimeMinutes - prevTimeMinutes;
                                  if (diff >= 180) {
                                    className = c.hard;
                                  } else if (diff >= 90) {
                                    className = c.medium;
                                  }
                                }
  
                                prevTimeMinutes = currentTimeMinutes;
  
                                return (
                                  <span key={id} className={className}>
                                    {timeStr}
                                  </span>
                                );
                              })}
                            </div>
                          </label>
                        );
                      }) : 
                      
                      workers?.map(item => (
                        <label
                          onChange={() => updateArrayField('services', index, 'assigned', item.name)}
                          key={item.id}
                        >
                          <input type="radio" name="option" />
                          <p>{item.name}</p>
                        </label>
                      ))
                    }
                  </div>
                </form>
                <form>
                  <div>
                    <label
                      onChange={() => updateArrayField('services', index, 'cabinet', "Кабинет 1")}
                    >
                      <input type="radio" name="option" />
                      <p>Кабинет 1</p>
                      <div className={c.times}>
                        {cabinetData?.length > 0
                          ? cabinetData?.map((time, id) => (
                              <span key={id}>
                                {time.time} - {time.name}
                              </span>
                            ))
                          : null}
                      </div>
                    </label>
                  </div>
                </form>
              </div>
            </div>
          ))}
        </form>
        <button onClick={() => setCount(count + 1)}>
          <img src={Icons.plus} alt="plus" />
          Добавить услугу
        </button>
      </div>
      <div className={c.servicesAdd}>
        <h2>Добавление продаж</h2>
        <form>
          {data.product.map((prod, index) => (
            <div key={index} className={c.values}>
              <div>
                <span>Наименование продукта</span>
                <input
                  type="text"
                  placeholder="Введите наименование продукта"
                  value={prod.name}
                  onChange={(e) =>
                    updateArrayField("product", index, "name", e.target.value)
                  }
                />
              </div>
              <div>
                <span>Стоимость услуги</span>
                <input
                  type="text"
                  placeholder="Введите стоимость"
                  value={prod.assigned}
                  onChange={(e) =>
                    updateArrayField("product", index, "price", e.target.value)
                  }
                />
              </div>
              <div>
                <span>Количество</span>
                <input
                  type="number"
                  placeholder="Введите количество"
                  value={prod.amount}
                  onChange={(e) =>
                    updateArrayField("product", index, "amount", e.target.value)
                  }
                />
              </div>
            </div>
          ))}
        </form>
        <button onClick={() => setCountSell(countSells + 1)}>
          <img src={Icons.plus} alt="plus" />
          Добавление продаж
        </button>
      </div>
      <div className={c.res}>
        <div className={c.left}>
          <h1>
            К оплате:{" "}
            {data.services.reduce((a, b) => (a += Number(b.price)), 0) +
              data.product.reduce(
                (a, b) => (a += Number(b.price)) * b.amount,
                0
              )}{" "}
            сом
          </h1>
          <form>
            <div>
              <input
                type="radio"
                id="Mkassa"
                name="payment"
                value="Mkassa"
                checked={data.payment === "Mkassa"}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, payment: e.target.value }))
                }
              />
              <label htmlFor="Mkassa">Mkassa</label>
            </div>
            <div>
              <input
                type="radio"
                id="full"
                name="payment"
                value="full"
                checked={data.payment === "full"}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, payment: e.target.value }))
                }
              />
              <label htmlFor="full">Оплата полностью</label>
            </div>
            <div>
              <input
                type="radio"
                id="credit"
                name="payment"
                value="credit"
                checked={data.payment === "credit"}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, payment: e.target.value }))
                }
              />
              <label htmlFor="credit">В кредит</label>
            </div>
          </form>
          <div className={c.line}></div>
          <form>
            <div>
              <input
                type="radio"
                id="Оплачено"
                name="status"
                value="Оплачено"
                checked={data.status === "Оплачено"}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, status: e.target.value }))
                }
              />
              <label htmlFor="Оплачено">Оплачено</label>
            </div>
            <div>
              <input
                type="radio"
                id="Бронь"
                name="status"
                value="Бронь"
                checked={data.status === "Бронь"}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, status: e.target.value }))
                }
              />
              <label htmlFor="Бронь">Бронь</label>
            </div>
            <div>
              <input
                type="radio"
                id="Отмена"
                name="status"
                value="Отмена"
                checked={data.status === "Отмена"}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, status: e.target.value }))
                }
              />
              <label htmlFor="Отмена">Отмена</label>
            </div>
          </form>
        </div>
        <div className={c.right}>
          <button onClick={() => setActive(false)}>Отменить</button>
          <button onClick={() => handleAddClient()}>
            <img src={Icons.addGreen} alt="add" />
            Добавить клиента
          </button>
        </div>
      </div>

      {active ? (
        <Components.AddTime type={type} setActive={setActiveState} />
      ) : null}
    </div>
  );
}

export default AddClient


