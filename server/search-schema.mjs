const origin = 'https://jamaaltreasures.com';
const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

export const businessSchema = {
  '@context': 'https://schema.org', '@type': 'LocalBusiness',
  '@id': origin + '/#business', name: 'Jamaal Treasures', url: origin + '/',
  description: 'Creative direction, music videos, cinematic AI films, websites, branding, design and event coverage.',
  areaServed: { '@type': 'State', name: 'Florida' },
  telephone: '+19412949274', email: 'jamaaltreasures@gmail.com',
  image: origin + '/assets/jamaal-portrait-900.webp',
  contactPoint: { '@type': 'ContactPoint', contactType: 'project inquiries', url: origin + '/contact' }
};

// Use the published date and the feed's explicit year. Do not invent a time,
// venue address, price, availability or organizer when the feed omits it.
export function eventStartDate(event) {
  const match = String(event.date).toUpperCase().match(new RegExp('(' + months.join('|') + ')\\s+(\\d{1,2})\\b'));
  if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(event.endDate || '')) return null;
  const year = event.endDate.slice(0,4);
  const value = `${year}-${String(months.indexOf(match[1])+1).padStart(2,'0')}-${match[2].padStart(2,'0')}`;
  return new Date(value).toISOString().slice(0,10) === value ? value : null;
}

export function eventSchema(event) {
  const startDate = eventStartDate(event);
  if (!startDate || !event.title || !event.venue) return null;
  return { '@context': 'https://schema.org', '@type': 'Event',
    name: event.title, startDate, endDate: event.endDate,
    location: { '@type': 'Place', name: event.venue },
    image: new URL(event.image, origin).href,
    url: event.detailsUrl, sameAs: event.flyerUrl
  };
}

export const schemaTag = schema => `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`;
