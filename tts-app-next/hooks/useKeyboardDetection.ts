"use client";

import { useState, useEffect } from 'react';
import { Keyboard } from '@capacitor/keyboard';

interface KeyboardState {
  isVisible: boolean;
  height: number;
  isAnimating: boolean;
  animatedHeight: number;
}

export function useKeyboardDetection(): KeyboardState {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    isAnimating: false,
    animatedHeight: 0
  });

  useEffect(() => {
    const setupKeyboardListeners = async () => {
      try {
        // Tentar usar Capacitor Keyboard API primeiro
        await Keyboard.addListener('keyboardWillShow', (info) => {
          console.log('[useKeyboardDetection] Keyboard will show with height:', info.keyboardHeight);
          const targetHeight = info.keyboardHeight || 280;
          
          setKeyboardState({
            isVisible: true,
            height: targetHeight,
            isAnimating: true,
            animatedHeight: 0
          });
          
          // Animar gradualmente a altura
          const animateHeight = (startTime: number) => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / 300, 1); // 300ms de animação
            const easeOut = 1 - Math.pow(1 - progress, 3); // Easing suave
            
            setKeyboardState(prev => ({
              ...prev,
              animatedHeight: targetHeight * easeOut
            }));
            
            if (progress < 1) {
              requestAnimationFrame(() => animateHeight(startTime));
            } else {
              setKeyboardState(prev => ({ 
                ...prev, 
                isAnimating: false,
                animatedHeight: targetHeight
              }));
            }
          };
          
          requestAnimationFrame(() => animateHeight(Date.now()));
        });

        await Keyboard.addListener('keyboardWillHide', () => {
          console.log('[useKeyboardDetection] Keyboard will hide');
          const startHeight = keyboardState.animatedHeight;
          
          setKeyboardState(prev => ({
            ...prev,
            isVisible: false,
            height: 0,
            isAnimating: true
          }));
          
          // Animar gradualmente a altura para 0
          const animateHeight = (startTime: number) => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / 400, 1); // 400ms de animação (mais lenta)
            // Easing mais suave para descida: ease-out-cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            setKeyboardState(prev => ({
              ...prev,
              animatedHeight: startHeight * (1 - easeOut)
            }));
            
            if (progress < 1) {
              requestAnimationFrame(() => animateHeight(startTime));
            } else {
              setKeyboardState(prev => ({ 
                ...prev, 
                isAnimating: false,
                animatedHeight: 0
              }));
            }
          };
          
          requestAnimationFrame(() => animateHeight(Date.now()));
        });

        console.log('[useKeyboardDetection] Capacitor Keyboard listeners set up successfully');
      } catch (error) {
        console.log('[useKeyboardDetection] Capacitor Keyboard not available, using fallback detection:', error);
        
        // Fallback: detectar mudanças no viewport para dispositivos móveis
        const initialViewportHeight = window.visualViewport?.height || window.innerHeight;
        
        const handleViewportChange = () => {
          const currentHeight = window.visualViewport?.height || window.innerHeight;
          const heightDifference = initialViewportHeight - currentHeight;
          
                     if (heightDifference > 150) { // Teclado provavelmente apareceu
             console.log('[useKeyboardDetection] Keyboard detected via viewport change, height difference:', heightDifference);
             const targetHeight = Math.max(heightDifference, 280);
             
             setKeyboardState({
               isVisible: true,
               height: targetHeight,
               isAnimating: true,
               animatedHeight: 0
             });
             
             // Animar gradualmente a altura
             const animateHeight = (startTime: number) => {
               const elapsed = Date.now() - startTime;
               const progress = Math.min(elapsed / 300, 1);
               const easeOut = 1 - Math.pow(1 - progress, 3);
               
               setKeyboardState(prev => ({
                 ...prev,
                 animatedHeight: targetHeight * easeOut
               }));
               
               if (progress < 1) {
                 requestAnimationFrame(() => animateHeight(startTime));
               } else {
                 setKeyboardState(prev => ({ 
                   ...prev, 
                   isAnimating: false,
                   animatedHeight: targetHeight
                 }));
               }
             };
             
             requestAnimationFrame(() => animateHeight(Date.now()));
           } else {
             console.log('[useKeyboardDetection] Keyboard hidden via viewport change');
             const startHeight = keyboardState.animatedHeight;
             
             setKeyboardState({
               isVisible: false,
               height: 0,
               isAnimating: true,
               animatedHeight: keyboardState.animatedHeight
             });
             
             // Animar gradualmente a altura para 0
             const animateHeight = (startTime: number) => {
               const elapsed = Date.now() - startTime;
               const progress = Math.min(elapsed / 400, 1); // 400ms de animação (mais lenta)
               // Easing mais suave para descida: ease-out-cubic
               const easeOut = 1 - Math.pow(1 - progress, 3);
               
               setKeyboardState(prev => ({
                 ...prev,
                 animatedHeight: startHeight * (1 - easeOut)
               }));
               
               if (progress < 1) {
                 requestAnimationFrame(() => animateHeight(startTime));
               } else {
                 setKeyboardState(prev => ({ 
                   ...prev, 
                   isAnimating: false,
                   animatedHeight: 0
                 }));
               }
             };
             
             requestAnimationFrame(() => animateHeight(Date.now()));
           }
        };

        // Usar visualViewport se disponível, senão window resize
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', handleViewportChange);
        } else {
          window.addEventListener('resize', handleViewportChange);
        }

        return () => {
          if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', handleViewportChange);
          } else {
            window.removeEventListener('resize', handleViewportChange);
          }
        };
      }
    };

    setupKeyboardListeners();

    return () => {
      // Cleanup listeners
      try {
        Keyboard.removeAllListeners();
      } catch (error) {
        // Ignorar erro se Capacitor não estiver disponível
        console.log('[useKeyboardDetection] Cleanup completed');
      }
    };
  }, []);

  return keyboardState;
}
