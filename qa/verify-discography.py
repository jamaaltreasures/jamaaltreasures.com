from pathlib import Path
from lxml import html
import json,re,hashlib
root=Path('.')
pages={'index.html':'home','work.html':'work','music.html':'music','reviews.html':'testimonials','prices.html':'services','stats.html':'stats','bio.html':'about','process.html':'process','community.html':'treasure-chest','contact.html':'contact'}
for file,active in pages.items():
 raw=(root/file).read_text();s=html.fromstring(raw)
 visible=s.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," app-page ") and not(@hidden)]')
 assert len(visible)==1 and visible[0].get('id')==active,(file,'visible pages')
 assert len(s.xpath('//*[@id]'))==len({x.get('id') for x in s.xpath('//*[@id]')}),(file,'duplicate IDs')
 assert len(s.xpath('//*[@data-video-id]'))==25
 assert s.xpath('//*[@id="work"]//h2')[0].text_content()=='Music Videos'
 assert 'Selected direction' not in s.text_content()
 assert 'Full AI assisted music video' not in raw
 assert 'Creative director and cinematic AI filmmaker for brands and musicians.' in s.text_content()
 assert re.search(r'[\-–—]',s.get_element_by_id('about').text_content()) is None
 assert s.xpath('//*[@id="stats"]//strong[text()="1.6M"]')
 assert 'Confirmed in DistroKid analytics' in s.text_content()
 assert '7,154' in s.text_content() and '5M+' in s.text_content()
 assert s.get_element_by_id('realm-video').get('data-stream')=='assets/realm-final/master.m3u8'
 assert s.xpath('//img[contains(@src,"jamaal-portrait")]')
 assert s.xpath('//*[@id="music-stop"]/..')[0].get('id')=='music-player'
 assert s.get_element_by_id('support-music').get('href')=='https://cash.app/$Jamaaltreasures'
 options={x.get('value') or x.text_content() for x in s.xpath('//*[@id="project-type"]/option')}
 for a in s.xpath('//a[@data-project]'):assert a.get('data-project') in options,(file,a.get('data-project'))
 offers=s.xpath('//*[@data-service-category]')
 assert offers[0].xpath('.//h3')[0].text_content()=='Music Videos'
 assert '$650' in offers[0].text_content() and '$650' in offers[1].text_content()
 assert offers[0].get('data-service-category')=='production'
 assert 'Filmed on location' in offers[0].text_content()
 assert s.get_element_by_id('quote-form').get('action')=='https://formsubmit.co/jamaaltreasures@gmail.com'
 assert s.xpath('//a[@href="https://whop.com/treasure-chest-bc09/the-treasure-chest-membership-76"]')
 for i in range(1,6):
  p=root/f'assets/client-review-{i}.jpg';old=root.parent/'rollback/before-discography-app/assets'/p.name
  if old.exists():assert hashlib.sha256(p.read_bytes()).digest()==hashlib.sha256(old.read_bytes()).digest()
 for a in s.xpath('//*[@src or @href or @poster]'):
  for attr in ['src','href','poster']:
   v=a.get(attr,'');local=v.split('?')[0].split('#')[0].lstrip('/')
   if local and ':' not in local:assert (root/local).exists(),(file,local)
tracks=json.loads((root/'music.json').read_text())['tracks'];assert len(tracks)==81
assert len({t['id'] for t in tracks})==81
assert len({t['cover'] for t in tracks})==36
assert len([t for t in tracks if t['title']=='TOOK A RISK'])==1
assert next(t for t in tracks if t['title']=='TOOK A RISK')['duration']>160
for t in tracks:assert (root/t['cover']).exists()
prices={x['name']:x['price'] for x in json.loads((root/'offers.json').read_text())['services']}
assert prices=={'Music Videos':650,'Event Coverage':650,'AI UGC Ad':300,'Brand Spot':500,'Brand Film':750,'Signature Film':2500,'Landing Page':400,'Business Website':900,'Brand Identity Pack':600,'Shoot Session':350,'Meta Ads Management':1500}
report={'pages':len(pages),'public_songs':len(tracks),'releases':36,'directed_videos':25,'services':len(prices),'result':'passed','form_submission':'Not sent; existing action and required fields retained','payments':'Cash App donation link provided by owner; Square catalog handled separately'}
(root/'qa/discography-content-checks.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
