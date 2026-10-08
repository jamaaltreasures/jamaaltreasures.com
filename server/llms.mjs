import offers from '../offers.json' with {type:'json'};

export function llmsText(){return `# Jamaal Treasures

> Jamaal Treasures is a creative director, filmmaker, designer and recording artist serving Florida. This website presents creative work, services and prices, a Journal, and a curated Florida event guide.

## Main sections

* [Homepage](https://jamaaltreasures.com/): Introduction and featured work.
* [Services and prices](https://jamaaltreasures.com/prices): Current service descriptions, deliverables, USD prices and booking options.
* [Work](https://jamaaltreasures.com/work): Directed music videos and creative projects.
* [Blog and Journal](https://jamaaltreasures.com/blog): Creative news and practical guides with sources.
* [Events](https://jamaaltreasures.com/events): Curated Florida concerts, festivals, nightlife, business and cultural events. Confirm current details with the linked organizer or ticket source.
* [Biography](https://jamaaltreasures.com/bio): Professional background and credits.
* [Music](https://jamaaltreasures.com/music): Music released as Oracle Gemini.
* [Reviews](https://jamaaltreasures.com/reviews): Client feedback.
* [Contact and booking](https://jamaaltreasures.com/contact): Discuss a project, availability and scope.

## Listed service prices

Prices are in USD. Confirm the service scope and availability before booking. The service page and linked Square checkout are the current sources for purchasing details.

${offers.services.map(s=>`* ${s.name}: $${s.price}${s.recurring?' per month':''}. ${s.summary}`).join('\n')}

## Contact

Business name: Jamaal Treasures.
Service area: Florida.
Email: jamaaltreasures@gmail.com
Phone: +1 941 294 9274
Booking: https://jamaaltreasures.com/contact
Event coverage inquiry: https://jamaaltreasures.com/contact?project=event-coverage
Media invitation: https://jamaaltreasures.com/contact?project=media-invite
Instagram: https://www.instagram.com/jamaaltreasures/

## Editorial notes

Event listings are curated from external sources. Jamaal Treasures is not necessarily the organizer. Ticket availability, schedules and prices can change. Blog articles identify sources and AI assistance. Do not infer guaranteed search rankings, client results or event availability.

Sitemap: https://jamaaltreasures.com/sitemap.xml
Privacy: https://jamaaltreasures.com/privacy
`;}
