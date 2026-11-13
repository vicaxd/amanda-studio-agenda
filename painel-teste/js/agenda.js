/* Studio Amanda Rodrigues · conexão com a ponte do agendamento (Google Apps Script)
   Se AGENDA.API estiver vazio, funciona em MODO DEMONSTRAÇÃO com dados de exemplo salvos só neste aparelho. */
(function () {
  var CFG = window.AGENDA || {};
  var TEC = {
    cilios: ["Volume brasileiro", "Volume brasileiro marrom", "Fox eyes", "Fox eyes 5D", "Fox eyes marrom", "Sirena", "Efeito wispy", "Volume 6D", "Volume 8D", "Volume russo", "Efeito molhado", "Efeito molhado castanho"],
    sobrancelhas: ["Design", "Design masculino", "Design com henna", "Design com tintura", "Brow lamination", "Micropigmentação"]
  };
  var DN = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"], DS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"], MN = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  function api(acao, dados) {
    var corpo = Object.assign({ acao: acao }, dados || {});
    if (!CFG.API) return demo(corpo);
    return fetch(CFG.API, { method: "POST", body: JSON.stringify(corpo) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.erro) { var e = new Error(j.erro); e.auth = j.auth; throw e; } return j; });
  }

  /* ---------- utilidades ---------- */
  function hm(m) { return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
  function amin(s) { var a = s.split(":"); return +a[0] * 60 + +a[1]; }
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parse(s) { var a = s.split("-"); return new Date(+a[0], +a[1] - 1, +a[2]); }
  function dt(s) { var d = parse(s); return DN[d.getDay()] + ", " + String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); }
  function dur(m) { return m >= 60 ? Math.floor(m / 60) + "h" + (m % 60 ? String(m % 60).padStart(2, "0") : "") : m + " min"; }
  function lab(i) { return i.tipo === "sob" ? i.tec : i.tec + " (" + (i.tipo === "col" ? "colocação" : "manutenção") + ")"; }
  function rot(itens) { return (itens || []).map(lab).join(" + "); }
  function dig(t) { return String(t || "").replace(/\D/g, ""); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function waNum(t) { var d = dig(t); return d.length <= 11 ? "55" + d : d; }
  function linkMeus(tel, cod) { return (CFG.SITE || "") + "meus.html?t=" + dig(tel) + "&c=" + cod; }

  /* ---------- mensagens (emojis da Amanda) ---------- */
  var MSG = {
    pedido: function (p) {
      return "Oi, Amanda! Quero agendar pelo site 🩷\n\n⭐️ " + (p.itens.length > 1 ? "Técnicas" : "Técnica") + ": " + rot(p.itens) +
        "\n📅 Dia: " + dt(p.data) + "\n⏰ Horário: " + p.hora + "\n🙋 Nome: " + p.nome + (p.obs ? "\n📝 Observação: " + p.obs : "") +
        "\n\nAguardo a confirmação! 🧚🏼‍♀️\n\n🔑 Meu código pra acompanhar: " + p.cod + "\n" + linkMeus(p.tel, p.cod);
    },
    conf: function (p) {
      return "Oi, " + p.nome + "! Teu horário está confirmado ⭐️\n\n🩷 " + rot(p.itens) + "\n📅 " + dt(p.data) + " às " + p.hora +
        "\n📍 Rua Peri, 3475\n\nTe espero! 💋🧚🏼‍♀️\n\n🔑 Acompanha teu horário (código " + p.cod + "):\n" + linkMeus(p.tel, p.cod);
    },
    prop: function (p) {
      return "Oi, " + p.nome + "! 🧚🏼‍♀️ Nesse horário não vou conseguir, mas posso te atender em:\n\n📅 " + dt(p.sdata) + " às " + p.shora +
        "\n🩷 " + rot(p.itens) + "\n\nToca no link pra aceitar (código " + p.cod + "):\n" + linkMeus(p.tel, p.cod);
    }
  };
  /* api.whatsapp.com e não wa.me: o redirecionamento do wa.me estraga os emojis */
  function wa(numero, texto) { return "https://api.whatsapp.com/send?phone=" + numero + "&text=" + encodeURIComponent(texto); }

  /* ---------- MODO DEMONSTRAÇÃO ---------- */
  var DUR = { col: 120, man: 105, sob: 45 }, ABRE = 540, FECHA = 1080, PASSO = 30, DIAS = [2, 3, 4, 5, 6], JAN = 21;
  function store() { try { return JSON.parse(localStorage.getItem("amandaDemo")) || null; } catch (e) { return null; } }
  function save(s) { try { localStorage.setItem("amandaDemo", JSON.stringify(s)); } catch (e) {} }
  function dias() { var out = [], h = new Date(); h.setHours(0, 0, 0, 0); for (var i = 1; i <= JAN; i++) { var d = new Date(h); d.setDate(h.getDate() + i); out.push(d); } return out; }
  function seed() {
    var s = store(); if (s) return s;
    var ab = dias().filter(function (d) { return DIAS.indexOf(d.getDay()) >= 0; });
    s = {
      pessoal: [
        { data: ymd(ab[0]), titulo: "Dentista", ini: "14:00", fim: "15:30" },
        { data: ymd(ab[1]), titulo: "Almoço com a mãe", ini: "12:00", fim: "13:30" },
        { data: ymd(ab[2]), titulo: "Folga", diaInteiro: true },
        { data: ymd(ab[3]), titulo: "Aniversário da vó", ini: "15:00", fim: "18:00" },
        { data: ymd(ab[1]), titulo: "Rolê com as amigas", ini: "19:30", fim: "23:00" },
        { data: ymd(ab[4] || ab[0]), titulo: "Academia", ini: "07:00", fim: "08:00" }
      ],
      pedidos: [
        { id: "b1", status: "pendente", nome: "Bruna", tel: "51988881111", cod: "4821", itens: [{ tec: "Volume russo", tipo: "col" }], min: 120, data: ymd(ab[3]), hora: "15:00", obs: "É minha primeira vez fazendo extensão. Tenho os olhos um pouco sensíveis." },
        { id: "j1", status: "confirmado", nome: "Júlia", tel: "51977772222", cod: "7350", itens: [{ tec: "Fox eyes", tipo: "man" }], min: 105, data: ymd(ab[0]), hora: "09:00", obs: "" }
      ]
    };
    save(s); return s;
  }
  function busy(s, data, ignorar) {
    var b = [];
    s.pessoal.forEach(function (e) { if (e.data === data) b.push(e.diaInteiro ? [0, 1440] : [amin(e.ini), amin(e.fim)]); });
    s.pedidos.forEach(function (p) {
      if (p.id === ignorar) return;
      if ((p.status === "pendente" || p.status === "confirmado") && p.data === data) b.push([amin(p.hora), amin(p.hora) + p.min]);
      if (p.status === "proposta" && p.sdata === data) b.push([amin(p.shora), amin(p.shora) + p.min]);
    });
    return b;
  }
  function livres(s, min, ignorar) {
    return dias().map(function (d) {
      var data = ymd(d), L = [];
      if (DIAS.indexOf(d.getDay()) >= 0) { var b = busy(s, data, ignorar); for (var x = ABRE; x + min <= FECHA; x += PASSO) { var y = x + min; if (!b.some(function (q) { return x < q[1] && y > q[0]; })) L.push(hm(x)); } }
      return { data: data, semana: d.getDay(), horarios: L };
    });
  }
  function conflitos(s, p) {
    if (p.status !== "pendente" && p.status !== "conversar") return [];
    var a = amin(p.hora), b = a + p.min;
    return s.pessoal.filter(function (e) { return e.data === p.data && (e.diaInteiro || (a < amin(e.fim) && b > amin(e.ini))); });
  }
  /* cores do Google Agenda por procedimento (iguais às da ponte) */
  var CORES = { "1": "#7986cb", "2": "#33b679", "3": "#8e24aa", "4": "#e67c73", "5": "#f6bf26", "6": "#f4511e", "7": "#039be5", "8": "#616161", "9": "#3f51b5", "10": "#0b8043", "11": "#d50000" };
  var COR = { pessoal: "11", man: "9", col: "5", sob: "2", especial: "1" }, ESPECIAIS = ["Micropigmentação", "Brow lamination"];
  function corDe(itens) {
    itens = itens || [];
    if (itens.some(function (i) { return i.tipo === "col"; })) return COR.col;
    if (itens.some(function (i) { return i.tipo === "man"; })) return COR.man;
    if (itens.some(function (i) { return ESPECIAIS.indexOf(i.tec) >= 0; })) return COR.especial;
    return COR.sob;
  }
  function diaDemo(s, data) {
    return { data: data,
      eventos: s.pessoal.filter(function (e) { return e.data === data; }).map(function (e) { return { titulo: e.titulo, diaInteiro: !!e.diaInteiro, ini: e.ini || "", fim: e.fim || "", cor: COR.pessoal, cliente: false }; }),
      pedidos: s.pedidos.filter(function (p) { return p.status !== "recusado" && p.status !== "conversar" && (p.status === "proposta" ? p.sdata : p.data) === data; })
        .map(function (p) { var h0 = p.status === "proposta" ? p.shora : p.hora; return { id: p.id, nome: p.nome, itens: p.itens, cor: corDe(p.itens), ini: h0, fim: hm(amin(h0) + p.min), status: p.status }; }) };
  }
  function demo(r) {
    var s = seed(), achar = function (id) { var p = s.pedidos.find(function (x) { return x.id === id; }); if (!p) throw new Error("Pedido não encontrado"); return p; };
    return new Promise(function (ok, no) {
      setTimeout(function () {
        try {
          var a = r.acao, out;
          if (a.indexOf("admin.") === 0 && r.senha !== "demo") { var e = new Error("Senha incorreta (no modo demonstração a senha é: demo)"); e.auth = false; throw e; }
          if (a === "config") out = { duracoes: DUR };
          else if (a === "horarios") out = { dias: livres(s, (r.itens || []).reduce(function (t, i) { return t + DUR[i.tipo]; }, 0)) };
          else if (a === "pedir") {
            var min = r.itens.reduce(function (t, i) { return t + DUR[i.tipo]; }, 0);
            var d = livres(s, min).find(function (x) { return x.data === r.data; });
            if (!d || d.horarios.indexOf(r.hora) < 0) throw new Error("Esse horário acabou de ser ocupado. Escolha outro, por favor.");
            var p = { id: Math.random().toString(36).slice(2, 8), status: "pendente", nome: r.nome, tel: dig(r.tel), cod: String(1000 + Math.floor(Math.random() * 9000)), itens: r.itens, min: min, data: r.data, hora: r.hora, obs: r.obs || "" };
            s.pedidos.push(p); out = { id: p.id, cod: p.cod, min: min };
          }
          else if (a === "meus") { var t = dig(r.tel), L = s.pedidos.filter(function (p) { return p.tel === t; }); out = { pedidos: L.some(function (p) { return p.cod === String(r.cod).trim(); }) ? L.slice().reverse() : null }; }
          else if (a === "aceitar" || a === "conversar") {
            var q = achar(r.id); if (q.tel !== dig(r.tel) || q.cod !== String(r.cod)) throw new Error("Não autorizado");
            if (q.status === "proposta") { if (a === "aceitar") { q.data = q.sdata; q.hora = q.shora; q.sdata = q.shora = ""; q.status = "confirmado"; } else q.status = "conversar"; }
            out = { status: q.status };
          }
          else if (a === "admin.login") out = { ok: true };
          else if (a === "admin.lista") out = { pedidos: s.pedidos.slice().reverse().map(function (p) { return Object.assign({}, p, { conflitos: conflitos(s, p).map(function (e) { return { titulo: e.titulo, diaInteiro: !!e.diaInteiro, ini: e.ini, fim: e.fim }; }) }); }) };
          else if (a === "admin.dia") out = diaDemo(s, r.data);
          else if (a === "admin.periodo") { var b0 = parse(r.inicio), L2 = []; for (var k = 0; k < Math.min(+r.dias || 7, 14); k++) { var dk = new Date(b0); dk.setDate(b0.getDate() + k); L2.push(diaDemo(s, ymd(dk))); } out = { dias: L2 }; }
          else if (a === "admin.horarios") out = { dias: livres(s, achar(r.id).min, r.id) };
          else if (a === "admin.confirmar") { achar(r.id).status = "confirmado"; out = { ok: true }; }
          else if (a === "admin.sugerir") { var z = achar(r.id); z.status = "proposta"; z.sdata = r.data; z.shora = r.hora; out = { ok: true }; }
          else if (a === "admin.recusar") { achar(r.id).status = "recusado"; out = { ok: true }; }
          else throw new Error("Ação desconhecida");
          save(s); ok(JSON.parse(JSON.stringify(out)));
        } catch (err) { no(err); }
      }, 350);
    });
  }

  window.Agenda = { CORES: CORES, COR: COR, corDe: corDe, api: api, TEC: TEC, DS: DS, MN: MN, DN: DN, hm: hm, amin: amin, parse: parse, dt: dt, dur: dur, lab: lab, rot: rot, dig: dig, esc: esc, wa: wa, waNum: waNum, MSG: MSG, linkMeus: linkMeus, demo: !CFG.API, CFG: CFG,
    resetDemo: function () { try { localStorage.removeItem("amandaDemo"); } catch (e) {} } };
})();
