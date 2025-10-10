package com.ttsapp.android;

import android.app.ActivityManager;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.KeyEvent;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Toast;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    private static final String TAG = "KioskMode";
    private KeyguardManager keyguardManager;
    private KeyguardManager.KeyguardLock keyguardLock;
    private boolean isOutOfKioskMode = false;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Inicializa o KeyguardManager para controlar a tela de bloqueio
        keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        if (keyguardManager != null) {
            keyguardLock = keyguardManager.newKeyguardLock(TAG);
        }
        
        // Habilita o modo fullscreen/imersivo
        setupFullscreenMode();
        
        // Tenta ativar o kiosk mode
        setupKioskMode();
        
        // Desabilita a tela de bloqueio para evitar que o usuário fique "preso"
        disableKeyguard();
    }
    
    private void setupFullscreenMode() {
        Window window = getWindow();
        
        // Configura o controlador de window insets
        WindowInsetsControllerCompat windowInsetsController = WindowCompat.getInsetsController(window, window.getDecorView());
        
        // Esconde tanto a barra de status quanto a de navegação
        windowInsetsController.hide(WindowInsetsCompat.Type.systemBars());
        
        // Configura o comportamento das barras do sistema quando o usuário interage
        // BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE: Mostra as barras temporariamente quando o usuário faz swipe
        windowInsetsController.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        
        // Mantém o conteúdo atrás das barras do sistema
        window.setFlags(
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        );
        
        // Flags adicionais para kiosk mode e prevenção de tela de bloqueio
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        window.addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED);
        window.addFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        
        // Flag adicional para evitar que o sistema vá para tela de bloqueio
        window.addFlags(WindowManager.LayoutParams.FLAG_IGNORE_CHEEK_PRESSES);
    }
    
    private void setupKioskMode() {
        try {
            // Tenta iniciar o lock task mode se suportado
            startLockTaskModeIfSupported();
            
        } catch (Exception e) {
            Log.e(TAG, "Erro ao configurar kiosk mode: " + e.getMessage());
        }
    }
    

    
    private void startLockTaskModeIfSupported() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
                
                if (activityManager.getLockTaskModeState() == ActivityManager.LOCK_TASK_MODE_NONE) {
                    // Tenta iniciar o lock task mode
                    startLockTask();
                    Log.i(TAG, "Lock Task Mode iniciado");
                    Toast.makeText(this, "Modo Kiosk ativado", Toast.LENGTH_SHORT).show();
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Não foi possível iniciar Lock Task Mode: " + e.getMessage());
            // Fallback para screen pinning
            suggestScreenPinning();
        }
    }
    
    private void suggestScreenPinning() {
        Toast.makeText(this, 
            "Para modo kiosk: Configurações → Segurança → Fixar tela → Ativar", 
            Toast.LENGTH_LONG).show();
    }
    
    /**
     * Desabilita o keyguard (tela de bloqueio) para evitar que o usuário fique "preso"
     */
    private void disableKeyguard() {
        try {
            if (keyguardLock != null) {
                keyguardLock.disableKeyguard();
                Log.i(TAG, "Keyguard desabilitado - tela de bloqueio não será exibida");
            }
        } catch (Exception e) {
            Log.w(TAG, "Não foi possível desabilitar keyguard: " + e.getMessage());
        }
    }
    
    /**
     * Reabilita o keyguard (chamado quando o app é destruído)
     */
    private void enableKeyguard() {
        try {
            if (keyguardLock != null) {
                keyguardLock.reenableKeyguard();
                Log.i(TAG, "Keyguard reabilitado");
            }
        } catch (Exception e) {
            Log.w(TAG, "Não foi possível reabilitar keyguard: " + e.getMessage());
        }
    }
    
    /**
     * Verifica se o app saiu do modo kiosk e toma ações preventivas
     */
    private void handleKioskModeExit() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
            int lockTaskModeState = activityManager.getLockTaskModeState();
            
            if (lockTaskModeState == ActivityManager.LOCK_TASK_MODE_NONE) {
                if (!isOutOfKioskMode) {
                    Log.i(TAG, "App saiu do modo kiosk - aplicando medidas preventivas");
                    isOutOfKioskMode = true;
                    
                    // Garante que a tela de bloqueio não apareça
                    disableKeyguard();
                    
                    // Reaplica o modo fullscreen
                    setupFullscreenMode();
                    
                    // Mostra uma mensagem informativa para o usuário
                    Toast.makeText(this, 
                        "App em modo normal. Botões voltar/home pedirão PIN para desbloquear modo fixado", 
                        Toast.LENGTH_LONG).show();
                }
            } else {
                if (isOutOfKioskMode) {
                    Log.i(TAG, "App voltou ao modo kiosk");
                    isOutOfKioskMode = false;
                    Toast.makeText(this, "Modo kiosk reativado", Toast.LENGTH_SHORT).show();
                }
            }
        }
    }
    
    @Override
    public void onResume() {
        super.onResume();
        // Reaplica o modo fullscreen quando o app volta ao foco
        setupFullscreenMode();
        
        // Verifica se ainda está em kiosk mode
        checkKioskMode();
        
        // Verifica se saiu do modo kiosk e aplica medidas preventivas
        handleKioskModeExit();
        
        // Garante que o keyguard permaneça desabilitado
        disableKeyguard();
    }
    
    private void checkKioskMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
            int lockTaskModeState = activityManager.getLockTaskModeState();
            
            if (lockTaskModeState == ActivityManager.LOCK_TASK_MODE_NONE) {
                // Tenta reativar se não estiver ativo
                startLockTaskModeIfSupported();
            }
        }
    }
    
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            setupFullscreenMode();
            // Verifica se saiu do modo kiosk quando a janela ganha foco
            handleKioskModeExit();
            // Garante que o keyguard permaneça desabilitado
            disableKeyguard();
        }
    }
    
    @Override
    public void onBackPressed() {
        // Bloqueia o botão voltar em kiosk mode
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
            if (activityManager.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE) {
                // Em kiosk mode, não faz nada
                return;
            }
        }
        
        // Se saiu do modo kiosk, intercepta o botão voltar para evitar tela de bloqueio
        if (isOutOfKioskMode) {
            Log.i(TAG, "Botão voltar interceptado - evitando tela de bloqueio");
            // Simula o comportamento do botão visão geral (pede PIN para desbloquear modo fixado)
            requestUnpinTask();
            return;
        }
        
        // Comportamento normal se não estiver em kiosk mode
        super.onBackPressed();
    }
    
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Intercepta o botão home quando fora do modo kiosk
        if (isOutOfKioskMode && keyCode == KeyEvent.KEYCODE_HOME) {
            Log.i(TAG, "Botão home interceptado - evitando tela de bloqueio");
            // Simula o comportamento do botão visão geral (pede PIN para desbloquear modo fixado)
            requestUnpinTask();
            return true; // Consome o evento
        }
        
        return super.onKeyDown(keyCode, event);
    }
    
    /**
     * Solicita o desbloqueio do modo fixado (comportamento similar ao botão visão geral)
     */
    private void requestUnpinTask() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
                int lockTaskModeState = activityManager.getLockTaskModeState();
                
                if (lockTaskModeState == ActivityManager.LOCK_TASK_MODE_NONE) {
                    // Se não está em lock task mode, tenta iniciar novamente
                    startLockTaskModeIfSupported();
                } else {
                    // Se está em lock task mode, para o modo (isso pedirá PIN/digital)
                    stopLockTask();
                    Log.i(TAG, "Solicitado desbloqueio do modo fixado");
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Erro ao solicitar desbloqueio: " + e.getMessage());
        }
    }
    

    
    @Override
    public void onDestroy() {
        // Para o lock task mode quando o app é destruído
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                stopLockTask();
            } catch (Exception e) {
                Log.w(TAG, "Erro ao parar lock task mode: " + e.getMessage());
            }
        }
        
        // Reabilita o keyguard quando o app é destruído
        enableKeyguard();
        
        // Reseta o estado
        isOutOfKioskMode = false;
        
        super.onDestroy();
    }
}
