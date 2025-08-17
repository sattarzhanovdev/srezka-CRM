import React from 'react'
import c from './navbar.module.scss'
import { Images } from '../../assets/images'
import { NavList } from '../../utils'
import { Link, useLocation } from 'react-router-dom'
import { Icons } from '../../assets/icons'

const Navbar = () => {
  const pathname = useLocation().pathname

  return (
    <div className={c.navbar}>
      <div className={c.left}>
        {/* <div className={c.logo}>
          <img
            src={Images.logo}
            alt="logo"
          />
        </div> */}
        <ul className={c.list}>
          {
            NavList.map((item) => (
              <li key={item.id}>
                <Link to={item.route} className={pathname === item.route ? c.active : ''}>
                  {item.title}
                </Link>
              </li>
            ))
          }
        </ul>
      </div>
      {/* <div className={c.right}>
        <div className={c.search}>
          <img src={Icons.search} alt="search" />
          <input
            type="text"
            placeholder='Поиск'
          />
        </div>
        <button>
          <img src={Icons.profile} alt="profile" />
        </button>
      </div> */}
    </div>
  )
}

export default Navbar
