# SAPAN

Tek parmakla oynanan sonsuz tırmanış oyunu. Geri çek, bırak, yukarı tırman.

**Oyna:** [bozukartr.github.io/hopup](https://bozukartr.github.io/hopup)

Tek dosya: `index.html`. Derleme adımı yok, bağımlılık yok — dosyayı bir tarayıcıda
açman yeterli. GitHub Pages'e olduğu gibi yayınlanır.

## Nasıl oynanır

Topun üstüne bas, sapanı geri çek ve bırak. Ne kadar çok çekersen o kadar güçlü
fırlar. Yörünge önizlemesi ilk çarpışmada kesilir — nereye ineceğini gösterir.

| Zemin | Davranış |
|---|---|
| Sade | Tutunur, hızını yarıya indirir |
| Zıplak | Düşüş hızını geri verir, seni yukarı fırlatır |
| Yapışkan | Anında durdurur, kayma yok |
| Kaygan | Neredeyse hiç sürtünme yok, kaydırır |
| Çürük | Bastıktan yarım saniye sonra kırılır |
| Diken | Değersen top patlar |

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
- `prefers-reduced-motion` sarsıntı ve parçacıkları kısar.

## Testler

`tests/game.test.mjs` oyunu Playwright ile gerçekten oynayıp fizik, üretim,
durum geçişleri ve kayıt davranışını doğrular.

```
npm i -D playwright && npx playwright install chromium
node tests/game.test.mjs
```
