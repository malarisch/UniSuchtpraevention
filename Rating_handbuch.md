Rating Handbuch v0.2 - 28.07.25 - Beschreibung Überarbeitet
# Rating Guidelines - Punchlines statt gepanschte Lines
# Vorwort
Das Projekt *Punchlines statt gepanschte Lines* findet im Rahmen des Theorie- und Praxisprojekts *Suchtprävention* von Prof. Dr. Florian Rehbein und Bettina Beyer an der FH Münster statt.
Innerhalb des Projekts wird analysiert, ob es einen statistischen Zusammenhang zwischen Konsumverhalten/Attitüde von Jugendlichen zu verschiedenen psychotropen Substanzen und dem Vorkommen/Darstellung in der gehörten Musik, insbes. Deutschrap, gibt.
Die Ergebnisse der Studie könnten einen guten Anhaltspunkt bieten, inwieweit aktuelle Suchtpräventionsprogramme der Lebensrealität von Jugendlichen entsprechen, wo noch nachjustiert werden muss oder um blinde Flecke offenzulegen.

Das Projekt wird in drei Phasen durchgeführt. In der ersten Phase wird eine gewisse Menge an Deutschrap-Songtexten systematisch analysiert und auf einer Skala bewertet.
___Um die entwickelte Skala zu validieren und kalibrieren wird diese Befragung durchgeführt.___
Sobald die Skala akzeptable Reliabilität und Validität erreicht wird eine große Menge von Songtexten automatisch durch LLMs (Large Language Models, bspw. ChatGPT, Gemini, Copilot) analysiert und bewertet.
Am Ende liegt für jeden Songtext eine Liste vor von erwähnten Substanzen, sowie ein errechneter Gesamtscore "General Drug Attitude" vor. Ein erster Aufschlag für die Formel zur Berechnung, sowie die Gewichtungen der einzelnen Dimensionen, liegt in diesem Dokument vor - sobald einige
manuelle Ratings erstellt wurden können diese nachjustiert und kalibriert werden.

Im zweiten Schritt werden Jugendliche, speziell Jugendzentrumsbesucher\*innen, mit Fragebögen befragt, welche Künstler\*innen sie hören, sowie
allgemein ihre Einstellung zu Drogen und verschiedenen psychotropen Substanzen.

Im dritten Schritt werden diese Daten systematisch kombiniert und statistisch analysiert, um vermutete Korrelationen zu be- oder widerlegen. Je nach Aussagekräftigkeit der erhobenen Daten können Daten geclustert werden, um verschiedene Zielgruppen weiter zu differenzieren.

---
### Aufgabe
Dieses Dokument soll eine kurze Einführung geben, wie Songtexte anhand der vorgegebenen Skalen zu bewerten sind.
Das manuelle Bewerten von Songs dient dazu
 - A) die [Inter-Rater Reliabilität](https://en.wikipedia.org/wiki/Krippendorff%27s_alpha) der Items durch Krippendorff's $\alpha$ zu berechnen
 - B) die [kongenerische Reliabilität](https://de.wikipedia.org/wiki/Kongenerische_Reliabilit%C3%A4t) ${\rho}_{C}$ zu berechnen
 - C) der Anpassungen der Gewichtungen zur Berechnung des Gesamtscores.

Die vorgegebenen Songtexte sind zufällige Auswahlen aus der Datenbank aus vier Kategorien: keine, wenige, gemäßigt und viele Erwähnungen von Substanzen.

Die Antworten können in diesem Formular eingetragen werden:
https://docs.google.com/forms/d/e/1FAIpQLSfMeYjm18AzGeNoZ3fPJSP_tNp2sLef0r2fgpp9uWFeK1ujuw/viewform?usp=preview  
--- 
#### Beispiel: Rückmeldung für einen Songtext
Alkohol:
 - Wording: +1
 - Perspective: +1
 - Context/Consequences: -1
 - Glamorization: +2
 - Harm Acknowledgement: 0  

Cannabis:
- Wording: -1
- Perspective: -1
- Context/Consequences: +1
- Glamorization: +2
- Harm Acknowledgement: -1

---

# Rating-Dimensionen
Zuerst wird eine Liste aller genannten Substanzen im Songtext angelegt. Zur Hilfestellung findet sich später in diesem Dokument ein Glossar.
Danach wird das folgende Schema für jede gefundene Substanz abgearbeitet. Die Skalen beinhalten nur Ganzzahlen, also -2, -1, 0, +1 und +2. Ein höherer Score bedeutet, dass der Substanz die Substanz positiv konnotiert wird ("Ist richtig cool!"), ein negativer Score eine negative/schlechte Darstellung ("Voll widerlich"). Zur Differenzierung finden sich nach der Tabelle Beispiele. 

## Überblick
| Dimension               | Skala          | Definition                                                                                                                                                                   |
|-------------------------|----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Wording                 | -2 ... +2      | Tonalität der direkten Benennung der Substanz                                                                                                                                |
| Perspective             | -2 ... +2; n/a | Wie wird die Substanz durch die formale Erzählweise und Struktur dargestellt? <br>**n/a wenn nicht zutreffend, also bspw. keine Erzählerperspektive existiert (selten!)**    |
| Context/Consequences    | -2 ... +2      | Gezeigte Folgen oder Auswirkungen auf Protagonist\*innen o. Erzähler\*innen und Umfeld                                                                                       |
| Glamorization           | -2 ... +2      | Ästhetisierung, "Luxus-Fame"                                                                                                                                                 |
| Harm Acknowledgement    | -2 ... 0       | Explizite Risiko-Reflexion<br>Hier gibt es keine positiven Werte, da diese eine narrative Verharmlosung wären (wird schon in Perspective abgefertigt!).                      |
| _Intern: Mentions_      | Ganzzahl >0    | __Wird nicht manuell gerated!__ <br>Absolute Zahl der Nennungen einer Substanz.                                                                                              |
| _Intern: Basisrelevant_ | Bool           | __Wird nicht manuell gerated!__ <br>Interner Filter, ob ein Songtext in den Datensatz aufgenommen wird. Ist wahr, wenn >= 2 Mentions oder >1% Textanteil Substanznamen sind. |

## Rating-Anker: Beispiele aus Deutschrap-Songtexten für die Rating-Anker

### Wording

- **-2:** *„... ist es Gift in meinen Venen.“* – *Gift* - Bizzy Montana  
  *(Der Begriff „Gift“ wird hier direkt für die Droge verwendet – äußerst negative Konnotation.)*

- **-1:** *„Drogen machen euch dumm.“* – *Intelligenter Absturz* - Herzog  
  *(Allgemeine Abwertung der Droge, beschreibt sie als etwas, das einen dumm macht.)*

- **0:** *„Roll’ einen Jibbit oder zwei.“* – *Y-3* - Lucio101 & Nizi19  
  *(Neutrale Erwähnung – „Jibbit“ steht umgangssprachlich für einen Joint, ohne Wertung des Konsums.)*

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
  *(Ich-Perspektive, der Erzähler konsumiert selbst und berichtet genießerisch über die Wirkung („werde high“) – positive Haltung zum Konsum.)*

- **+2:** *„Willst du mit mir Drogen nehmen?“* – *Willst du* - Alligatoah  
  *(Der Erzähler fordert aktiv zum Mitmachen auf – lädt die angesprochene Person direkt zum Drogenkonsum ein.  
  ****Beachte: In diesem Song schwingt natürlich viel Ironie mit - das Positive Rating hier würde sich mit dem -2 Rating von "wir gehen zusammen den Bach runter" wieder kontextualisieren und einordnen.*)****

---

### Context / Consequences

- **-2:** *„Immer nur so viel, dass keiner stirbt …“* – *Kokain* - Bonez MC, RAF Camora & Gzuz  
  *(Deutet sehr ernste Konsequenzen an – der Dealer dosiert *gerade* so, dass niemand an der Droge stirbt, was die Lebensgefahr betont.)*

- **-1:** *„Touri kackt ab wegen Koks mit Milchpulver.“* – *Y-3* - Lucio101 & Nizi19  
  *(Beschreibt eine negative Auswirkung – ein „Tourist“ bricht zusammen, weil das Kokain gestreckt (mit Milchpulver vermischt) war.)*

- **0:** *„Auf’m Sofa, trinke Lean, keine Cola.“* – *Y-3* - Lucio101 & Nizi19  
  *(Es werden keine Folgen erwähnt – nur eine Situationsbeschreibung: Er sitzt auf dem Sofa und trinkt Lean (Codein-Mischgetränk) statt Cola.)*

- **+1:** *„Hotpants werden feucht, komm und kauf was von mir.“* – *Kokain* - Bonez MC, RAF Camora & Gzuz  
  *(Positive/erwünschte Konsequenz für den Erzähler – Partystimmung, alle feiern ihn: Frauen reagieren erotisiert („Hotpants werden feucht“), was als Erfolg durch den Drogenkonsum/-verkauf dargestellt wird.)*

- **+2:** *„Die Taschen voll mit Geld wegen Kokain.“* – *Kokain* - Bonez MC, RAF Camora & Gzuz  
  *(Sehr positive Konsequenz aus Sicht des Erzählers – prahlt damit, durch Kokain (Verkauf) die Taschen voller Geld zu haben.)*

---

### Glamorization

- **-2:** *„Es riecht wie Terpentin …“* – *Jolina* - Samra  
  *(Unästhetische Darstellung – der Geruch wird mit Terpentin (Lösungsmittel) verglichen, die Droge wirkt schmutzig und chemisch.)*

- **-1:** *„… das Pulver ist gestreckt.“* – *Jolina* - Samra  
  *(Beschreibt minderwertige Qualität – „gestreckt“ impliziert Verunreinigung/Verdünnung der Droge, also nichts Glamouröses an dem „Zeug“.)*

- **0:** *„Wir rauchen nur pure Joints.“* – *Mit den Jungs* - LX (187 Strassenbande)  
  *(Keine besondere Ästhetisierung – es wird zwar Konsum erwähnt, aber ohne luxuriöses Drumherum, einfach als normaler Konsumakt.)*

- **+1:** *„Lila Haze, ich zünd’ den Vapo im Flieger an.“* – *Mit den Jungs* - LX (187 Strassenbande)  
  *(Leichte Glamourisierung – *Purple Haze* (hochwertiges Weed) und Vaporizer an Bord eines Fliegers; vermittelt einen gewissen Luxus-Lifestyle beim Konsum.)*

- **+2:** *„Flieg’ auf die Bahamas wegen Kokain.“* – *Kokain* - Bonez MC, RAF Camora & Gzuz  
  *(Hochglanz-Lifestyle durch Drogen dargestellt – vom Kokainhandel/-konsum finanziert werden Luxusreisen auf die Bahamas unternommen, was maximale Glamourisierung bedeutet.)*

### Harm Acknowledgement

- **-2:** *„Eines Nachts ging er auf die Autobahn [... Ein] Tag später durft' ich in der Zeitung lesen, was geschah: Neunzehnjähriger ließ sich von 'nem Zehntonner überfahren“* – *Zur Erinnerung* - Ferris MC  
  *(Sehr starke, explizite Darstellung schwerster Folgen – schwerste Depressionen, Suizid)*

- **-1:** *„Touri kackt ab wegen Koks mit Milchpulver.“* – *Y-3* - Lucio101 & Nizi19  
  *(Schwere körperliche Reaktion – ein Tourist bricht zusammen, weil das Kokain gestreckt ist.)*

- **0:** *„So viel Codein hat mich bis jetzt nicht umgebracht, aber bleibe ich morgen früh liegen, dann hab' ich das Beste draus gemacht“* – *Risiko* von Bonez MC & RAF Camora  
  *(Risiken sind anerkannt, Tod wird thematisiert, aber gleichgültig oder ohne Wertung – neutral hingenommen (Risiko wird cool dargestellt, das wird aber im Narratv bewertet!))*


# Beispielhafte Liste von Substanzen und Szenebegriffen
_Alle Begriffe sind in der freien Wildbahn gefunden worden, so rassistisch und misogyn sie auch sein mögen._
 - ### Stimulanzien
     - Ziehen
     - Sniffen
     - Schnupfen
     - Knallen
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
        - Schnee
        - Schneeweiß
        - Blow
        - White Girl
        - Perico
        - Mokki
        - C
        - Steine
        - Bubble
        - Königsmischung
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
     - Schmeißen
     - Werfen
     - Poppen
     - Schlucken
     - Fressen
     - Naschen
     - Dippen
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
        - Xan
        - Xans
        - Xannies
        - Bars
        - Z-Bars
        - Blues
        - Tafil
        - Flunnis
        - Ropies
        - Ropse
    - #### Designer-Benzos (Flualprazolam u. a.)
        - Flualp
        - Fluapex
        - Liquid Xan
    - #### GHB / GBL
        - Liquid Ecstasy
        - Liquid E
        - G
        - G-Juice
        - Georgia Homeboy
        - Fantasy
        - Soap
        - Seife

 - ### Opioide
     - Ballern
     - Drücken
     - Spritzen
     - Hauen
     - Boofen
    - #### Heroin
        - H
        - Gear
        - Brown
        - Brown Sugar
        - Smack
        - Stoff
        - Shore
    - #### Fentanyl
        - Fenty
        - Apache
        - Dance Fever
        - China Town
        - China Girl
        - M30
        - Murder 8
        - Tango & Cash
        - Jackpot
    - #### Carfentanil
        - Drop-Dead
        - C-Fent
        - Green Heckler
    - #### Nitazene-Derivate
        - Frankenstein-Pillen
        - Frankenstein-Pills
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
        - Wok
        - Wock
        - Syrup
        - Drank
        - Barre
        - Texas Tea
        - Memphis Mud

 - ### Halluzinogene
    - #### LSD
        - Acid
        - Pappe
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
     - Kiffen
     - Rauchen
     - Vapen
     - Dampfen
     - Drehen
     - Dabben
     - High
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
        - Dübel
        - Tüte
        - Lunte
        - Sportzigarette
        - Blunt
    - #### Haschisch
        - Piece
        - Platte
        - Schwarzer Afghane
        - Zero-Zero
    - #### Synthetische Cannabinoide
        - Spice
        - Räuchermischung
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
        - Nos
        - N-O-S
        - Balloons / Ballons
        - Funny Gas
        - Lachs
    - #### Poppers (Amyl-/Iso-Nitrit)
        - Rush
        - Jungle Juice
        - TNT
    - #### Lösungsmittel (Butan u. a.)
        - Sniff
        - Glue
        - Gas
 - ### Alkohol
     - Saufen
     - Trinken
    - #### Bier
        - Bier
        - Pils
        - Pilsener
        - Helles
        - Lager
        - Weizen
        - Weißbier
        - Hopfenkaltschale
        - Gerstensaft
        - Bierchen
        - Blondes
        - Kaltgetränk
        - Stiefel
        - Büchse
    - #### Wein
        - Wein
        - Vino
        - Rotwein
        - Weißwein
        - Rosé
        - Weinschorle
        - Schoppen
        - Rebensaft
        - Roten
        - Weißen
        - Traubensaft
    - #### Spirituosen
        - Wodka
        - Vodka
        - Voddi
        - Korn
        - Gin
        - Rum
        - Whisky
        - Whiskey
        - Tequila
        - Likör
        - Jägermeister
        - Hennessy
        - Jacky
        - Captain
        - Bacardi
        - Schnaps
        - Kurzer
        - Shot
        - Harter
        - Klopfer
        - Feigling
    - #### Alkopops & Mischgetränke
        - Smirnoff Ice
        - Bacardi Breezer
        - Hooch
        - U-Boot
        - Limo-Mix
        - Radler
        - Mixery
        - Alster
        - Diesel
        - V+ Curuba
        - RTD
        - Mischi
        - Mische
# Appendix: Gewichtungen und Gesamtscore
Das Folgende muss auf keinen Fall berechnet werden! Dient nur zur internen Dokumentation!
## Start-Gewichtung:
| Dimension            | Gewichtung                                                                                                                                                                                                                                                                                                                                                                                                                     |
|----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Wording              | ${p}_{w} = 0.25$                                                                                                                                                                                                                                                                                                                                                                                                               |
| Perspective          | Unterschiedlich gewertet, da positive Werte größeren Impact haben als negative:<br>$${p}_{p}(x) = \begin{cases} \alpha \cdot x & \text{wenn } x \leq 0 \\ \beta \cdot e^{\gamma x}   & \text{wenn } x > 0 \end{cases}$$<br>$\alpha = 0.2$ (Lineares Gewicht negative Werte)<br>$\beta = 0.3$ (Basisgewicht positive Werte)<br>$\gamma = 0.5$ (Exponentieller Wachstumsfaktor positive Werte)<br>$x$ ist das abgegebene Rating. |
| Context/Consequences | ${p}_{c} = 0.20$                                                                                                                                                                                                                                                                                                                                                                                                               | 
| Glamorization        | ${p}_{g} = 0.15$                                                                                                                                                                                                                                                                                                                                                                                                               |
| Harm Acknowledgement | ${p}_{h} = 0.30$                                                                                                                                                                                                                                                                                                                                                                                                               |
| Mentions             | ${p}_{m} = 0.05$                                                                                                                                                                                                                                                                                                                                                                                                               |
## Start-Formel:
Diese Formel soll einen Anhaltspunkt geben, wie der Gesamtscore für jeden Song berechnet wird.  
*Sie muss nicht von Rater\*innen berechnet werden!*
$$\textnormal{Overall =}
\frac{\sum_{i = 1}^{s}
{w}_{i} {p}_{w} +
{p}_{i} {p}_{p} +
{c}_{i} {p}_{c} +
{g}_{i} {p}_{g} +
{h}_{i} {p}_h +
{m}_{i} (\frac{1}{1+{e}^{-{p}_{m}}})}{s}$$  
mit $i$ = Substanz und $s$ = Gesamtzahl der Substanzen im Song