import { test } from 'node:test';import assert from 'node:assert/strict';
import { ics,googleUrl,ready } from '../lib/calendar';import { wedding } from '../lib/config';import { rsvpSchema } from '../lib/validation';
const event={id:'wedding' as const,name:'Wedding, celebration',date:'2027-12-12',start:'10:00',end:'12:00',venue:'A; B',mapUrl:'',description:'Love\nand joy'};
test('calendar escapes and includes selected alarms',()=>{const value=ics([event],'Asia/Kolkata','both');assert.match(value,/SUMMARY:Wedding\\, celebration/);assert.match(value,/LOCATION:A\\; B/);assert.match(value,/TRIGGER:-P1D/);assert.match(value,/TRIGGER:-PT2H/);assert.match(value,/DTSTART;TZID=Asia\/Kolkata:20271212T100000/)});
test('Google URL and incomplete event',()=>{assert.equal(ready({...event,start:''}),false);assert.equal(new URL(googleUrl(event,'Asia/Kolkata')).searchParams.get('ctz'),'Asia/Kolkata')});
test('configuration contains only the wedding',()=>assert.deepEqual(wedding.events.map(e=>e.id),['wedding']));
test('RSVP validation accepts valid input and rejects spam and missing event',()=>{const v={name:'A Guest',attendance:'yes',guests:2,events:['wedding'],dietary:'',message:'',website:''};assert.equal(rsvpSchema.safeParse(v).success,true);assert.equal(rsvpSchema.safeParse({...v,website:'spam'}).success,false);assert.equal(rsvpSchema.safeParse({...v,events:[]}).success,false)});

test('events without an end time remain usable without inventing one',()=>{const e={...event,end:''};assert.equal(ready(e),true);assert.doesNotMatch(ics([e],'Asia/Kolkata','day'),/DTEND/);assert.match(new URL(googleUrl(e,'Asia/Kolkata')).searchParams.get('dates')!,/20271212T100000\/20271212T100000/)});

import { formatTime } from '../lib/time';
test('guest times use 12-hour notation',()=>{assert.equal(formatTime('17:00'),'5:00 PM');assert.equal(formatTime('18:00'),'6:00 PM');assert.equal(formatTime('00:05'),'12:05 AM');assert.equal(formatTime('12:30'),'12:30 PM')});
test('couple quiz contains the four supplied answers',()=>assert.deepEqual(wedding.quiz.map(q=>q.answer),['groom','bride','bride','both']));
