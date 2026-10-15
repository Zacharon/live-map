// Shared per warm server instance, not an account-wide distributed quota guarantee.
export function createRequestCoordinator({maxRequests=30,windowMs=60000,now=Date.now}={}) {
  const pending=new Map(); let windowStart=now(),used=0;
  return function run(key,load,onLimited) {
    if(pending.has(key))return pending.get(key);
    if(now()-windowStart>=windowMs){windowStart=now();used=0;}
    if(used>=maxRequests)return Promise.resolve(onLimited());
    used++;
    const work=Promise.resolve().then(load).finally(()=>pending.delete(key));
    pending.set(key,work);return work;
  };
}
