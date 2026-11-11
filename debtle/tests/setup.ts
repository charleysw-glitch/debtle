import '@testing-library/jest-dom/vitest';
import { afterEach,vi } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(()=>{cleanup();localStorage.clear();});
Object.defineProperty(window,'matchMedia',{writable:true,value:(query:string)=>({matches:false,media:query,onchange:null,addEventListener:vi.fn(),removeEventListener:vi.fn()})});
class MockResizeObserver { observe(){} unobserve(){} disconnect(){} }
vi.stubGlobal('ResizeObserver',MockResizeObserver);
HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
