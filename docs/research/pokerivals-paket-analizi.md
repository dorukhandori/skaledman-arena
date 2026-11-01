# PokeRivals istemci paketi analizi (pokerivals.xyz, Vite derlemesi)

Tarih: 2026-11-01. Bir alt ajan tarafından yayınlanmış, minify edilmiş istemci chunk'larından çıkarıldı; her bulgu dosya adı ve alıntıyla. Sunucu kodu kapalı; sunucu tarafı yalnız istemcinin beklediği mesajlardan çıkarsanır ("inferred" diye işaretli). Yoldaş dosyalar: [pokerivals-inceleme.md](pokerivals-inceleme.md), [pokerivals-oynanis-gozlemi.md](pokerivals-oynanis-gozlemi.md).

Ana oturumun paketten doğruladığı değerler: dash `{duration:.15,distance:60,cooldown:10,invulnerable:.12}` (`roles`), zıplama `altura:22,cooldown:.5,costo:1/3` (`curvas`), saha `halfWidth:380,depth:480` (`roles`), protokol `version:35` (`etapasDeHud`), uzlaştırma `{umbral:1.5,salto:96,ritmo:10,topePorSegundo:240}` (`arenaRed`), hız `{base:150,factor:e=>.7+.6*e/130}` (`roles`), kolay bot `reaccion:.7,esquiva:.1` (`entrenadores`).

Kaynak: `/private/tmp/claude-501/-Users-dorukhanersoyleyen-dev-skaledman-arena/48a34a8c-aa54-484a-aae9-b264127d1ea7/scratchpad/pr/assets/*.js` (minify edilmiş, tanımlayıcılar İspanyolca). Her bulgu dosya adıyla ve alıntıyla verilir; çıkarım olanlar "çıkarım" diye işaretlidir. Tarih: 2026-11-01.

## 1. Netcode protokolü

### 1.1 Sunucu adresi ve taşıma
- Tek sunucu sabiti (`etapasDeHud-B8Dp6L_O.js`): ``er=`https://pokemon-arena-servidor.fly.dev` `` → `tr()` fonksiyonu `https:`→`wss:`, `http:`→`ws:` çevirir; `VITE_SERVIDOR_URL` ortam değişkeni önceliklidir. Yani **tek bir WebSocket** (`new WebSocket(url)`), JSON metin çerçeveleri (`t.send(JSON.stringify(n.data))`). HTTP `fetch(...)` çağrısı oyun kodunda yok; tek HTTP ucu telemetri: aynı origin üstünde `pathname="/telemetria"` (bkz. §9).
- Supabase istemcisi var: `https://tskanonzmrbtzmzgwysd.supabase.co` (`index-CzWeQhpq.js`); oyun protokolü değil, hesap/auth (bkz. §5).
- Her mesaj hem gönderimde hem alımda **zod** şemasıyla doğrulanır (`entrenadores-DjPr1NE5.js` içinde `Ws("t",[...])` discriminated union). Şemaya uymayan sunucu mesajı: ``console.warn(`mensaje del servidor que no respeta el protocolo: se ignora`)``; uymayan istemci mesajı gönderilmez.

### 1.2 El sıkışma, sürüm, yeniden bağlanma (`etapasDeHud-B8Dp6L_O.js`, sınıf `br`)
- Açılışta: ``this.mandar({t:`hola`,version:35,apodo:e,...n?{reanudar:n}:{},...r?{token:r}:{}})`` → **protokol sürümü 35**; `apodo` (takma ad, maks. 16), isteğe bağlı `reanudar` (64 hex karakterlik devam anahtarı: ``Yl=j().length(64).regex(/^[0-9a-f]{64}$/)``) ve `token` (hesap JWT'si, maks. 3500).
- Yanıt: ``Df=F({t:L(`bienvenida`),version:R(0,1e3),jugadorId:H,tickHz:R(1,240),snapshotHz:R(1,240),reanudacion:Yl.optional()})`` → sunucu **tickHz ve snapshotHz** değerlerini bildirir (sayılar sunucuda; istemci varsayılanı `this.hz=t.hz??t.inicio.tickHz??60` yani **60 Hz**).
- Yeniden bağlanma: `reanudar()` aynı `apodo`+`llave` (bienvenida'daki `reanudacion`) ile yeni socket açar; `darPorCaida()` socket'i düşmüş sayar. Oyun içinde `inicio` mesajı tekrar gelirse `alReanudar()` tahmin/giriş geçmişini sıfırlar. Sunucu `aviso` olayı yollar: ``aviso:I([`desconectado`,`volvio`,`bot`]),jugadorId,segundos`` → kopan oyuncunun yerine **bot** geçebiliyor (çıkarım: `bot` avisosu).
- Hata kodları (sunucu `error` mesajı): `version, malformado, flood, orden, salaInexistente, salaLlena, asientoOcupado, equipoInvalido, noAnfitrion, echado, faltanListos, limiteSalas, limiteConexiones, inactivo, servidorLleno, reanudacion, reemplazado, token, sinCuenta, sesionVencida, cuentasNoDisponibles, sinApodo, apodoTomado, apodoInvalido, cambioDeApodo, noEncontrado, limiteAmigos, limiteSolicitudes, demasiadasSolicitudes, loBloqueaste, amigoNoDisponible, limiteInvitaciones` (`flood` = hız sınırı, `orden` = sıra ihlali).

### 1.3 Mesaj tipleri (`entrenadores-DjPr1NE5.js`, ``t:L(`…`)`` literal'leri)
İstemci→sunucu (lobi/sosyal): `hola, crearSala, entrarSala, verSala, asiento, esperar, equipo, listo, empezar, arena, echar, salir, ping, renovar, elegirApodo, marcar, agregarAmigo, responderAmistad, quitarAmigo, bloquear, desbloquear, invitar, borrarCuenta, listarEquipos, guardarEquipo, borrarEquipo, importarEquipos, favoritosEquipos, activarEquipo, equipar, comprar, comprarBoleto, comprarCaramelo, usarPiedra, volverShiny, reclamar, baya, safari, verSafari, historia*` (historiaArranque/Empezar/Pelear/Ruta/Tramo/Subir/Movimientos/Equipos/Entrega/Legendario/Retomar/Abandono).
İstemci→sunucu (maç): **`intencion`** ve **`ping`**.
Sunucu→istemci: `bienvenida, error, estadoSala, infoSala, inicio, snapshot, vistaEspectador, eventos, aviso, pong, cuenta, amigos, presencia, invitacion, hecho, cuentaBorrada, equipos, market, marketCatalogo, misiones, estadoMisiones, estadoSafari, historia, historiaEstado, historiaVerificada`.
- Oda kurma: ``{t:`crearSala`,modo:e,titulares:t,nivelBot:n,combate:r}`` → `modo ∈ {1v1, 2v2}`, `nivelBot ∈ {facil, normal, dificil}|null`, `combate ∈ {competitivo, libre}` (varsayılan `competitivo`). `entrarSala` `{codigo, lado?}`, `asiento {lado}`, `esperar` (bekleme sırasına geç), `echar {jugadorId}`, `arena {arena}`.
- Oda kodu: ``hl=j().length(6).regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/)`` → **6 harf, I/O yok** (karışıklık önleme alfabesi). Lobi alanı `placeholder:"ABCD-EFGH"` ve `$n=e=>`${e.slice(0,4)}-${e.slice(4)}`` 8 karakterlik biçim ise **arkadaş kodu** için (doğrulandı: ``K=j().length(8).regex(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/)`` arkadaş kodu, I/L/O/0/1 yok; oda kodu 6 harf). Takma ad ``gl=j().min(2).max(16).regex(/^[\p{L}\p{N}_-]+(?: [\p{L}\p{N}_-]+)*$/u)``.
- `estadoSala`: `codigo, modo, combate, titulares, nivelBot, anfitrion, arena, fase, asientos(≤4), espera(≤4)`; `inicio`: `tick, jugadorId, ladoId, jugadores(2..4: jugadorId, ladoId, apodo, bot, skin∈{rojo,azul,violeta,giovanni}, shiny bitmask), arena{halfWidth,depth}, mapa, tickHz(1..240), esperaCargaMs(≤30000), espectador`.

### 1.4 Girdi kodlaması (`intencion`)
``su=F({t:L(`intencion`),tick:R(0,B.tick),mover:Kl,apuntar:G,acciones:P(ql).max(B.accionesPorIntencion),apuntaCaida:N().optional()})`` ile ``Kl=F({x:V(-1,1),z:V(-1,1)})`` ve sınırlar ``B={…,accionesPorIntencion:4,…,coordenada:2e3,tick:216e3,…}``:
- `tick`: istemcinin hedeflediği sunucu tick'i (0..216000 = 60 Hz'de 60 dk).
- `mover`: birim-daire içine kırpılmış hareket vektörü `{x,z}` (`dn()` normalize eder).
- `apuntar`: dünya koordinatında nişan noktası `{x,z}` (±2000'e kırpılır), **açı değil nokta**.
- `acciones` (tick başına en fazla 4): ``ql=Ws(`a`,[{a:`lanzar`,slot:0..3},{a:`esquivar`},{a:`saltar`},{a:`descansar`},{a:`salida`},{a:`cambiar`,slot:0..5,caida:G?}])`` → hamle at (slot 0-3), dash, zıpla, dinlen, çık (yer altından/havadan `salida`), Pokémon değiştir (düşüş noktasıyla).
- `apuntaCaida`: isteğe bağlı bayrak (düşüş noktasını nişanlama; çıkarım).
- Gönderim hızı: her render karesinde `mandarIntenciones` sunucu saatine göre hedef tick hesaplar (`t + rttMin/2 + adelanto(2 tick)`), son gönderilen tick'ten hedefe kadar **her tick için bir `intencion` mesajı** yollar; boşluk 6 tick'ten (`Vn=6`) büyükse arayı atlar. Yani ~**tick başına 1 mesaj (60/s)**; `enviadas` tamponu son 120 tick.

### 1.5 Sunucu saati, ping, snapshot (`arenaRed-f7VwH56V.js`)
- `Tn` sınıfı: `pingCadaMs=1000` → saniyede bir ``{t:`ping`,n}``; `pong {n,tick}` ile RTT (`rttSuave` EMA 0.25, `rttMediano`, `rttMinimo` son 8 örnek). Saat ofseti en düşük RTT'li örnekten alınır (`corrimiento`), snapshot gelince de ileri ayarlanır.
- `snapshot`: ``kd=F({t:L(`snapshot`),tick,ack:R(-1,B.tick),propio:Td,aliados:P(Td).max(1),rivales:P(Od).max(2)})``. `ack` = sunucunun işlediği son intencion tick'i. `propio/aliados` tam veri (equipo: key, nivel, hp, maxHp, pp[], cooldowns[], ko; actor: slot, key, pos, mira(-10..10 rad), estados[], altura, plano∈{suelo,aire,subsuelo}, etapas, mofa, apunta, velocidad, esquiva (0..600 desisaniye)). **Rakip için `vida` (0..1 oranı) ve `siluetas`** (görünmeyen rakip için slot/key/pos silueti) → rakibin tam HP'si istemciye gitmiyor.
- `vistaEspectador`: seyirciye 4 oyuncuya kadar aynı rakip biçimi.
- `eventos`: dizi; olay tipleri ``e:L(…)``: `aviso, lanzo{movimiento,desde,hacia}, fase{movimiento,proceso,nombre,a?,en?}, pego{movimiento,a,aLado,dano?,efectividad(0..16)?,devolucion?,alDoble?}, ko{slot,key}, cambio{de,a,key,caida}, esquiva{desde,hasta}, salto, estado{cual,accion∈{pone,renueva,quita}}, etapa{stat,cambio(-12..12)}, danoEstado, cura, baldosa, marca, objeto, fin{ganador,motivo∈{ko,abandono,tiempo},historia?}`.

### 1.6 Tahmin ve uzlaştırma (client prediction / reconciliation)
- Sınıf `gn` (`arenaRed`): yalnızca **kendi pozisyonu** tahmin edilir (hareket + dash itişi + yüzey fizikleri: buz ivmesi, rüzgar, çit, döşeme, konveyör). `pendientes` son 120 girdi; `reconciliar(tick,pos)` sunucu pozisyonundan ack sonrası girdileri yeniden oynatır.
- Düzeltme parametreleri: ``pn={umbral:1.5,salto:96,ritmo:10,topePorSegundo:240}``, `mn=.02` → hata ≤1.5 birim: yok sayılır (`nada`/`directa`), >96 birim: anında **zıplatma** (`salto`), arada: yumuşak düzeltme (`suave`) üstel `ritmo=10`/s, en çok 240 birim/s.
- Hamleler, vuruşlar, HP: **sunucu karar verir**. İstemci yalnız `adelantarVida` ile kendi HP'sini olaylardan (`pego`, `danoEstado`, `cura`) snapshot gelene kadar öne alır (tahmini HP gösterimi). Hamle animasyonu `lanzo`/`fase` olayıyla başlar; `corriendoPredicho` ile yerel ön izleme var (çıkarım: hamle başlangıcı yerelde öngörülüyor, isabet değil).
- Dash yerel: `An` sınıfı `esquivar` eylemi gönderildiğinde `kn=round(dash.duration*hz)` tick boyunca eased itiş (`We()` easing) tahmin eder; sunucu `esquiva` olayı ve `esquiva` desisaniye sayacıyla onaylar.

### 1.7 Uzak oyuncu enterpolasyonu
- `sn` sınıfı: son 60 snapshot (`slice(-59)`), çizim tick'i için ikili arama, iki kare arasında lineer pos/`mira` (açı kısa yoldan), 15 tick'e kadar **ekstrapolasyon** (`Math.min(t-o.tick,15)`).
- `ln` sınıfı: ekstrapolasyondan dönüşte sapma yumuşatma (`nn=.12` s zaman sabiti, 4..120 birim arası sapmalar).
- Enterpolasyon gecikmesi **uyarlamalı** (`Rn`): başlangıç 2 tick (`retardoTicks??2`), kare eksikliği oranı >%5 (`Nn=.05`, en az 10 örnek, 2 s pencere) ise +1 tick (üst sınır 4), 5 s (`Pn=5e3`) sakinlikten sonra düşer; tekrar düşerse sakinlik 2× (en çok 40 s). `adelanto=2` tick girdi öne alma.
- `medidas()` çıktısı: `rtt, rttMediano, rttUltimo, pongs, tickServidor, tickDibujo, ultimoSnapshot, ultimaIntencion, intenciones, snapshots, correcciones{directas,suaves,saltos,errorMaximo}, extrapolaciones, retardo, golpes{recibido,dado}` histogramı (`_n=[25,50,75,100,150]` ms kovaları).

### 1.8 `calidadDeRed-DXLBOhjX.js` (ağ kalitesi göstergesi), tamamı:
```
function e(e){return e.msSinSnapshot>400||e.rttMs!==null&&e.rttMs>220?`mala`:e.rttMs===null||e.rttMs>120||e.retardoTicks>3?`regular`:`buena`}
```
→ **mala**: 400 ms'den uzun snapshot yok veya RTT>220 ms; **regular**: RTT bilinmiyor/ >120 ms veya enterpolasyon gecikmesi >3 tick; aksi **buena** (3/2/1 çubuk).

## 2. Simülasyon kuralları

### 2.1 Zaman adımı ve determinizm
- Sunucu tick'i `bienvenida.tickHz` / `inicio.tickHz` ile gelir; istemci varsayılanı **60 Hz** (`arenaRed`: `this.hz=t.hz??t.inicio.tickHz??60`). Tahmin adımı `i=1/this.op.hz`. Şema üst sınırı 240 Hz, `tick` sınırı 216000.
- Yerel (bot/ensayo) simülasyon `arena-BaR33htr.js`: `pasos(e){this.acumulado+=Math.min(Math.max(0,e),6);…}` → kare başına en fazla 6 tick biriktirme (spiral of death koruması).
- **Deterministik matematik**: `roles-BdSjYcEJ.js` kendi `N={sin:en,cos:tn,atan:an,atan2:cn,acos:xn,exp:An}` polinom uygulamalarını kullanır (platformlar arası aynı sonuç; çıkarım: sunucu-istemci bit-eşitliği için).

### 2.2 Arena ve hareket (`roles-BdSjYcEJ.js`)
- Saha: ``_={halfWidth:380,depth:480}`` → x ∈ [-380,380], z ∈ [0,480] birim; `Me={id:"estadio",…,superficie:"normal",obstaculos:[],etapa:13}` varsayılan harita. Doğum noktaları ``De=[{x:-110,z:120,direction:2},{x:110,z:120,direction:6}]``.
- Gövde yarıçapı `bodyRadius:14`. Hız: ``ur={base:150,factor:e=>.7+.6*e/130}; dr(e)=ur.base*ur.factor(e)`` → **hız = 150·(0.7+0.6·BaseSpeed/130) birim/s** (Speed 0 → 105, 65 → 150, 130 → 195). Felç ×0.5 (`Ln.factorVelocidad`).
- Dash (SHIFT): ``dash:{duration:.15,distance:60,cooldown:10,invulnerable:.12}`` → 0.15 s'de 60 birim, **10 s bekleme**, 0.12 s dokunulmazlık. Buzda `hielo.esquiva:1.25`, suda `agua.esquiva:.7` mesafe çarpanı. Sunucu snapshot'ta `esquiva` (0..600 desisaniye) kalan bekleme.
- Zıplama (SPACE) (`curvas-DlQOU6nO.js`): ``w={duracion:.5,altura:22,cooldown:.5,costo:1/3,aterrizaje:.12,despegue:.08,…}`` → 0.5 s parabol, 22 birim yükseklik, 0.5 s bekleme, **enerji** 1/3 harcar (`energyRegen:.4`/s, enerji 0..1); yerde, bloklanmamış, sersemlememiş olmalı. Havadayken `plano:"aire"`; `terremoto` yerdekilere ×1, havaya 0, yer altına ×2 (`H()` fonksiyonu).
- Yüzeyler: `hielo` (ivme 380, fren 300), `lava` (saniyede HP'nin 1/24'ü, 0.25 s tik, min 2), `charco` (hız ×0.6), `agua` (yüzücü ×1.1), `cerco` (çit: HP 1/20, 0.5 s tolerans, 40 itiş), `baldosa` (döşeme 0.25 s uyarı), `cinta` (konveyör 220), `viento` (60 hız, 2 s rafaga), `niebla` (sis: 200 net, 280 silüet).
- Diğer: `knockback:40`, `hitStun:.22` s, `respawnDelay:2.5`, `aimAssistRadius:0` (nişan yardımı kapalı), `limitesDeUso:!0`, **`pp:!1`** (PP sistemi kapalı, yalnız cooldown/şarj), `restPpEvery:1.2` (dinlenirken 1.2 s'de 1 PP geri).

### 2.3 Stat → arena dönüşümü (`roles` `V`, `curvas`)
```
function V(e,t,n=!1){let r=Math.floor((2*e+31)*t/100);return n?r+t+10:r+5}   // e=base stat, t=nivel
this.maxHp=ve(t.stats.ps,this.nivel,!0)                                        // curvas-DlQOU6nO.js
```
→ Ana seri formülü, **IV 31, EV 0, nötr doğa**: HP = ⌊(2·Base+31)·L/100⌋+L+10, diğer statlar = ⌊(2·Base+31)·L/100⌋+5. Varsayılan seviye **50** (`e.atacante.nivel??50`); seviye 1..100 (`or()` doğrular).

### 2.4 Hasar formülü (`roles-BdSjYcEJ.js`, `lr`)
```
s=Math.floor(Math.floor((2*n/5+2)*e.poder*r/i)/50)+2;
c=t&&e.atacante.quemado?P.factorFisico:1;
l=s*(a?1.5:1)*cr(o)*(e.factor??1)*c; return {dano:Math.max(1,Math.round(l)),efectividad:o,stab:a}
```
- Ana seri temel hasar (n=seviye, poder=güç, r=Atk/SpA, i=Def/SpD; `clase:"fisico"` → fiziksel, aksi özel; `defensaContra` ile ters savunma seçilebilir).
- **STAB 1.5**. Etkinlik ``cr(e){return e>1?ir:e>0&&e<1?ar:e}`` ile ``ir=1.5, ar=2/3`` → **süper etkili 1.5× (2× değil), az etkili ⅔×, bağışık 0**. Tip matrisi `sr(matriz,tipo,defTipos)` çarpımsal (4× → yine 1.5'e indirgenir).
- Yanık fiziksel ×0.5 (`factorFisico:.5`). **Rastgele varyans yok, kritik vuruş yok** (formülde; `critico` yalnız bazı hamle kurallarında `factor` olarak geçer, `basicos` `tn()`: `...t.critico?{critico:t.critico}:{}`). `factor` çoklu vuruşta 1/golpes.
- Stat kademeleri (`z={duracion:8,max:6,movimiento:.5,combate:.5}`): ``Yn(e)= t>=0?(2+t)/2:2/(2-t)`` ana seri çarpanı, ama **`Zn(e)=Yn(e)**0.5`** (dövüşte karekökü), hareket için de `**0.5`; kademe artışları **8 s** sonra düşer. `etapa` olayı -12..12 aralığında.

### 2.5 Durum etkileri (`roles`, sabitler)
| Durum | Sabit | Anlam |
|---|---|---|
| Yanık | `P={duracion:6,cada:1.5,fraccionPs:1/16,factorFisico:.5}` | 6 s, 1.5 s'de bir maxHP/16, fiziksel hasar ½; Ateş tipine işlemez |
| Donma | `Fn={duracion:1.8,grietaPorGolpe:.6}` | 1.8 s, her vuruş 0.6 çatlatır; Buz tipine işlemez |
| Felç | `Ln={duracion:5,factorVelocidad:.5,cada:1,probTrabado:.25,trabado:.5}` | 5 s, hız ½, saniyede %25 ihtimalle 0.5 s takılma; Elektrik bağışık |
| Zehir | `I={duracion:4,cada:1,fraccionPs:1/12}` | 4 s, saniyede maxHP/12; Zehir/Çelik bağışık |
| Ağır zehir | `L={duracion:6,cada:1,fraccionBase:1/48}` | 6 s, artan (1/48·n) |
| Konfüzyon | `R={duracion:3,desvio:.85,periodo:1.3,…,probTropiezo:.3,tropiezo:.35}` | 3 s, hareket yönü sinüs sapması, %30 tökezleme 0.35 s |
| Uyku | `$n={duracion:2.5}` (çıkarım) | 2.5 s |
| Mofa (taunt) | ayrı; `Jn={taunt:.22,…}` | durum hamlesi kullanılamaz (`Fe(t.clase,e.isTaunted)`) |
- Azalan getiri: ``B={ventana:4,factores:[1,.6,.3],piso:.3,serie:1}`` → 4 s içinde aynı aile tekrar uygulanırsa süre ×0.6, ×0.3, taban 0.3.
- Durum hamlesi ön süreleri (`curvas` `Jn`): `toxic:.26,"thunder-wave":.2,"will-o-wisp":.3,taunt:.22,hypnosis:.3,supersonic:.2,"confuse-ray":.26,disable:.22,"poison-gas":.26` s.

### 2.6 Telegraf (`aviso`) süreleri
``G={instantaneo:.08,corto:.2,largo:.45}``, varsayılan `br=.24` s; hamle `avisoSegundos` ile özel değer verebilir (ör. `substitute` .35, `swords-dance` .62).

### 2.7 Hamle verisi ve aileler
- Her hamle `{id,rules:{familia,aviso|avisoSegundos,cooldown,ppArena,velocidad?,alcance?,radio?,cargas?,recargaS?,quemar?/paralizar?/…,bajar?/subir?,apoyo?,objetivo?,curar?,sinAura?},roles:[…]}`. Örnekler (`roles`):
  - ``{id:`water-gun`,rules:{familia:`disparo`,aviso:`instantaneo`,cooldown:.45,ppArena:25,cargas:3,recargaS:6,velocidad:640,alcance:210,radio:8}}``
  - ``{id:`flash-cannon`,rules:{familia:`haz`,aviso:`corto`,cooldown:3.5,ppArena:6,velocidad:2800,alcance:260,radio:10,bajar:{stat:`defensaEspecial`,etapas:-1,prob:.1}}}``
  - ``{id:`scald`,rules:{familia:`vapor`,aviso:`corto`,cooldown:3.5,ppArena:6,velocidad:1900,alcance:230,radio:9,quemar:.3}}``
  - ``{id:`protect`,rules:{familia:`proteccion`,cooldown:5,ppArena:6,apoyo:!0,objetivo:`propio`}}``
  - ``{id:`substitute`,rules:{familia:`sustituto`,avisoSegundos:.35,sinAura:!0,cooldown:10,ppArena:4,…}}`` (snapshot'ta `doble` aktörü = substitute kuklası, `alDoble` bayrağı)
  - ``{id:`roost`/`recover`,rules:{familia:`curacion`,cooldown:20,ppArena:4,curar:.4}}`` → maxHP %40
  - ``{id:`swords-dance`,rules:{familia:`potenciar`,avisoSegundos:.62,cooldown:6,ppArena:3,subir:[{stat:`ataque`,etapas:2}]}}``
- Cooldown aralığı gözlenen: 0.45 s (spam projektil, 3 şarj/6 s dolum) … 20 s (iyileşme). `ppArena` 3..35.
- **Aile listesi (≈95)**: `acido aguijon atadura avalancha barrido bocajarro bomba brillo cabezazo carga cascada chispazo chorro cola cono-etapa contraataque curacion disparo doble-filo dragon-pulso drenadoras drenaje electrotela embestida-veloz embestida esfera-aural esquirla estado excavar fuerza-bruta golpe-aereo golpe-bajo golpe-cuerpo golpe-fantasma haz hiperrayo hoja ida-vuelta karate lanzarrocas latigo-cepa latigo lengua llamarada llave-giro luna megacuerno mordida niebla ola onda-certera onda-ignea pajaro-osado pantalla picotazo pinza placaje plancha polvo potenciar proteccion proyectil psicorrayo pulso puya rayo relampago roca-afilada rugido seda solar somnifero sustituto susto tajo taladro telequinesis teletransporte terratemblor terremoto tierra-viva tijera tornado trampa triataque trifulca trueno tumba-rocas vapor ventisca viento-hielo voltio vuelo zarpazo zumbido`. En kalabalık aileler: `disparo` (18 hamle), `estado` (9), `zarpazo` (8), `haz` (8), `potenciar` (7), `placaje` (7), `mordida` (6), `cono-etapa` (6). Her aile ayrı Vite chunk'ı (`earthquake-*.js`, `crabhammer-*.js` vb.) → aile başına özel görsel+mantık, veri odaklı değil **kod odaklı**.
- Temas türleri `H(contacto,plano)`: `proyectil` (yer altı hariç), `melee/emerger/chorro/haz` (yalnız yerde), `picado` (yalnız yerde), `terremoto` (yer altı ×2).
- Yakın dövüş örnek (`K`): `{carga:.2,giro:.3,golpeEn:.5,recupera:.3,alcance:50,alcanceExtra:12,arco:Math.PI*.8,quemarropa:14}`; zıplayan vuruş (`J`): `{salto:.3,cima:.45,altura:46,distanciaMinima:20,empuje:34,recuperaGolpe:.18,recuperaFallo:.42}`.

### 2.8 Pokémon değiştirme (TAB / 1-6)
- Yerel akış (`capas-Dfrz4drB.js`): ``v={retirada:.4,hueco:.5,salida:.25,cooldown:0,fueraDeCombate:0,empujeSalida:14,esperaTrasKo:5,toque:.2,amague:.15}`` → geri çekilme 0.4 s, boşluk 0.5 s, çıkış 0.25 s (toplam ~1.15 s), KO sonrası seçim için **5 s**; `arena-BaR33htr.js` ``ze={espera:2}`` → değişim sonrası 2 s bekleme (sunucuda `esperaCambio` saniye snapshot'ta gelir, `enCombate` bayrağıyla "dövüşteyken değişemez" mesajı: `r.enCombate(...)`).
- `cambiar {slot, caida?}`: düşüş noktası seçilebilir (`apuntaCaida`, TAB basılıyken nişan). Takım 6'ya kadar (`B.equipo:6`), rekabetçi lobide 3 titular (`lugaresDeCompetitivo:3`), kayıtlı takımlarda 3 üye (`miembrosGuardados:3`), hamle 4.

## 3. Maç akışı
- Oda fazları: ``sd=I([`esperando`,`jugando`,`terminada`])``; koltuklar ``od=F({lado:W,indice:R(0,1),ocupante:ad.nullable()})`` (taraf başına 2 koltuk → 2v2), bekleme sırası `espera` (≤4). Ev sahibi `empezar` yollar; `faltanListos` hatası herkes `listo` değilse.
- `inicio` mesajında `esperaCargaMs` (≤30 s yükleme bekleme) ve `tick` (başlangıç tick'i). Maç bitişi tek olay: ``{e:`fin`,tick,ganador:W.nullable(),motivo:I([`ko`,`abandono`,`tiempo`]),historia?}`` → **kazanma: takım tamamen KO; terk; süre dolumu** (`ganador:null` = berabere; `arenaRedPiezas`: ``titulo:r.fin.empate, texto:n===`tiempo`?r.fin.seTermino``). Süre sınırının sayısal değeri istemcide yok (sunucu); süre `duracionS=(fin.tick-inicio.tick)/tickHz` ile hesaplanır, telemetri üst sınırı 3600 s.
- Tur/round yok: tek sürekli maç. KO olunca `ko{slot,key}` olayı, oyuncu `esperaTrasKo:5` s içinde `cambiar` ile yeni Pokémon seçer (`debeElegir`); yerel modda `respawnDelay:2.5` (bot/ensayo için; çıkarım).
- Bağlantı kopunca: `aviso:desconectado` + `segundos` (geri sayım), `volvio`, ya da `bot` (bot devralır). Hesaplı rekabetçi maçta sonuç `historiaVerificada {pelea, fin:{ganador,motivo,anulada?,noVerificada?}}` ile sunucudan doğrulanır (`pf=I([pelea,plazo,registro,base])` ret nedenleri).
- `resumenDeFin-CWtuCrAf.js` aslında **hikâye modu (Gimnasio/Liga) verisi + bitiş özeti**: 29 eğitmen (``Ru=I(`camper.hiker.brock.swimmer.picnicker.misty.sailor.rocker.ltsurge.beauty.lass.erika.juggler.tamer.koga.psychic.channeler.sabrina.supernerd.burglar.blaine.rocketgrunt.teamrocket.giovanni.lorelei.bruno.agatha.lance.azul`)``), 13 etap (`etapas:13`), eğitmen başına `{mapa, etapa, habilidad(1..6, ör. brock 1.2), personalidad, equipo:[{especie,nivel,movimientos}], firmas}`; metinler: `"Los 29 combates seguidos, de Brock a Blue. Perder vuelve a Brock."`, `"Tus Pokémon pelean ${O.topeMenos} niveles debajo del tope de cada rival."`, `"Entre combate y combate no se recupera nada."`, kısıt modları `"Roster de 3"`, `"Sin evolucionar"`, `"Todo el roster comparte un tipo."` (7 mod: `modos:7`).
- Bitiş ödülü şeması ``id=F({caramelos,oro,boletos,medalla:N(),primeraVictoria:N(),llegoAlLider:N(),sinPago:I([`abandono`,`tope`,`base`]).nullable(),cinta:R(1,J.modos)})`` → **XP yok**; ödül = şeker (caramelo, seviye atlatır), altın (oro), bilet (boleto), rozet (medalla), kurdele (cinta). Günlük ödeme tavanı `pagadosPorDia:1e3`; "LA RUTA YA NO PAGA HOY · VUELVE A LAS 21 H". Elo/rating/MMR **yok** (kelime geçmiyor).

## 4. Yapay zekâ / botlar (`perfilDeIa-BDC3jR__.js`, `entrenadores-DjPr1NE5.js`)
- Lobi botu seviyeleri `facil/normal/dificil` → temel profiller (`qf`):
  - `facil: {reaccion:.7, esquiva:.1, errorPunteria:14 (derece), tiroSinBlanco:.15, cadencia:1.8, duda:.1, dudaSegundos:.6, eligeMejor:.45, movimiento:"directo", quieto:.2, quietoSegundos:1, leeTipos:!1, apuntar:.6, anticipa:.15}`
  - `normal: {reaccion:.45, esquiva:.35, reservaEsquiva:.1, saleDeAreas:.1, pesaTipos:.35, errorPunteria:6, tiroSinBlanco:.1, cadencia:1.8, eligeMejor:.7, movimiento:"mantiene", cambios:[vidaBaja,desventaja], leeTipos:!0, apuntar:.5, anticipa:.22}`
  - `dificil: {reaccion:.2, esquiva:1, reservaEsquiva:.15, saleDeAreas:.33, pesaTipos:.7, errorPunteria:0, tiroSinBlanco:0, cadencia:1, eligeMejor:1, movimiento:"kitea", dashOut:!0, escapa:!0, descansa:!0, cambios:[estado,vidaBaja,desventaja,amenaza], apuntar:.3, anticipa:.3, frenoHielo:.9, huyePorBaldosa:!0}`
  Parametre anlamları (çıkarım): `reaccion` tepki s, `errorPunteria` nişan hatası (derece, `ep()` döndürür), `cadencia` atış aralığı s, `eligeMejor` en iyi hamleyi seçme olasılığı, `anticipa` hedef öngörü, `kitea` (kite), `apuntar` nişan süresi.
- Hikâye eğitmenleri: `habilidad` 1..6 sürekli; `T1..T6` kademeleri ``{ritmo:[normal,dificil,0.3→1], reaccion:.4→.2, errorPunteria:5→0, lectura:.4→1, areas:0→.33, tipos:.05→.7, cambios:[]→[estado,vidaBaja,desventaja,amenaza,reserva], movimiento:directo→mantiene→kitea}``; `ruidoReaccion=.3`; kesirli habilidad iki kademe arasında lineer harmanlanır (`f(e)`); `personalidad` (`balanceado`, `defensivo`, …) ve `combos` eklenir.

## 5. İlerleme ve hesaplar
- Kimlik: Supabase (`https://tskanonzmrbtzmzgwysd.supabase.co`) yalnızca **OAuth oturumu** için: ``signInWithOAuth({provider:e,options:{redirectTo:…}})``, sağlayıcı literal'leri `google` ve `discord`; `signOut({scope:"local"})`. Supabase tablo/RPC çağrısı **yok** (`.from(`/`.rpc(` geçmiyor); JWT `hola.token`/`renovar {token}` ile oyun sunucusuna gider, veri sunucuda.
- Hesapsız oyun mümkün ("Hace falta una cuenta para el GIMNASIO" → hikâye hesap ister). `elegirApodo` (16 kr, günde bir: `cambioDeApodoEn:R(0,86400)`), `borrarCuenta {confirmar:"BORRAR"}`.
- Arkadaş sistemi: `agregarAmigo {codigo|apodo}`, `responderAmistad`, `quitarAmigo`, `bloquear/desbloquear`, `invitar {codigo}` (60 s geçerli), `presencia {codigo, estado}`; sınırlar `amigos:100, entrantes:50, salientes:20, bloqueados:100`. Arkadaş kodu 8 karakter `ABCD-EFGH` biçimi.
- Koleksiyon/hikâye sabitleri ``J={coleccion:100,slot:254,roster:6,titulares:3,starters:3,equipos:6,nombreDeEquipo:24,etapas:13,entrenadores:29,niveles:100,recurso:1e6,pagadosPorDia:1e3,rutas:255,modos:7}``; market ``q={objeto:255,…,caramelosPorPedido:10}``; mesajlar `comprarCaramelo`, `comprarBoleto`, `comprar`, `equipar` (eşya), `baya` (berry), `usarPiedra` (evrim taşı: "Piedra Fuego/Agua/Trueno/Hoja/Lunar"), `volverShiny`, `historiaSubir {slot, niveles, evolucionar?}` (şekerle seviye), `historiaMovimientos` (4 hamle), `historiaLegendario`, `misiones`/`reclamar` (görevler), `safari`. Seviye tavanı "TOPE NV", "EVOLUCIONES INTERMEDIAS".
- Kayıtlı takımlar: 6 takım × 3 üye (`guardarEquipo {n,slot,equipo:{nombre,miembros:[{dex,movimientos≤4}]}}`), `favoritosEquipos`, `importarEquipos`.
- Eşleştirme: sıra/kuyruk yok (`matchmaking`, `emparejar` geçmiyor); yalnız oda kodu (6 harf) ve davet. `combate: competitivo|libre` yalnız kural seti (rekabetçi: 3 Pokémon `lugaresDeCompetitivo:3`; çıkarım).
- Destek bağlantıları: `https://cafecito.app/pokerivals` (es), `https://ko-fi.com/pokerivals`; kart gösterim kuralı ``$={victoriasMinimas:3,diasEntreTarjetas:2,…}``.

## 6. Öğretici (`ftue`, `index-CzWeQhpq.js` i18n EN)
Adımlar sırayla (`ftue` nesnesindeki anahtar sırası): `moverse → atacar → rueda → calmar → cambiar → listo`.
- `moverse: {titulo:"MOVE", texto:"Walk with WASD or the arrow keys, jump with ${e} and dodge with ${t}: one dodge every ${n} s, save it for what hurts."}`
- `atacar: {titulo:"ATTACK", texto:"Pick a move with 1 to 4. Hold the right button to aim and release it to throw.", hecho:"THAT'S IT! NOW IT FIGHTS FOR REAL"}`
- `rueda: {titulo:"THE WHEEL", texto:"The mouse wheel also switches moves. Spin it to pick another.", hecho:"NICE! NOW THROW IT"}`
- `calmar: {titulo:"SWITCH POKÉMON", texto:"Now you're going to switch Pokémon."}`
- `cambiar: {titulo:"SWITCH POKÉMON", texto:"${e} and ${t} pick who to send out; a tap of ${n} sends them."}`
- `listo: {titulo:"DONE!", texto:"Finish the battle. Win or lose, you'll pick your first three Pokémon next."}`
- Etiketler: `botonDerecho:"RIGHT BUTTON", ruedaTecla:"WHEEL", caminar:"WALK", saltar:"JUMP", esquivar:"DODGE", pausa:"PAUSED"`.
- Dokunmatik sürüm: `"Rest your left thumb and drag it to walk. JUMP jumps and DODGE dodges…"`, `"Rest a finger on a move, drag it to aim and lift it to throw. A short tap throws it where you're facing."`, `"Tap a portrait at the top right to send it out, or drag it onto the arena to pick where it lands."`
- "3/4 · THE WHEEL" biçimindeki sayaç ve "RELEASE HERE TO CANCEL" metni paketten **bulunamadı** (çalışma anında birleştiriliyor olabilir; `cancelar:{x:500,y:92,w:240,h:44}` dokunmatik iptal bölgesi var).
- Rehber (`guia`): "PLAY ROUTE BATTLES UNTIL LV ${e}", "WITH THE GOLD, BUY CANDIES AT THE MARKET", "ROUTES NO LONGER PAY TODAY / BACK AT 21:00", "EQUIP YOUR BERRY", "CAN EVOLVE".

## 7. Kontroller
- Klavye (`roles-BdSjYcEJ.js` `Se`): ``{up:[KeyW,ArrowUp],down:[KeyS,ArrowDown],left:[KeyA,ArrowLeft],right:[KeyD,ArrowRight],switchPokemon:Tab,equipo:[Digit1..Digit6],dash:[ShiftLeft,ShiftRight],jump:Space,slots:[Digit1..Digit4],equipoAnterior:KeyQ,equipoSiguiente:KeyE,sleep:KeyZ,bot:KeyB,zoomIn:[Period,NumpadAdd],zoomOut:[Comma,NumpadSubtract]}`` → WASD/ok hareket, 1-4 hamle seçimi, **fare tekerleği** hamle değiştirir, **sağ tuş basılı nişan / bırakınca atış**, SHIFT dash, SPACE zıplama, TAB takım paneli (basılıyken düşüş noktası nişanı `apuntaCaida`), Q/E takım arkadaşı, Z dinlenme (`descansar`), B bot (yerel), `.`/`,` zoom (`Ce={levels:[1,2,3,4]}`).
- Dokunmatik (`seguimiento` `q`): ``{zonaJoystick:{x:0,y:130,w:480,h:410},radioJoystick:56,zonaMuerta:.18,movimientos:[{x:858,y:464,r:40},{x:748,y:484,r:35},{x:774,y:376,r:35},{x:874,y:344,r:35}],esquivar:{x:654,y:484,r:34},saltar:{x:670,y:398,r:30},cancelar:{x:500,y:92,w:240,h:44},radioDePunteria:120,umbralDeArrastre:14,retratos:{x:884,y:120,lado:64,paso:72}}`` (960×540 koordinat): sol yarı sanal joystick, sağ altta 4 hamle düğmesi (basılı tut-sürükle-bırak = nişan+atış), DODGE/JUMP düğmeleri, sağ üstte portreler (dokun ya da arenaya sürükle).
- Gamepad (`etapasDeHud`): varsayılan ``Ue={mov1:[LB],mov2:[RB],mov3:[LT],mov4:[RT],esquivar:[A],saltar:[ARRIBA],cancelar:[B],bancoIzq:[X,IZQUIERDA],bancoDer:[Y,DERECHA],sacar:[BACK],pausa:[START],confirmar:[A],volver:[B]}``, ayarlar `{zona:"media",invertirY:!1,vibracion:!0,sticksCruzados:!1}`; sol çubuk hareket, sağ çubuk nişan (eşik `apretar:.55/soltar:.35`, eğri üssü 1.5), yeniden eşleme arayüzü var.

## 8. Render / performans
- Mantıksal çözünürlük: ``g={width:960,height:540,pixel:2,horizonY:184,floorBottomY:516}`` (`roles`); CSS `.escenario{width:960px;height:540px;transform-origin:0 0}` ölçeklenir, `canvas{image-rendering:pixelated}`; `pixel:2` → 2× piksel sanatı.
- 2.5D perspektif: `v={nearScale:2,farScale:1}` (derinliğe göre sprite ölçeği), `horizonY:184`, saha z 0..480. Kamera `be={cameraLerp:.08}`, `xe={modo:"propio",margenPropio:120}` (kendi oyuncusunu takip, 120 px kenar payı; seyirci `camara:"ambos"`).
- PixiJS (v8, `autoDetectRenderer`): varsayılan tercih sırası ``Dr=[`webgl`,`webgpu`,`canvas`]`` (ensayo chunk'ındaki Pixi kodu); oyun kodunda `preference` literal'i yok → **WebGL önce** (çıkarım). Yazılım rasterizer tespiti: ``YC=/microsoft basic render driver|swiftshader|llvmpipe|softpipe|software rasterizer|mesa offscreen/i`` → `pokerivals.sinAceleracion` uyarısı.
- Ekran sarsıntısı: `this.ctx.fx.shake(amp,süre)` (ör. acid `shake(2.5,.12)`, aerial-ace `shake(9,.26)`), `fx.flash(renk,…)`.
- "capas" chunk'ı aslında Pokémon değiştirme fazlarını içeriyor (katman listesi değil); `zIndex` yalnız birkaç yerde elle verilir.
- Hamle efektleri aile başına ayrı chunk (`earthquake` 44 KB, `crabhammer` 27 KB …) → lazy import.

## 9. Telemetri
- Sentry/PostHog **yok**. Özel: `etapasDeHud` ``Jr=`poketournament.telemetria` `` localStorage anahtarı (`"0"` → kapalı), **DNT/GPC'ye uyar** (`globalPrivacyControl`, `doNotTrack`). Hedef: sunucu origin'inde `/telemetria` (`ti()`), `navigator.sendBeacon` yoksa `fetch POST text/plain keepalive no-cors credentials:omit`, **≤8192 bayt** (`r.size>8192?!1`). Oturum kimliği 8 rastgele bayt hex, `n` sayaç (≤10000).
- Yük (`seguimiento` `armar()`): ``{v:1,sesion,n,parcial,version,partida:{modo,nivel,formato(1..6),duracionS,resultado,motivo,lanzados:{fisico,especial,estado},cambios,koPropios,koRivales,mapa?,salida,etapaGuia,cargaMs,…jugada},cuadros:{h:[5 kova],pausas,peorMs,lentosPorEfectos,lentosTrasLanzar,texturas,programas,peores},equipo:{gpu,…,zoom},red:{pongs,pingMediana,pingP95,jitter,snapshots,perdidos,tarde,correcciones{directas,suaves,saltos,errorMaximo},retardo[3],calidad[3],reconexiones,reconexionMs[≤8],perdida,latencia:{golpeRecibido[6],golpeDado[6],retardo1}},oculta}``; `PerformanceObserver` `longtask` ve `resource`; `visibilitychange`→`oculta`, `pagehide`→`cierre` kısmi gönderim. Ping örnekleri ≤65535 ms, jitter ortalama |Δping|.
