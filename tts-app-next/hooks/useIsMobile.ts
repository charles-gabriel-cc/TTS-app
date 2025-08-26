"use client";

import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      // Verificar se é mobile baseado no user agent
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      
      // Verificar também pelo tamanho da tela
      const isMobileByScreen = window.innerWidth <= 768;
      
      const isMobileResult = mobileRegex.test(userAgent.toLowerCase()) || isMobileByScreen;
      
      console.log('[useIsMobile] Detecção de dispositivo:', {
        userAgent: userAgent.substring(0, 100) + '...',
        isMobileByUserAgent: mobileRegex.test(userAgent.toLowerCase()),
        isMobileByScreen,
        windowWidth: window.innerWidth,
        isMobile: isMobileResult
      });
      
      setIsMobile(isMobileResult);
    };

    checkIsMobile();
    
    // Adicionar listener para mudanças de tamanho de tela
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
}
