import React, { useState, useEffect } from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value === '' || value === null || value === undefined) {
      setDisplayValue('');
      return;
    }
    // Hapus karakter non-angka
    const numStr = String(value).replace(/[^0-9]/g, '');
    if (!numStr) {
      setDisplayValue('');
      return;
    }
    // Konversi ke format lokal (tambahkan titik ribuan)
    setDisplayValue(Number(numStr).toLocaleString('id-ID'));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    // Update display secara lokal agar terasa reaktif
    setDisplayValue(rawValue ? Number(rawValue).toLocaleString('id-ID') : '');
    
    // Buat event bayangan (synthetic) dengan value polos (tanpa titik)
    // agar state parent yang menggunakan onChange(e => e.target.value) 
    // tetap menerima angka polos/bersih.
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        value: rawValue,
        name: e.target.name
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      className={className}
      {...props}
    />
  );
}
