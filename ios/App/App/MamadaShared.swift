import Foundation
import ActivityKit
import AppIntents

// Mamada em andamento na tela de bloqueio do iPhone (item 13): uma Atividade ao Vivo que espelha o
// cronômetro do app. O estado é o mesmo do app ({start, l, r, run, since, last, at, baby}, em
// milissegundos), guardado no grupo do app para o widget e os botões lerem. Este arquivo entra no app e
// no widget; o que só o app pode fazer (abrir e atualizar a Atividade) fica fora do widget (WIDGET).

@available(iOS 16.1, *)
struct MamadaAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var run: String?   // peito contando: "l", "r" ou nil (pausada)
        var from: Date     // contando: o relógio mostra o tempo desde aqui (os dois peitos somados)
        var total: Double  // pausada: segundos dos dois peitos
        var start: Date    // quando a mamada começou
    }
}

struct MamadaState: Codable {
    var start: Double
    var l: Double
    var r: Double
    var run: String?
    var since: Double
    var last: String?
    var at: Double?
    var baby: String?
}

extension Notification.Name {
    static let mamadaMudou = Notification.Name("br.app.soneca.mamadaMudou")
}

enum MamadaStore {
    static let group = "group.br.app.soneca"
    // Igual ao app: depois de 2 horas contando, pausa sozinho.
    static let max: Double = 2 * 60 * 60 * 1000
    static var defaults: UserDefaults? { UserDefaults(suiteName: group) }
    static var nowMs: Double { Date().timeIntervalSince1970 * 1000 }

    static func raw() -> String? { defaults?.string(forKey: "state") }
    static func saveRaw(_ s: String?) { defaults?.set(s, forKey: "state") }
    static func load() -> MamadaState? {
        guard let d = raw()?.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(MamadaState.self, from: d)
    }
    static func save(_ t: MamadaState) {
        guard let d = try? JSONEncoder().encode(t) else { return }
        saveRaw(String(data: d, encoding: .utf8))
    }
    // "Terminar" na tela de bloqueio: o app vê ao abrir e grava a mamada.
    static var finish: Bool {
        get { defaults?.bool(forKey: "finish") ?? false }
        set { defaults?.set(newValue, forKey: "finish") }
    }

    static func ms(_ t: MamadaState, _ side: String, _ now: Double) -> Double {
        (side == "l" ? t.l : t.r) + (t.run == side ? now - t.since : 0)
    }
    static func add(_ t: inout MamadaState, _ side: String, _ v: Double) {
        if side == "l" { t.l += v } else { t.r += v }
    }
    static func cap(_ t: inout MamadaState, _ now: Double) {
        guard let run = t.run, ms(t, "l", now) + ms(t, "r", now) > max else { return }
        add(&t, run, max - t.l - t.r)
        t.run = nil
        t.at = now
    }
    // Igual ao toque no peito do app: o peito parado começa (e pausa o outro); o que conta, pausa.
    static func tap(_ t: inout MamadaState, _ side: String, _ now: Double) {
        if let run = t.run { add(&t, run, now - t.since) }
        if side == t.run { t.run = nil } else { t.run = side; t.last = side }
        t.since = now
        t.at = now
    }

    @available(iOS 16.1, *)
    static func content(_ t: MamadaState) -> MamadaAttributes.ContentState {
        let now = nowMs, total = ms(t, "l", now) + ms(t, "r", now)
        return .init(run: t.run, from: Date(timeIntervalSince1970: (now - total) / 1000),
                     total: total / 1000, start: Date(timeIntervalSince1970: t.start / 1000))
    }
}

#if !WIDGET
// Abre, atualiza ou fecha a Atividade conforme o estado guardado. Só o app pode abrir uma Atividade.
@available(iOS 16.2, *)
enum MamadaLive {
    static func sync() async {
        var t = MamadaStore.load()
        if var x = t { MamadaStore.cap(&x, MamadaStore.nowMs); t = x }
        let acts = Activity<MamadaAttributes>.activities
        guard let t else {
            for a in acts { await a.end(nil, dismissalPolicy: .immediate) }
            return
        }
        let content = ActivityContent(state: MamadaStore.content(t), staleDate: nil)
        if let a = acts.first {
            await a.update(content)
            for b in acts.dropFirst() { await b.end(nil, dismissalPolicy: .immediate) }
        } else if ActivityAuthorizationInfo().areActivitiesEnabled {
            _ = try? Activity.request(attributes: MamadaAttributes(), content: content, pushType: nil)
        }
    }
}
#endif

// "Trocar de peito" (contando) e "Continuar" (pausada): o mesmo botão, sem abrir o app.
@available(iOS 17.0, *)
struct MamadaTocarIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Trocar de peito"
    static var isDiscoverable: Bool = false

    func perform() async throws -> some IntentResult {
        guard var t = MamadaStore.load() else { return .result() }
        let now = MamadaStore.nowMs
        MamadaStore.cap(&t, now)
        if let run = t.run { MamadaStore.tap(&t, run == "l" ? "r" : "l", now) }
        else { MamadaStore.tap(&t, t.last ?? "l", now) }
        MamadaStore.save(t)
        #if !WIDGET
        await MamadaLive.sync()
        NotificationCenter.default.post(name: .mamadaMudou, object: nil)
        #endif
        return .result()
    }
}

// "Terminar": abre o app, que grava a mamada (como no Android).
@available(iOS 17.0, *)
struct MamadaTerminarIntent: AppIntent {
    static var title: LocalizedStringResource = "Terminar"
    static var isDiscoverable: Bool = false
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        MamadaStore.finish = true
        #if !WIDGET
        NotificationCenter.default.post(name: .mamadaMudou, object: nil)
        #endif
        return .result()
    }
}
