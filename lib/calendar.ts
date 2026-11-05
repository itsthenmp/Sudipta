import type { WeddingEvent } from './config';
export type Reminder = 'day'|'hours'|'both';
export function ready(e: WeddingEvent) { return /^\d{4}-\d\d-\d\d$/.test(e.date) && /^\d\d:\d\d$/.test(e.start) && (!e.end || (/^\d\d:\d\d$/.test(e.end) && e.end > e.start)); }
const escapeIcs = (s:string) => s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const stamp = (date:string,time:string) => `${date.replaceAll('-','')}T${time.replace(':','')}00`;
export function ics(events: WeddingEvent[], timezone:string, reminder:Reminder) {
 const alarms = (reminder==='both'?['-P1D','-PT2H']:[reminder==='day'?'-P1D':'-PT2H']).flatMap(t=>['BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Wedding celebration reminder',`TRIGGER:${t}`,'END:VALARM']);
 const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Wedding Invitation//EN','CALSCALE:GREGORIAN',...events.filter(ready).flatMap(e=>['BEGIN:VEVENT',`UID:${e.id}-${e.date}@wedding-invitation`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;TZID=${timezone}:${stamp(e.date,e.start)}`,...(e.end ? [`DTEND;TZID=${timezone}:${stamp(e.date,e.end || e.start)}`] : []),`SUMMARY:${escapeIcs(e.name)}`,`LOCATION:${escapeIcs(e.venue)}`,`DESCRIPTION:${escapeIcs(e.description)}`,...alarms,'END:VEVENT']),'END:VCALENDAR'];
 // Fold at 75 UTF-8 octets, preserving Unicode characters.
 return lines.map(line=>{let out='', bytes=0; for(const c of line){const n=new TextEncoder().encode(c).length;if(bytes+n>75){out+='\r\n ';bytes=1;}out+=c;bytes+=n;}return out;}).join('\r\n')+'\r\n';
}
export function googleUrl(e:WeddingEvent, timezone:string) { const p=new URLSearchParams({action:'TEMPLATE',text:e.name,dates:`${stamp(e.date,e.start)}/${stamp(e.date,e.end || e.start)}`,ctz:timezone,details:e.description,location:e.venue}); return `https://calendar.google.com/calendar/render?${p}`; }
