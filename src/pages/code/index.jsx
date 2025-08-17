import React, { useEffect, useState } from 'react';

const BarcodeScanner = () => {
  const [scannedCode, setScannedCode] = useState('');
  const [buffer, setBuffer] = useState('');

  useEffect(() => {
    let tempBuffer = '';
    let timeout = null;

    const handleKeyDown = (e) => {
      if (timeout) clearTimeout(timeout);

      // Штрихкод заканчивается нажатием Enter
      if (e.key === 'Enter') {
        setScannedCode(tempBuffer);
        tempBuffer = '';
        return;
      }

      // Добавляем символ в буфер
      if (e.key.length === 1) {
        tempBuffer += e.key;
      }

      // Если 300 мс ничего не вводилось — сброс буфера
      timeout = setTimeout(() => {
        tempBuffer = '';
      }, 300);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Отсканированный код:</h2>
      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
        {scannedCode || 'Ожидаю скан...'}
      </div>
    </div>
  );
};

export default BarcodeScanner;
