import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode.js';

const QRCodeComponent = ({ value, size = 200 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      const qr = new QRCode({
        text: value,
        width: size,
        height: size,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });
      
      canvasRef.current.innerHTML = '';
      canvasRef.current.appendChild(qr.canvas);
    }
  }, [value, size]);

  return <div ref={canvasRef} className="flex justify-center" />;
};

export default QRCodeComponent;