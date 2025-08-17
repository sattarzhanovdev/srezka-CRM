import { Pages } from "../pages"
import CodePrint from "../pages/codes-print"
import KassaReport from "../pages/kassa-report"
import Receipt from "../pages/receipt"
import Return from "../pages/return "

export const NavList = [
  {
    id: 1,
    title: 'Главная',
    route: '/'
  },
  {
    id: 2,
    title: 'Финансы',
    route: '/finances'
  },
  {
    id: 3,
    title: 'Расходы',
    route: '/expenses'
  },
  {
    id: 4,
    title: 'Склад',
    route: '/stock'
  },
  {
    id: 5,
    title: 'Касса',
    route: '/kassa'
  },
  {
    id: 6,
    title: 'Штрих коды',
    route: '/codes'
  },
  {
    id: 7,
    title: 'Возврат товара',
    route: '/return'
  }
]


export const periods = [
  {
    id: 1,
    title: 'Неделя 1'
  },
  {
    id: 2,
    title: 'Неделя 2'
  },
  {
    id: 3,
    title: 'Неделя 3'
  },
  {
    id: 4,
    title: 'Неделя 4'
  },
  {
    id: 5,
    title: 'Месяц'
  },
]

export const PUBLIC_ROUTES = [
  {
    id: 1,
    page: <Pages.Main />,
    route: '/'
  },
  {
    id: 2,
    page: <Pages.Clients />,
    route: '/clients'
  },
  {
    id: 3,
    page: <Pages.Finances />,
    route: '/finances'
  },
  {
    id: 4,
    page: <Pages.Expenses />,
    route: '/expenses'
  },
  {
    id: 5,
    page: <Pages.Finances />,
    route: '/purchases'
  },
  {
    id: 6,
    page: <Pages.Storage />,
    route: '/stock'
  },
  {
    id: 7,
    page: <Pages.Kassa />,
    route: '/kassa'
  }, 
  {
    id: 8,
    page: <Receipt />,
    route: '/receipt'
  }, 
  {
    id: 9,
    page: <Pages.Codes />,
    route: '/codes'
  }, 
  {
    id: 10,
    page: <CodePrint />,
    route: '/codes-print/:code/:name/:price/'
  },
  {
    id: 11,
    page: <KassaReport />,
    route: '/kassa-report'
  }, 
  {
    id: 12,
    page: <Return />,
    route: '/return'
  }, 
]
