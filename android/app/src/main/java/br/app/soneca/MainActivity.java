package br.app.soneca;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin do próprio app (a mamada na tela de bloqueio); registra antes de a ponte subir.
        registerPlugin(MamadaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
