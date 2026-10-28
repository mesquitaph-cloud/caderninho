package br.app.soneca;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONException;
import org.json.JSONObject;

// Ponte entre o cronômetro do app (JavaScript) e a notificação fixa. O app manda o estado a cada mudança
// (update) e, ao voltar, lê o que a notificação mudou e se alguém tocou em "Terminar" (get).
@CapacitorPlugin(name = "Mamada", permissions = @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications"))
public class MamadaPlugin extends Plugin {
    private static MamadaPlugin current;

    @Override
    public void load() {
        current = this;
        finishFrom(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent i) {
        super.handleOnNewIntent(i);
        finishFrom(i);
    }

    // "Terminar" na notificação abre o app com este aviso; o app grava quando ler.
    private void finishFrom(Intent i) {
        if (i == null || !i.getBooleanExtra(Mamada.EXTRA_FINISH, false)) return;
        i.removeExtra(Mamada.EXTRA_FINISH);
        Mamada.prefs(getContext()).edit().putBoolean(Mamada.FINISH, true).apply();
        changed();
    }

    static void changed() {
        if (current != null) current.notifyListeners("changed", new JSObject());
    }

    @PluginMethod
    public void update(PluginCall call) {
        String s = call.getString("state");
        JSONObject t = null;
        if (s != null) {
            try { t = new JSONObject(s); } catch (JSONException e) { call.reject("Estado inválido"); return; }
        }
        Mamada.save(getContext(), t);
        // Android 13 em diante pede a permissão de notificações; só na mamada que acabou de começar.
        if (t != null && Build.VERSION.SDK_INT >= 33 && call.getBoolean("ask", false)
            && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "afterPermission");
            return;
        }
        Mamada.show(getContext(), t);
        call.resolve();
    }

    @PermissionCallback
    private void afterPermission(PluginCall call) {
        Mamada.show(getContext(), Mamada.load(getContext()));
        call.resolve();
    }

    @PluginMethod
    public void get(PluginCall call) {
        SharedPreferences p = Mamada.prefs(getContext());
        JSObject r = new JSObject();
        r.put("state", p.getString(Mamada.KEY, null));
        r.put("finish", p.getBoolean(Mamada.FINISH, false));
        p.edit().remove(Mamada.FINISH).apply();
        call.resolve(r);
    }
}
