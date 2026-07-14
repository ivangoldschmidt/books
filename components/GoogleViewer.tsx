'use client';
import { useEffect, useRef, useState } from 'react';
declare global { interface Window { google?: any; __googleBooksLoaded?: boolean } }
export function GoogleViewer({volumeId}:{volumeId:string}){const ref=useRef<HTMLDivElement>(null);const[failed,setFailed]=useState(false);
 useEffect(()=>{let alive=true;function render(){if(!alive||!ref.current||!window.google?.books)return;const viewer=new window.google.books.DefaultViewer(ref.current);viewer.load(volumeId,()=>{},()=>setFailed(true))}if(window.google?.books)render();else{const existing=document.querySelector('script[data-google-books]');if(existing)existing.addEventListener('load',render,{once:true});else{const s=document.createElement('script');s.src='https://www.google.com/books/jsapi.js';s.dataset.googleBooks='1';s.onload=()=>{window.google.load('books','0',{callback:render})};document.head.appendChild(s)}}return()=>{alive=false}},[volumeId]);
 return failed?<div className="empty">A prévia incorporada não está disponível para este livro.</div>:<div ref={ref} className="viewer"/>}
