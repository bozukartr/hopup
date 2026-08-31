# SAPAN

Tek parmakla oynanan sonsuz tırmanış oyunu. Geri çek, bırak, yukarı tırman.

**Oyna:** [bozukartr.github.io/hopup](https://bozukartr.github.io/hopup)

Tek dosya: `index.html`. Derleme adımı yok, bağımlılık yok — dosyayı bir tarayıcıda
açman yeterli. GitHub Pages'e olduğu gibi yayınlanır.

## Nasıl oynanır

Topun üstüne bas, sapanı geri çek ve bırak. Ne kadar çok çekersen o kadar güçlü
fırlar. Yörünge önizlemesi ilk çarpışmada kesilir — nereye ineceğini gösterir.

Üç zemin, üç ayrı fiil:

| Zemin | Davranış |
|---|---|
| Sade | Tutunur, hızını yarıya indirir — düşün ve nişan al |
| Zıplak | Düşüş hızını geri verir, seni yukarı fırlatır — momentum |
| Çürük | Bastıktan yarım saniye sonra kırılır — acele et |

Diken kırmızıdır; değersen top patlar.

## Güçlendirmeler

Havada asılı duran küreler. Toplamak için biraz sapman gerekir — bedava değil,
bir karar.

| Küre | Etki |
|---|---|
| **Kalkan** (mavi) | Bir ölümü emer. Düşmeden kurtarırsa ulaştığın en yüksek noktayı kaybedersin |
| **Roket** (sarı) | Sonraki atış %70 daha güçlü; alev kuyruğu bırakır |
| **Çift atış** (mor) | Havadayken bir kez daha nişan alıp fırlatabilirsin, üst üste 3'e kadar |

**Kamera seni sonsuza kadar beklemez.** En yüksek noktandan yarım ekrandan fazla
düşersen koşu biter. Alt kenarın kırmızılaşması son uyarıdır.

**Seri:** Art arda yükselerek indiğin her platform seriyi büyütür. Seri fırlatma
gücünü %18'e kadar artırır ve topun etrafında bir hale belirir. Aşağı inersen sıfırlanır.

**Kıl payı:** Dikene çarpmadan yakınından geçersen zaman kısa bir an yavaşlar.

## Bölgeler

Yükseldikçe dünya değişir — palet, mekanik ve tehdit birlikte artar. Zorluk
logaritmik bir eğriyle sürekli tırmanır, hiçbir yükseklikte düzleşmez.

`ZEMİN` → `BUZ` → `REÇİNE` → `RÜZGÂR` → `ÇÜRÜK KAT` → `FIRTINA`

İlk bölge tehlikesizdir: oyuncu önce sapanı öğrenir.

## Kontroller

- **Dokunma / fare:** çek ve bırak
- **Esc veya P:** duraklat
- Sekme arka plana geçince oyun kendiliğinden duraklar
- Rekor, en iyi seri ve ses tercihi tarayıcıda saklanır

## Teknik notlar

- Fizik sabit 420×900 birimlik **sanal dünyada** işler; ekran yalnızca ölçeklenir.
  Böylece zorluk telefondan tablete kadar aynı kalır, ekran boyutu değişimi
  koşuyu bozmaz.
- Sabit 60 Hz mantık adımı + kare arası enterpolasyon; 120 Hz ekranlarda akıcı,
  yavaş cihazlarda efekt bütçesi otomatik düşer.
- Ses WebAudio ile üretilir, dosya indirilmez.
- Ekran dışında kalan platformlar budanır; nesne sayısı sabit kalır.
- `prefers-reduced-motion` sarsıntı, parçacık, flaş ve vinyeti kapatır.

## Görsel katman

Bölgeye göre değişen iki hızlı parallax arka plan (nokta, buz kıymığı, reçine
damlası, rüzgâr yayı, çatlak, şimşek), topun arkasında konikleşen şerit iz,
yüksek hızda hız çizgileri, inişte platform ezilmesi, tam ekran renk flaşları,
seriyle koyulaşan vinyet, bölge geçişinde ekranı tarayan bant ve toplama
patlamaları. Hepsi kare hızına göre bütçelenir; ölçümde her bölgede 60 fps.

## Testler

`tests/game.test.mjs` oyunu Playwright ile gerçekten oynayıp fizik, üretim,
durum geçişleri ve kayıt davranışını doğrular.

```
npm i -D playwright && npx playwright install chromium
node tests/game.test.mjs
```
