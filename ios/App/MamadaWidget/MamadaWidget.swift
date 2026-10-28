import WidgetKit
import SwiftUI
import ActivityKit
import AppIntents

// O widget da Atividade ao Vivo da mamada: tela de bloqueio e Ilha Dinâmica. Textos aprovados em 28/10
// (prévia do cronômetro). A fonte é a do sistema: a Apple não deixa trocar aqui.

@main
struct MamadaWidgets: WidgetBundle {
    var body: some Widget { MamadaLiveActivity() }
}

// Cores do Soneca (styles.css): menta da mamada e o fundo e o número da tela de bloqueio.
private let menta = Color(red: 158.0 / 255, green: 217.0 / 255, blue: 184.0 / 255)       // --feed
private let mentaTinta = Color(red: 31.0 / 255, green: 90.0 / 255, blue: 59.0 / 255)  // --feed-ink
private let fundo = Color(red: 43.0 / 255, green: 47.0 / 255, blue: 54.0 / 255)       // --lock
private let numero = Color(red: 158.0 / 255, green: 217.0 / 255, blue: 184.0 / 255)      // --lock-num

private func hhmm(_ d: Date) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "pt_BR")
    f.dateFormat = "HH'h'mm"
    return f.string(from: d)
}

private func mss(_ s: Double) -> String {
    let n = Int(s), h = n / 3600, m = n / 60 % 60, x = n % 60
    return h > 0 ? String(format: "%d:%02d:%02d", h, m, x) : String(format: "%d:%02d", m, x)
}

private func lado(_ s: MamadaAttributes.ContentState) -> String {
    s.run == nil ? "Mamada pausada" : s.run == "l" ? "no esquerdo" : "no direito"
}

private struct Tempo: View {
    let s: MamadaAttributes.ContentState
    var body: some View {
        if s.run != nil {
            Text(timerInterval: s.from...Date.distantFuture, countsDown: false)
        } else {
            Text(mss(s.total))
        }
    }
}

private struct Botoes: View {
    let s: MamadaAttributes.ContentState
    var body: some View {
        HStack(spacing: 8) {
            Button(intent: MamadaTocarIntent()) {
                Text(s.run == nil ? "Continuar" : "Trocar de peito").frame(maxWidth: .infinity)
            }
            .buttonStyle(.plain)
            .padding(.vertical, 9)
            .background(Color.white.opacity(0.18), in: Capsule())
            Button(intent: MamadaTerminarIntent()) {
                Text("Terminar").frame(maxWidth: .infinity)
            }
            .buttonStyle(.plain)
            .padding(.vertical, 9)
            .foregroundStyle(mentaTinta)
            .background(menta, in: Capsule())
        }
        .font(.subheadline.weight(.medium))
    }
}

private struct Bloqueio: View {
    let s: MamadaAttributes.ContentState
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Soneca · Mamada").font(.subheadline.weight(.medium))
                Spacer()
                Text("começou " + hhmm(s.start)).font(.subheadline).opacity(0.8)
            }
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Tempo(s: s)
                    .font(.system(size: 32, weight: .medium))
                    .monospacedDigit()
                    .foregroundStyle(numero)
                    .fixedSize()
                Text(lado(s)).font(.subheadline).opacity(0.8)
                Spacer(minLength: 0)
            }
            Botoes(s: s)
        }
        .foregroundStyle(.white)
    }
}

struct MamadaLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MamadaAttributes.self) { ctx in
            Bloqueio(s: ctx.state)
                .padding(16)
                .activityBackgroundTint(fundo)
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { ctx in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text("Mamada").font(.subheadline.weight(.medium))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Tempo(s: ctx.state).font(.title3.weight(.medium)).monospacedDigit().foregroundStyle(numero)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(lado(ctx.state) + " · começou " + hhmm(ctx.state.start)).font(.subheadline).opacity(0.8)
                        Botoes(s: ctx.state)
                    }
                }
            } compactLeading: {
                Image(systemName: "timer").foregroundStyle(numero)
            } compactTrailing: {
                Tempo(s: ctx.state).monospacedDigit().frame(maxWidth: 52).foregroundStyle(numero)
            } minimal: {
                Image(systemName: "timer").foregroundStyle(numero)
            }
        }
    }
}
