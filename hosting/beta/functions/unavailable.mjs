import { withPublicApiGuard } from '../../../netlify/functions/lib/response.mjs';
export default async function unavailable(request){return withPublicApiGuard(request,()=>Response.json({error:'unavailable-in-read-only-beta',message:'This feature is disabled in the beta.'},{status:503,headers:{'Cache-Control':'no-store'}}));}
