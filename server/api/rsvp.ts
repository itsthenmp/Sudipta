import type { VercelRequest,VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
import { createHash } from 'node:crypto';
const schema=z.object({name:z.string().trim().min(2).max(100),attendance:z.enum(['yes','no']),guests:z.number().int().min(1).max(10),events:z.array(z.enum(['wedding'])).max(1),dietary:z.string().max(500),message:z.string().max(1000),website:z.string().max(0)}).refine(v=>v.attendance==='no'||v.events.length>0);
export default async function handler(req:VercelRequest,res:VercelResponse){
 const origin=req.headers.origin;const allowed=process.env.ALLOWED_ORIGIN;
 if(origin&&origin===allowed){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');}
 if(req.method==='OPTIONS')return res.status(origin===allowed?204:403).end();
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!allowed||origin!==allowed)return res.status(403).json({error:'Origin not allowed'});
 if(!process.env.DATABASE_URL||!process.env.RATE_LIMIT_SECRET)return res.status(503).json({error:'RSVP service not configured'});
 const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Please check your response'});
 try{const sql=neon(process.env.DATABASE_URL);const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();const key=createHash('sha256').update(process.env.RATE_LIMIT_SECRET+ip).digest('hex');
 // Atomic fixed-window rate limit, shared across serverless instances.
 const limit=await sql`INSERT INTO rsvp_rate_limits (key, window_start, attempts) VALUES (${key}, NOW(), 1) ON CONFLICT (key) DO UPDATE SET window_start = CASE WHEN rsvp_rate_limits.window_start < NOW() - INTERVAL '1 hour' THEN NOW() ELSE rsvp_rate_limits.window_start END, attempts = CASE WHEN rsvp_rate_limits.window_start < NOW() - INTERVAL '1 hour' THEN 1 ELSE rsvp_rate_limits.attempts + 1 END RETURNING attempts`;
 if(Number(limit[0].attempts)>5)return res.status(429).json({error:'Please try again later'});
 const v=parsed.data;await sql`INSERT INTO rsvps (name, attendance, guests, events, dietary, message) VALUES (${v.name}, ${v.attendance}, ${v.guests}, ${JSON.stringify(v.events)}::jsonb, ${v.dietary}, ${v.message})`;return res.status(201).json({ok:true});
 }catch{return res.status(500).json({error:'Unable to save your response'})}
}
