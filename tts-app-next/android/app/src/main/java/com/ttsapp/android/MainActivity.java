package com.ttsapp.android;

import android.app.ActivityManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Toast;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    private static final String TAG = "KioskMode";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Habilita o modo fullscreen/imersivo
        setupFullscreenMode();
        
        // Tenta ativar o kiosk mode
        setupKioskMode();
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
        
        // Flags adicionais para kiosk mode
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        window.addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED);
        window.addFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
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
    
    @Override
    public void onResume() {
        super.onResume();
        // Reaplica o modo fullscreen quando o app volta ao foco
        setupFullscreenMode();
        
        // Verifica se ainda está em kiosk mode
        checkKioskMode();
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
        
        // Comportamento normal se não estiver em kiosk mode
        super.onBackPressed();
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
        super.onDestroy();
    }
}
