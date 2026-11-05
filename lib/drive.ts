/** Parse public Google Drive file and folder sharing links. */
export function parseDriveLink(link: string): {kind:'file'|'folder';id:string}|null {
 try { const url=new URL(link); if(url.hostname!=='drive.google.com')return null;
  const folder=url.pathname.match(/\/folders\/([\w-]+)/); if(folder)return {kind:'folder',id:folder[1]};
  const file=url.pathname.match(/\/file\/d\/([\w-]+)/); const id=file?.[1] || (url.pathname==='/open' ? url.searchParams.get('id') : null);
  return id&&/^[\w-]+$/.test(id)?{kind:'file',id}:null;
 } catch { return null; }
}
export function drivePhotoUrl(id:string){return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`}
