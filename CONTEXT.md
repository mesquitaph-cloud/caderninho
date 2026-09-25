# Caderninho

Aplicativo para famílias registrarem a rotina dos seus bebês — mamadas, sono, fraldas, vômitos — e
reverem o dia numa linha do tempo compartilhada. Serve à organização da própria família; não
interpreta os registros nem sugere condutas.

## Pessoas e grupos

**Família**:
O grupo de pessoas que cuida de um ou mais bebês e compartilha os mesmos registros.
_Evite_: perfil, conta, grupo, casa

**Criador**:
O membro que criou a família. É o único que convida, remove membros e apaga a família; se o
criador sai, a família deixa de existir.
_Evite_: dono, administrador, admin

**Membro**:
Uma pessoa que pertence a uma família. Todo membro vê e edita todos os registros da família. Uma
pessoa pode ser membro de várias famílias.
_Evite_: usuário, participante, cuidador

**Nome de exibição**:
Como a pessoa aparece para as famílias de que participa, escolhido por ela no primeiro acesso.
_Evite_: apelido, username, e-mail

**Convite**:
Link que o criador gera para uma única pessoa entrar na família; vale 7 dias ou até ser usado.
_Evite_: compartilhamento, acesso

**Indicação**:
Mensagem com o link do Caderninho que qualquer membro manda para outra família começar a sua. Não
dá acesso a nenhuma família: quem abre cria a própria.
_Evite_: convite (convite é para entrar numa família), compartilhamento

**Bebê**:
Uma criança acompanhada por uma família. Uma família pode ter mais de um bebê; cada registro é de
um único bebê.
_Evite_: filho, criança, paciente

## Registros

**Registro**:
Uma anotação de algo que aconteceu com um bebê num horário: uma mamada, uma ordenha, um dormiu,
um acordou, uma troca de fralda, um vômito ou outro fato anotado à mão.
_Evite_: evento, entrada, log, anotação

**Autor**:
O membro que fez o registro. Todo registro mostra seu autor, mesmo depois que ele deixa a família.
_Evite_: responsável, criador (criador é da família, não do registro)

**Mamada**:
Registro de alimentação, feita no peito ou na mamadeira; na mamadeira, com a quantidade em ml. No
peito, pode dizer qual peito e quantos minutos em cada um; nada disso é obrigatório.
_Evite_: refeição, alimentação, "comeu"

**Peito**:
Qual peito, na mamada no peito e na ordenha: o esquerdo, o direito ou os dois.
_Evite_: lado, mama, seio

**Ordenha**:
Registro do leite tirado do peito, com bomba ou à mão: a quantidade em ml e, se quiser, qual peito.
Não é mamada: conta o leite que saiu, não o que o bebê tomou.
_Evite_: extração, bombeamento, coleta

**Dormiu / Acordou**:
Os dois registros que marcam o início e o fim de um sono. O sono em si não é registrado: é o
intervalo entre um dormiu e o acordou seguinte.
_Evite_: soneca (como registro), cochilo

**Fralda**:
Registro de uma troca de fralda, com xixi, cocô ou os dois.
_Evite_: troca, evacuação, diurese

**Vômito**:
Registro de um vômito.
_Evite_: golfada, regurgitação

**Outros**:
Registro de texto livre para o que não cabe nas demais categorias.
_Evite_: nota, observação (observação é o comentário opcional dentro de qualquer registro)

**Linha do tempo**:
Os registros de um bebê num dia, do mais recente para o mais antigo.
_Evite_: histórico, feed, diário

## Ver os registros

**Painel da semana**:
Os 7 dias que terminam no dia escolhido, lado a lado: como foram os dias de 0h a 24h, a média por
dia, uma barra por dia e os maiores intervalos. Só junta o que foi registrado; não avalia nem compara
com outros bebês.
_Evite_: relatório, estatísticas, análise, desempenho

**Média por dia**:
O total de um tipo de registro dividido pelos dias que já terminaram e têm algum registro. Hoje não
entra, e dia sem nada anotado também não: dia sem registro não é dia sem mamada.
_Evite_: normal, esperado, meta

**Maior sono seguido**:
O sono mais longo entre um dormiu e o acordou seguinte, contado no dia em que começou. Sono de dia e
de noite contam juntos.
_Evite_: noite inteira, soneca

**Calendário**:
O mês que abre ao tocar na data, para escolher um dia dos últimos 60. No painel da semana, o dia
escolhido é o último dos 7.
_Evite_: agenda

## Conversa com quem cuida do app

**Mensagem**:
O que um membro manda pela seção "Sugestões e problemas" do menu: uma sugestão, algo que deu errado
ou só o texto. Vai junto o nome de quem mandou, a família aberta e o tipo de celular. Pelo app, só dá
para enviar: ninguém lê, nem quem mandou.
_Evite_: feedback (na tela), ticket, chamado, reclamação

**Quem cuida do Caderninho**:
Quem mantém o app e lê as mensagens, pelo painel do Supabase.
_Evite_: suporte, equipe, administrador, admin
