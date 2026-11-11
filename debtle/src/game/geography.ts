export interface Point { lat:number; lon:number }
const rad = (d:number) => d*Math.PI/180;
export const EARTH_RADIUS_KM = 6371.0088;
export function distanceKm(from:Point,to:Point):number {
  const a=Math.sin(rad(to.lat-from.lat)/2)**2+Math.cos(rad(from.lat))*Math.cos(rad(to.lat))*Math.sin(rad(to.lon-from.lon)/2)**2;
  return 2*EARTH_RADIUS_KM*Math.atan2(Math.sqrt(Math.min(1,a)),Math.sqrt(Math.max(0,1-a)));
}
export function bearing(from:Point,to:Point):number|null {
  if(distanceKm(from,to)<1e-7)return null;
  const dl=rad(to.lon-from.lon),a=rad(from.lat),b=rad(to.lat);
  return (Math.atan2(Math.sin(dl)*Math.cos(b),Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(dl))*180/Math.PI+360)%360;
}
export function direction(deg:number|null) {
  const index=deg===null?0:Math.round(deg/45)%8;
  return {arrow:['↑','↗','→','↘','↓','↙','←','↖'][index],name:['North','Northeast','East','Southeast','South','Southwest','West','Northwest'][index]};
}
export function proximity(distance:number):number {
  return distance<=750?5:distance<=2000?4:distance<=5000?3:distance<=10000?2:1;
}
