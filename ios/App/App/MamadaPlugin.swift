import UIKit
import Capacitor

// Ponte do cronômetro da mamada com a Atividade ao Vivo, com a mesma forma do plugin do Android:
// update({state}) guarda o estado e atualiza a tela de bloqueio; get() devolve {state, finish} e o
// evento "changed" avisa quando um botão da tela de bloqueio mudou algo.
@objc(MamadaPlugin)
public class MamadaPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MamadaPlugin"
    public let jsName = "Mamada"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        NotificationCenter.default.addObserver(forName: .mamadaMudou, object: nil, queue: .main) { [weak self] _ in
            self?.notifyListeners("changed", data: [:])
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        MamadaStore.saveRaw(call.getString("state"))
        if #available(iOS 16.2, *) {
            Task { await MamadaLive.sync(); call.resolve() }
        } else {
            call.resolve()
        }
    }

    // Item 63: com as notificações bloqueadas, o botão das notificações do Perfil leva aos ajustes do Soneca no iPhone.
    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else { return call.reject("Sem ajustes") }
            UIApplication.shared.open(url) { _ in call.resolve() }
        }
    }

    @objc func get(_ call: CAPPluginCall) {
        let finish = MamadaStore.finish
        MamadaStore.finish = false
        var r: [String: Any] = ["finish": finish]
        if let s = MamadaStore.raw() { r["state"] = s }
        call.resolve(r)
    }
}

// A tela do app, com o plugin da mamada registrado (plugins do próprio app não se registram sozinhos).
class SonecaViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(MamadaPlugin())
    }
}
