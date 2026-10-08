export function canonicalRedirect(request){
 const url=new URL(request.url);
 if(url.hostname!=='www.jamaaltreasures.com'&&!(url.hostname==='jamaaltreasures.com'&&url.protocol==='http:'))return null;
 url.protocol='https:';url.hostname='jamaaltreasures.com';url.port='';
 return Response.redirect(url.href,308);
}
