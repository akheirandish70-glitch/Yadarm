
'use client';
import { useEffect } from 'react';
export default function RegisterSW(){
  useEffect(()=>{
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const register = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          if ('periodicSync' in reg) { /* no-op */ }
        } catch (e){ /* silent */ }
      };
      register();
    }
  },[]);
  return null;
}
