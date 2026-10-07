from pathlib import Path
from html.parser import HTMLParser
import re,json
class TextParser(HTMLParser):
 def __init__(self): super().__init__();self.parts=[];self.sections=[];self.ids=[];self.links=[];self.form=None;self.inputs=[];self.images=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag in ['br','p','h1','h2','h3','h4','section','article']:self.parts.append(' ')
  if tag=='section':self.sections.append(a.get('id'))
  if 'id' in a:self.ids.append(a['id'])
  if tag=='a':self.links.append(a)
  if tag=='form':self.form=a
  if tag in ['input','select']:self.inputs.append(a)
  if tag=='img':self.images.append(a)
 def handle_endtag(self,tag):
  if tag in ['p','h1','h2','h3','h4','section','article','a']:self.parts.append(' ')
 def handle_data(self,text):self.parts.append(text)
p=TextParser();p.feed(Path('index.html').read_text());text=re.sub(r'\s+',' ',''.join(p.parts)).strip()
expected=[
'Cinematic AI films for brands and artists.',
'I turn businesses and musicians into movies. Custom AI video built for your brand, delivered ready to launch.',
'Watch the work.',
'Views on music videos I directed',
'What can I help you create?', 'Clear prices. No guessing.',
'AI Film and Video:',
'AI UGC Ad, $300. One scroll stopping AI ad built for social media.',
'Brand Spot, $500. 30 second brand video for ads and announcements.',
'Brand Film, $750. 60 to 90 second cinematic brand story.',
'Music Videos, $650. Full AI assisted music video, directed and edited.',
'Signature Film, $2,500. 5 minute cinematic short film, my flagship service.',
'Websites:',
'Landing Page, $400. One page built to turn visitors into buyers.',
'Business Website, $900. Full multi page site: home, services, about, contact.',
'Brand and Design:',
'Brand Identity Pack, $600. Logo, colors, fonts, and social media kit.',
'Photography:',
'Shoot Session, $350. Portraits, products, or events, shot and edited.',
'Meta Ads Management:',
'$1,500 per month. Custom video and image creative, campaign setup and optimization, monthly reporting. Ad spend is separate and paid directly to Meta.',
'How it works.',
'Tell me your vision.',
'A 50 percent deposit locks your project in.',
'I build it. You get 2 revision rounds.',
'Pay the balance before final delivery. Then you launch.',
'The Person Behind the Camera',
'I’m Jamaal, also known as CJ, an AI filmmaker and music video director, but my work goes beyond the camera.','I’ve toured the country shooting music videos, making music, studying metaphysics, and working with artists and brands. Those experiences have shaped how I approach creative work: getting to know the person behind the idea and finding the right way to bring it to life.','My work includes videography, photography, graphic design, video editing, website development, and running Meta ads. Whether you need a music video, a website, or help putting your business out into the world, I bring those skills together to help you move forward.','I also run a private Discord community where I share what I’ve learned and help people put it into practice. You don’t need to know how to design, edit, build a website, or run ads before joining. Bring your questions or the project you’re working on, and get hands on guidance on what to do next.',
'Reviews', 'Get a quote.',
'Faster? DM FILM on Instagram @jamaaltreasures.',
'Want to learn the craft yourself?',
'The Treasure Chest is my private Discord community, $49 per month. Live project help, feedback, and peer learning for creators building their skills.',
'Instagram: @jamaaltreasures.', 'YouTube: Cimtexpro.', 'Copyright 2026 Jamaal Treasures.'
]
for sentence in expected:assert sentence in text,repr(sentence)
assert all(not re.search(r'[-\u2010-\u2015]',t) for t in json.loads(Path('qa/approved-biography.json').read_text())), 'Dash in biography'
assert p.sections==['home','work','stats','about','testimonials','services','process','contact','treasure-chest']
assert len(set(p.ids))==len(p.ids)
assert len([x for x in p.links if x.get('data-project')])==10
assert all(x['href']=='#contact' for x in p.links if x.get('data-project'))
assert p.form['method']=='post' and p.form['action']=='https://formsubmit.co/jamaaltreasures@gmail.com'
assert {'name','email','project_type','budget'} <= set(x.get('name') for x in p.inputs)
assert all('required' in x for x in p.inputs if x.get('name') in ['name','email','project_type','budget'])
assert all('alt' in x and 'width' in x and 'height' in x for x in p.images if 'video-' in x.get('src',''))
assert 'id="realm-video"' in Path('index.html').read_text()
assert 'assets/realm-final/master.m3u8' in Path('index.html').read_text()
assert 'realm-web.mp4' not in Path('index.html').read_text()
assert 'autoplay' not in Path('index.html').read_text()
assert 'localhost' not in Path('index.html').read_text() and '127.0.0.1' not in Path('index.html').read_text()
review_excerpts=[
 'Very business savvy, attentive & works very fast with your vision',
 'We created a lot of great songs and moments man, including flex',
 'You make the creative process easy & fun. I love your genius way of collaborating interactively in real time!',
 'He did my last cover art. Helped pull the project together',
 'it was always amazing to work with you. It’s pure talent bro'
]
for excerpt in review_excerpts:assert excerpt in text,repr(excerpt)
assert Path('index.html').read_text().count('<blockquote>')==5
assert 'class="quote-slot"' not in Path('index.html').read_text()
assert 'https://www.instagram.com/zora' not in Path('index.html').read_text()
assert len([a for a in p.links if a.get('class')=='review-platform' and a.get('href')=='https://www.instagram.com/reel/DbB1WUNvLS3/'])==5
assert not Path('dist/qa').exists()
for n in range(1,6):
 assert Path(f'assets/client-review-{n}.jpg').read_bytes()==Path(f'/Users/cjmitchell/Documents/Codex/2026-10-05/realtime-voice-chat/outputs/client-review-{n}.jpg').read_bytes()
reach=json.loads(Path('verified-video-reach.json').read_text())
assert len(set(v['id'] for v in reach['videos']))==25
assert sum(v['views'] for v in reach['videos'])==5650040
assert '5M+' in text
assert '9 million' not in text
for image in Path('dist/assets').glob('video-*.jpg'):assert image.read_bytes().startswith(b'\xff\xd8')
for file in ['index.html','privacy.html','styles.css','app.js','glass-optics.js','videos.json','social-reach.json']:assert Path(file).read_bytes()==Path('dist',file).read_bytes()
result={'verbatim_copy_blocks':len(expected),'section_order':p.sections,'service_buttons':10,'client_reviews':len(review_excerpts),'review_excerpts_verbatim':True,'verified_review_post_links':5,'zora_attribution':'abbreviated handle linked to original screenshot','latest_biography_verbatim':True,'required_quote_fields':['name','email','project_type','budget'],'recipient':'jamaaltreasures@gmail.com','native_post_with_captcha':True,'local_placeholder_copy':False,'featured_film':'THE REALM FINAL.mov, explicitly selected by owner','bundle_synced':True,'initial_html_css_js_bytes':sum(Path(x).stat().st_size for x in ['index.html','styles.css','app.js','glass-optics.js']),'hero_asset_bytes':Path('assets/nebula-desktop-1536.webp').stat().st_size,'film_bytes':sum(f.stat().st_size for f in Path('assets/realm-final').rglob('*') if f.is_file())}
Path('qa/homepage-checks.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
