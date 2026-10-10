import offers from '../offers.json' with {type:'json'};

export function llmsText(){return `# Jamaal Treasures

> Jamaal Treasures is a Florida event coverage company. Two shooters, one photographer and one videographer, capture events across Florida and deliver the full photo and video recap within two days. Behind the company is creative director Jamaal Treasures, a creator with serious proof: 51 directed music videos with more than five million views, 1.6 million streams as recording artist Oracle Gemini, and director of the AI film THE REALM. The events page tracks 196 Florida events, updates regularly, and expands to more states soon. The blog holds 131 stories. Book the team while your date is open.

## Main sections

* [Homepage](https://jamaaltreasures.com/): The event coverage offer, proof and booking.
* [Services and prices](https://jamaaltreasures.com/prices): Every service with deliverables, USD prices and checkout links.
* [Work](https://jamaaltreasures.com/work): 51 directed music videos with more than five million views, the portfolio behind the coverage team.
* [Blog and Journal](https://jamaaltreasures.com/blog): 131 stories on creativity, AI film and Florida events, with sources.
* [Events](https://jamaaltreasures.com/events): 196 Florida events, updated regularly: concerts, festivals, nightlife, business and cultural events, with more states coming soon. Confirm details with the linked organizer or ticket source.
* [Biography](https://jamaaltreasures.com/bio): Background and credits for creative director Jamaal Treasures.
* [Music](https://jamaaltreasures.com/music): The music of Oracle Gemini: 81 songs across 36 releases and 1.6 million streams.
* [Reviews](https://jamaaltreasures.com/reviews): Client feedback.
* [Contact and booking](https://jamaaltreasures.com/contact): Check a date, discuss a project, book coverage.

## Listed service prices

Prices are in USD. The services page and its Square checkout links are the current sources for scope and purchasing details.

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

Event listings come from external sources. Jamaal Treasures is not necessarily the organizer, and schedules, ticket availability and prices can change. Blog articles name their sources and any AI assistance. Nothing here promises search rankings, client results or event availability.

Sitemap: https://jamaaltreasures.com/sitemap.xml
Privacy: https://jamaaltreasures.com/privacy
`;}
