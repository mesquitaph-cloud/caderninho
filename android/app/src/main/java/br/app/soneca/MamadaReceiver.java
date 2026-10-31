package br.app.soneca;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import org.json.JSONException;
import org.json.JSONObject;

// Botões "Pausar", "Trocar de peito" e "Continuar" da notificação: mudam o cronômetro sem abrir o app.
public class MamadaReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        JSONObject t = Mamada.load(c);
        if (t == null) { Mamada.show(c, null); return; }
        long now = System.currentTimeMillis();
        try {
            Mamada.cap(t, now);
            String run = Mamada.run(t);
            if (Mamada.ACT_PAUSE.equals(i.getAction()) && run != null) Mamada.tap(t, run, now);
            else if (Mamada.ACT_SWITCH.equals(i.getAction()) && run != null) Mamada.tap(t, "l".equals(run) ? "r" : "l", now);
            else if (Mamada.ACT_RESUME.equals(i.getAction()) && run == null) Mamada.tap(t, "r".equals(t.optString("last")) ? "r" : "l", now);
        } catch (JSONException e) {
            return;
        }
        Mamada.save(c, t);
        Mamada.show(c, t);
        MamadaPlugin.changed();
    }
}
