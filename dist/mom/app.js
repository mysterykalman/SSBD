(function(){
"use strict";
const script=window.PamCopy,adapter=window.MomModeAdapter;
const byId=id=>document.getElementById(id);const text=(id,value)=>{byId(id).textContent=value??"";};const hide=(id,value)=>{byId(id).hidden=Boolean(value);};
const STORAGE_KEY="ssbd:mom-progress:v1";
const RANKS=[
 {min:0,name:"Look at You"},
 {min:100,name:"Okay, Sweetie"},
 {min:250,name:"Youâ€™re Getting Good at This"},
 {min:500,name:"Alright, Now Youâ€™re Showing Off"},
 {min:1000,name:"Iâ€™m Very Proud. Also Annoyed."},
 {min:2000,name:"This Is Getting Personal, Honey"},
 {min:5000,name:"Fine. Youâ€™re the Favourite"}
];
function cleanNumber(v){const n=Number(v);return Number.isFinite(n)&&n>=0?Math.floor(n):0;}
function loadProgress(){
 try{const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")||{};return{totalPoints:cleanNumber(raw.totalPoints),games:cleanNumber(raw.games),streak:cleanNumber(raw.streak),bestStreak:cleanNumber(raw.bestStreak),bestRound:cleanNumber(raw.bestRound),updatedAt:String(raw.updatedAt||"")};}
 catch{return{totalPoints:0,games:0,streak:0,bestStreak:0,bestRound:0,updatedAt:""};}
}
let profile=loadProgress(),stage="intro",secretWord="";
function saveProgress(){profile.updatedAt=new Date().toISOString();try{localStorage.setItem(STORAGE_KEY,JSON.stringify(profile));window.dispatchEvent(new CustomEvent("ssbd:progress-changed"));}catch{}}
function rankState(points){let current=RANKS[0],next=null;for(let i=0;i<RANKS.length;i++){if(points>=RANKS[i].min)current=¶»§q«^