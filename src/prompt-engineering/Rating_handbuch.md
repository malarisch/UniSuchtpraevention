Rating Handbuch v0.1 - 28.07.25
# Rating Guidelines - Punchlines statt gepanschte Lines
# Vorwort
Dieses Dokument soll eine kurze Einführung geben, wie Songtexte anhand der vorgegebenen Skalen zu bewerten sind.
Das manuelle Bewerten von Songs dient dazu A) die Validiät der Skalen durch Krippendorffs $\alpha$ zu berechnen und verifizieren,
sowie der Anpassungen der Gewichtungen zur Berechnung des Gesamtscores.

Die Vorgegebenen Songtexte sind zufällige Auswahlen aus der Datenbank aus vier Kategorien: keine, wenige, gemäßigt und viele Erwähnungen von Substanzen.

# Rating-Dimensionen
Zuerst wird eine Liste aller genannten Substanzen im Songtext angelegt. Zur Hilfestellung findet sich später in diesem Dokument ein Glossar.
Danach wird das folgende Schema für jede gefundene Substanz abgearbeitet. Die Skalen beinhalten nur Ganzzahlen, also -2, -1, 0, +1 und +2. Ein höherer Score bedeutet, dass der Substanz die Substanz positiv konnotiert wird ("Ist richtig cool!"), ein negativer Score eine negative/schlechte Darstellung ("Voll widerlich").  Zur Differenzierung finden sich nach der Tabelle Beispiele. 

## Überblick
| Dimension               | Skala          | Definition                                                                                                                                                                   |
|-------------------------|----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Wording                 | -2 ... +2      | Tonalität der direkten Benennung der Substanz                                                                                                                                |
| Perspective             | -2 ... +2; n/a | Wie wird die Substanz durch die formale Erzählweise und Struktur dargestellt? <br>**n/a wenn nicht zutreffend, also bspw. keine Erzählerperspektive existiert (selten!)**    |
| Context/Consequences    | -2 ... +2      | Gezeigte Folgen oder Auswirkungen auf Protagonist\*innen o. Erzähler\*innen und Umfeld                                                                                       |
| Glamorization           | -2 ... +2      | Ästhetisierung, "Luxus-Fame"                                                                                                                                                 |
| Harm Acknowledgement    | -2 ... 0       | Explizite Risiko-Reflexion<br>**Achtung: Wird in der Auswertung negativ gewichtet!**<br>Hier gibt es keine positiven Werte, da diese ene narrative Verharmlosung wären.      |
| _Intern: Mentions_      | Ganzzahl >0    | Absolute Zahl der Nennungen einer Substanz. Muss nicht manuell gerated werden.                                                                                               |
| _Intern: Basisrelevant_ | Bool           | Interner Filter, ob ein Songtext in den Datensatz aufgenommen wird. Ist wahr, wenn >= 2 Mentions oder >1% Textanteil Substanznamen sind. Muss nicht manuell gewertet werden. |
#### Start-Gewichtung:
- Wording (p_w): 0.25
- Perspective (p_p): 0.20
- Context/Consequences (p_cc): 0.20
- Glamorization (p_g): 0.10
- Harm Acknowledgement: (p_h): 0.25
- Mentions (p_m): 0.05
#### Start-Formel:
$(\sum_{i=1}^{s} {w}_{i}\cdot{p}_w+{p}_{i}\cdot{p}_p+{cc}_{i}\cdot{p}_{cc}+{g}_{i}\cdot{p}_g+{h}_{i}\cdot{p}_h+{m}_{i}\cdot  \frac{1}{1+{e}^{-{p}_{m}}})/s$  
mit i = Substanz und s = Gesamtzahl der Substanzen


## Rating-Anker: Beispiele aus Deutschrap-Songtexten für die Rating-Anker

### Wording

- **-2:** *„...ist es Gift in meinen Venen.“* – *Gift* - Bizzy Montana  
  *(Der Begriff „Gift“ wird hier direkt für die Droge verwendet – äußerst negative Konnotation.)*

- **-1:** *„Drogen machen euch dumm.“* – *Intelligenter Absturz* - Herzog  
  *(Allgemeine Abwertung der Droge, beschreibt sie als etwas, das einen dumm macht.)*

- **0:** *„Roll’ einen Jibbit oder zwei.“* – *Y-3* - Lucio101 & Nizi19  
  *(Neutrale Erwähnung – “Jibbit” steht umgangssprachlich für einen Joint, ohne Wertung des Konsums.)*

- **+1:** *„Nimm einen Zug und du merkst, es schmeckt lecker.“* – *Y-3* - Lucio101 & Nizi19  
  *(Positive Beschreibung des Geschmacks – stellt den Drogenkonsum als genussvoll dar.)*

- **+2:** *„Hajar macht fett, schmeckt süß wie ein Donut.“* – *Y-3* - Lucio101 & Nizi19  
  *(Sehr positive/blumige Wortwahl – vergleicht den Geschmack der Substanz mit einem süßen Donut.)*

---

###  Perspective

- **-2:** *„Ich hasse diesen Stoff, du weißt, dass ich dich gewarnt hab’.“* – *Jolina* - Samra  
  *(Erzähler spricht in *Ich*-Form und verurteilt den Konsum scharf – kritische Haltung gegenüber der Droge.)*

- **-1:** *„Bitte lass die Finger von dem Zeug.“* – *Jolina* - Samra  
  *(Erzähler (Ich-Perspektive) lehnt den Konsum ab und warnt eine andere Person ausdrücklich davor.)*

- **0:** *„Ich weiß, dass sie ein ernsthaftes Drogenproblem hat.“* – *Jolina* - Samra  
  *(Erzähler beschreibt sachlich-neutral den Zustand einer Person – keine positive oder negative Wertung, nur Feststellung.)*

- **+1:** *„Nehm’ einen Zug und werde high.“* – *Y-3* - Lucio101 & Nizi19  
  *(Ich-Perspektive, der Erzähler konsumiert selbst und berichtet genießerisch über die Wirkung (“werde high”) – positive Haltung zum Konsum.)*

- **+2:** *„Willst du mit mir Drogen nehmen?“* – *Willst du* - Alligatoah  
  *(Der Erzähler fordert aktiv zum Mitmachen auf – lädt die angesprochene Person direkt zum Drogenkonsum ein.  
  ****Beachte: In diesem Song schwingt natürlich viel Ironie mit - das Positive Rating hier würde sich mit dem -2 Rating von "wir gehen zusammen den Bach runter" wieder kontextualisieren und einordnen.*)****

---

### Context / Consequences

- **-2:** *„Immer nur so viel, dass keiner stirbt…“* – *Kokain* - Bonez MC, RAF Camora & Gzuz  
  *(Deutet sehr ernste Konsequenzen an – der Dealer dosiert *gerade* so, dass niemand an der Droge stirbt, was die Lebensgefahr betont.)*

- **-1:** *„Touri kackt ab wegen Koks mit Milchpulver.“* – *Y-3* - Lucio101 & Nizi19  
  *(Beschreibt eine negative Auswirkung – ein „Tourist“ bricht zusammen, weil das Kokain gestreckt (mit Milchpulver vermischt) war.)*

- **0:** *„Auf’m Sofa, trinke Lean, keine Cola.“* – *Y-3* - Lucio101 & Nizi19  
  *(Es werden keine Folgen erwähnt – nur eine Situationsbeschreibung: er sitzt auf dem Sofa und trinkt Lean (Codein-Mischgetränk) statt Cola.)*

- **+1:** *„Hotpants werden feucht, komm und kauf was von mir.“* – *Kokain* - Bonez MC, RAF Camora & Gzuz  
  *(Positive/erwünschte Konsequenz für den Erzähler – Partystimmung, alle feiern ihn: Frauen reagieren erotisiert („Hotpants werden feucht“), was als Erfolg durch den Drogenkonsum/-verkauf dargestellt wird.)*

- **+2:** *„Die Taschen voll mit Geld wegen Kokain.“* – *Kokain* - Bonez MC, RAF Camora & Gzuz  
  *(Sehr positive Konsequenz aus Sicht des Erzählers – prahlt damit, durch Kokain (Verkauf) die Taschen voller Geld zu haben.)*

---

### Glamourization

- **-2:** *„Es riecht wie Terpentin…“* – *Jolina* - Samra  
  *(Unästhetische Darstellung – der Geruch wird mit Terpentin (Lösungsmittel) verglichen, die Droge wirkt schmutzig und chemisch.)*

- **-1:** *„…das Pulver ist gestreckt.“* – *Jolina* - Samra  
  *(Beschreibt minderwertige Qualität – „gestreckt“ impliziert Verunreinigung/Verdünnung der Droge, also nichts Glamouröses an dem „Zeug“.)*

- **0:** *„Wir rauchen nur pure Joints.“* – *Mit den Jungs* - LX (187 Strassenbande)  
  *(Keine besondere Ästhetisierung – es wird zwar Konsum erwähnt, aber ohne luxuriöses Drumherum, einfach als normaler Konsumakt.)*

- **+1:** *„Lila Haze, ich zünd’ den Vapo im Flieger an.“* – *Mit den Jungs* - LX (187 Strassenbande)  
  *(Leichte Glamourisierung – *Purple Haze* (hochwertiges Weed) und Vaporizer an Bord eines Fliegers; vermittelt einen gewissen Luxus-Lifestyle beim Konsum.)*

- **+2:** *„Flieg’ auf die Bahamas wegen Kokain.“* – *Kokain* - Bonez MC, RAF Camora & Gzuz  
  *(Hochglanz-Lifestyle durch Drogen dargestellt – vom Kokainhandel/-konsum finanziert werden Luxusreisen auf die Bahamas unternommen, was maximale Glamourisierung bedeutet.)*

### Harm Acknowledgement

- **-2:** *„Eines Nachts ging er auf die Autobahn [... Ein] Tag später durft' ich in der Zeitung lesen, was geschah: Neunzehnjähriger ließ sich von 'nem Zehntonner überfahren“* – *Zur Erinnerung* - Ferris MC  
  *(Sehr starke, explizite Darstellung schwerster Folgen – Schwerste Depressionen, Suizid)*

- **-1:** *„Touri kackt ab wegen Koks mit Milchpulver.“* – *Y-3* - Lucio101 & Nizi19  
  *(Schwere körperliche Reaktion – ein Tourist bricht zusammen, weil das Kokain gestreckt ist.)*

- **0:** *„So vel Codein hat mich bis jetzt nicht umgebracht, aber bleibe ich morgen früh liegen, dann hab' ich das beste draus gemacht“* – *Risiko* von Bonez MC & RAF Camora  
  *(Risiken sind anerkannt, Tod wird thematisiert, aber gleichgültig oder ohne Wertung – neutral hingenommen (Risiko wird cool dargestellt, das wird aber im Narratv bewertet!))*


# Beispielhafte Liste von Substanzen und Szenebegriffen
_Du weißt, dass die Recherche gut war, wenn Google und ChatGPT dir nur noch Hilfetelefonnummern liefern. Alle Begriffe habe ich in der freien Wildbahn gefunden, so abgefuckt sie auch sein mögen._
- ### Stimulanzien
    - #### Amphetamin
        - Pep
        - Pepp
        - Peppe
        - Speed
        - Schneller Peter
        - Schnelles
        - Bambinos
        - Uppers
    - #### Methamphetamin
        - Crystal
        - Tina
        - Ice / ICE
        - Pervitin
        - Yaba
        - Shards
    - #### Kokain u. Crack
        - Koks
        - Coke
        - Schnee / Schneeweiß
        - Blow
        - White Girl
        - Perico
        - Mokki
        - C
        - Steine (Crack)
        - Bubble
        - Königsmischung (Koks + Speed)
    - #### Mephedron / 3-MMC u. a. Cathinone
        - Meow Meow
        - M-Cat
        - Drone
        - Bubble
    - #### MDPV / α-PVP
        - Monkey Dust
        - Flakka
        - Zombie
    - #### Methylphenidat
        - Rits
        - Kiddie-Coke
        - Smarties
        - Medikinet
        - Rita

- ### Empathogene u. Entactogene
    - #### MDMA
        - Ecstasy
        - Teile
        - E-Teile
        - XTC
        - Molly
        - Emma
        - E
        - Disco-Biscuits
        - Eckies
        - Kristalle
        - Pills
        - Dinger
        - Pappen
    - #### MDA / MDEA
        - Sassafras
        - Love-Pills
    - #### 2C-B
        - Nexus
        - Toonies
        - Pink Playboy
        - TucTuc

- ### Sedativa u. Depressiva
    - #### Benzodiazepine
        - Xanax
        - Alprazolam
        - Xan / Xans
        - Xannies
        - Bars / Footballs / Z-Bars
        - Blues
        - Tafil
        - Flunnis
        - Ropies / Ropse
    - #### Designer-Benzos (Flualprazolam u. a.)
        - Flualp
        - Fluapex
        - Liquid Xan
    - #### GHB / GBL
        - Liquid Ecstasy
        - Liquid E
        - G
        - G-Juice
        - Georgia Home Boy
        - Fantasy
        - Soap
        - Seife

- ### Opioide
    - #### Heroin
        - H
        - Gear
        - Brown / Braun / Brown Sugar
        - Smack
        - Stoff
        - Shore
    - #### Fentanyl
        - Fenty
        - Apache
        - Dance Fever
        - China Town / China Girl
        - M30
        - Murder 8
        - Tango & Cash
        - Jackpot
    - #### Carfentanil
        - Drop Dead
        - C-Fent
        - Green Heckler
    - #### Nitazene-Derivate
        - Frankenstein-Pillen / -Pills
        - Frankies
        - ISO
    - #### Tilidin
        - Tillys
        - Tilis
        - Tili
        - T-Drops
        - Darby
        - Darby-Riegel
    - #### Codein & Codein-Hustensirup
        - Lean
        - Purple Drank
        - Sizzurp
        - Hustensaft
        - Dirty Sprite
        - Wok / Wock
        - Syrup / Drank / Barre
        - Texas Tea
        - Memphis Mud

- ### Halluzinogene
    - #### LSD
        - Acid
        - Pappe (Auch: MDMA)
        - Ticket
        - Zettel
        - Trips
        - Blotter
        - Lucy
        - Purple Wedges
        - Raketen
        - Mikros
        - Paper
        - Window-Pane
        - Sunshine
    - #### Psilocybin-Pilze
        - Zauberpilze
        - Psilos
        - Magic Mushrooms
        - Shrooms
    - #### DMT / 5-MeO-DMT
        - Dimitri
        - Businessman’s Trip
        - Yopo
    - #### NBOMe-Serie
        - N-Bombs
        - Smiles

- ### Dissoziativa
    - #### Ketamin
        - Keta
        - Käthe
        - Tante Käthe
        - Special K
        - Vitamin K
        - KitKat
        - Strawberry K
    - #### 2-FDCK / 3-MeO-PCP
        - F-Ket
        - Legal-K
        - MXPr
    - #### PCP
        - Peace
        - Zauberdunst
    - #### DXM
        - Robo-Trip
        - Skittles
        - Triple-C

- ### Cannabinoide
    - #### THC-haltiger Cannabis
        - Weed
        - Gras
        - Marihuana
        - Hasch
        - Ganja
        - Bubatz
        - Ott
        - Jibbit
        - Dope
        - Grünes
        - Hecke
        - Grüner Türke
        - Haze
        - Skunk
        - Popcorn
        - Brokkoli
        - Joint-Synonyme: Dübel, Tüte, Lunte, Sportzigarette
        - Blunt
    - #### Haschisch
        - Piece
        - Platte
        - Schwarzer Afghane
        - Zero-Zero
    - #### Synthetische Cannabinoide
        - Spice / Räuchermischung
        - K2
        - Kraut
        - Fake Weed
        - Bonzai
    - #### HHC / THCP
        - H-Carts
        - Hex
        - Semi-Legal-High

- ### Inhalanzien & Sonstiges
    - #### Lachgas (N₂O)
        - Nos / NOS
        - Balloons / Ballons
        - Funny-Gas / Funny Gas
        - Lachs
    - #### Poppers (Amyl-/Iso-Nitrit)
        - Rush
        - Jungle Juice
        - TNT
    - #### Lösungsmittel (Butan u. a.)
        - Sniff
        - Glue
        - Gas  
