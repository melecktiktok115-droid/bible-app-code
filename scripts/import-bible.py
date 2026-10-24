"""Import the public-domain David Martin 1744 edition. No runtime external Bible API."""
import json, urllib.request, pathlib
url='https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/FreBDM1744.json'
names='Genèse|Exode|Lévitique|Nombres|Deutéronome|Josué|Juges|Ruth|1 Samuel|2 Samuel|1 Rois|2 Rois|1 Chroniques|2 Chroniques|Esdras|Néhémie|Esther|Job|Psaumes|Proverbes|Ecclésiaste|Cantique des cantiques|Ésaïe|Jérémie|Lamentations|Ézéchiel|Daniel|Osée|Joël|Amos|Abdias|Jonas|Michée|Nahum|Habacuc|Sophonie|Aggée|Zacharie|Malachie|Matthieu|Marc|Luc|Jean|Actes|Romains|1 Corinthiens|2 Corinthiens|Galates|Éphésiens|Philippiens|Colossiens|1 Thessaloniciens|2 Thessaloniciens|1 Timothée|2 Timothée|Tite|Philémon|Hébreux|Jacques|1 Pierre|2 Pierre|1 Jean|2 Jean|3 Jean|Jude|Apocalypse'.split('|')
x=json.load(urllib.request.urlopen(url))
assert len(x['books'])==66
books=[{'name':names[i],'chapters':[[v['text'] for v in c['verses']] for c in b['chapters']]} for i,b in enumerate(x['books'])]
pathlib.Path('public/data').mkdir(parents=True,exist_ok=True)
pathlib.Path('public/data/bible.json').write_text(json.dumps(books,ensure_ascii=False,separators=(',',':')))
pathlib.Path('src/lib/books.ts').write_text('export const books = '+json.dumps([{'name':b['name'],'chapters':len(b['chapters'])} for b in books],ensure_ascii=False)+'\n')
