package br.app.soneca;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import java.util.Calendar;
import java.util.Locale;
import org.json.JSONException;
import org.json.JSONObject;

// Mamada em andamento na tela de bloqueio (item 13): uma notificação fixa que espelha o cronômetro do app.
// O estado é o mesmo do app ({start, l, r, run, since, last, at, baby}, em milissegundos). "Trocar de peito"
// e "Continuar" mudam o estado aqui mesmo; "Terminar" abre o app, que grava a mamada.
final class Mamada {
    static final String PREFS = "soneca_mamada", KEY = "state", FINISH = "finish";
    static final String ACT_SWITCH = "br.app.soneca.MAMADA_TROCAR", ACT_RESUME = "br.app.soneca.MAMADA_CONTINUAR";
    static final String EXTRA_FINISH = "mamada_terminar";
    private static final String CHANNEL = "mamada";
    private static final int ID = 1205;
    // Igual ao app: depois de 2 horas contando, pausa sozinho.
    private static final long MAX = 2 * 60 * 60 * 1000L;

    private Mamada() {}

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static JSONObject load(Context c) {
        String s = prefs(c).getString(KEY, null);
        if (s == null) return null;
        try { return new JSONObject(s); } catch (JSONException e) { return null; }
    }

    static void save(Context c, JSONObject t) { prefs(c).edit().putString(KEY, t == null ? null : t.toString()).apply(); }

    static String run(JSONObject t) { return t.isNull("run") ? null : t.optString("run"); }

    static long ms(JSONObject t, String side, long now) {
        long v = t.optLong(side);
        return side.equals(run(t)) ? v + now - t.optLong("since") : v;
    }

    static void cap(JSONObject t, long now) throws JSONException {
        String run = run(t);
        if (run == null || ms(t, "l", now) + ms(t, "r", now) <= MAX) return;
        t.put(run, t.optLong(run) + MAX - t.optLong("l") - t.optLong("r"));
        t.put("run", JSONObject.NULL);
        t.put("at", now);
    }

    // Igual ao toque no peito do app: o peito parado começa (e pausa o outro); o que conta, pausa.
    static void tap(JSONObject t, String side, long now) throws JSONException {
        String run = run(t);
        if (run != null) t.put(run, t.optLong(run) + now - t.optLong("since"));
        if (side.equals(run)) t.put("run", JSONObject.NULL);
        else { t.put("run", side); t.put("last", side); }
        t.put("since", now);
        t.put("at", now);
    }

    static void show(Context c, JSONObject t) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (t == null) { nm.cancel(ID); return; }
        if (Build.VERSION.SDK_INT >= 33
            && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Mamada em andamento", NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        long now = System.currentTimeMillis(), total = ms(t, "l", now) + ms(t, "r", now);
        String run = run(t), start = hhmm(t.optLong("start"));
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_mamada)
            .setContentTitle("Soneca · Mamada")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(open(c, false));
        if (run != null) {
            // O relógio do Android conta sozinho a partir do tempo já mamado.
            b.setWhen(now - total).setShowWhen(true).setUsesChronometer(true)
                .setContentText("no " + ("l".equals(run) ? "esquerdo" : "direito") + " · começou " + start)
                .addAction(0, "Trocar de peito", broadcast(c, ACT_SWITCH));
        } else {
            b.setShowWhen(false).setUsesChronometer(false)
                .setContentText(mss(total) + " · Mamada pausada · começou " + start)
                .addAction(0, "Continuar", broadcast(c, ACT_RESUME));
        }
        b.addAction(0, "Terminar", open(c, true));
        nm.notify(ID, b.build());
    }

    private static PendingIntent open(Context c, boolean finish) {
        Intent i = new Intent(c, MainActivity.class).putExtra(EXTRA_FINISH, finish)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, finish ? 2 : 1, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static PendingIntent broadcast(Context c, String action) {
        Intent i = new Intent(c, MamadaReceiver.class).setAction(action);
        return PendingIntent.getBroadcast(c, ACT_SWITCH.equals(action) ? 3 : 4, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static String hhmm(long t) {
        Calendar d = Calendar.getInstance();
        d.setTimeInMillis(t);
        return String.format(Locale.ROOT, "%02dh%02d", d.get(Calendar.HOUR_OF_DAY), d.get(Calendar.MINUTE));
    }

    private static String mss(long ms) {
        long s = ms / 1000;
        return String.format(Locale.ROOT, "%d:%02d", s / 60, s % 60);
    }
}
