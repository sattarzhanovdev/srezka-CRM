import React, { useState } from 'react';
import Barcode from 'react-barcode';
import { BiPrinter } from 'react-icons/bi';
import { useParams } from 'react-router-dom';
import s from './code-print.module.scss';   // SCSS-модуль

const CodePrint = () => {
  const { code = '', name = '', price = '' } = useParams();
  const [qty, setQty] = useState(1);

  const labels = Array.from({ length: qty || 1 });

  window.open(`https://extraordinary-mooncake-a77444.netlify.app/?code=${code}&name=${name}&price=${price}`, '_blank');
  return (
    // id нужен, чтобы в @media print «показать только этот блок»
    <>
    </>
  );
};

export default CodePrint;