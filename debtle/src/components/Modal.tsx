import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
export default function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const el=dialog.current;if(!el)return;el.showModal();return()=>el.close();},[]);
  return <dialog ref={dialog} className="modal" aria-labelledby="modal-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}><div className="modal-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog" autoFocus><X size={21}/></button></div><div className="modal-content">{children}</div></dialog>;
}
