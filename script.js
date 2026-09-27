(() => {
"use strict";

const CATEGORIES = {
  expense: ["Makanan","Belanja","Tagihan","Transportasi","Kesehatan","Pendidikan","Hiburan","Rumah","Lainnya"],
  income: ["Gaji","Bonus","Penjualan","Investasi","Hadiah","Lainnya"]
};
const STORAGE = "catatan-keuangan-pro-v1";
const today = new Date();

const defaultData = {
  accounts: [
    {id:"acc-pribadi", name:"Pribadi"},
    {id:"acc-bisnis", name:"Bisnis"}
  ],
  activeAccount:"acc-pribadi",
  transactions: [
    {id:"demo1",accountId:"acc-pribadi",date:"2026-09-02",type:"income",category:"Gaji",amount:5000000,note:"Gaji bulanan"},
    {id:"demo2",accountId:"acc-pribadi",date:"2026-09-03",type:"expense",category:"Belanja",amount:500000,note:"Belanja kebutuhan"},
    {id:"demo3",accountId:"acc-pribadi",date:"2026-09-05",type:"expense",category:"Makanan",amount:85000,note:"Makan bersama"},
    {id:"demo4",accountId:"acc-pribadi",date:"2026-09-10",type:"expense",category:"Transportasi",amount:120000,note:"Transportasi"},
    {id:"demo5",accountId:"acc-pribadi",date:"2026-09-12",type:"income",category:"Bonus",amount:750000,note:"Bonus proyek"},
    {id:"demo6",accountId:"acc-pribadi",date:"2026-09-15",type:"expense",category:"Tagihan",amount:350000,note:"Internet & listrik"}
  ],
  settings:{currency:"IDR",dark:false,motion:true,fontSize:"normal",confirmDelete:true}
};

let data = load();
let currentView = "dashboard";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function load(){
  try{
    const raw = localStorage.getItem(STORAGE);
    return raw ? {...defaultData,...JSON.parse(raw),settings:{...defaultData.settings,...JSON.parse(raw).settings}} : structuredClone(defaultData);
  }catch(e){ return structuredClone(defaultData); }
}
function save(){ localStorage.setItem(STORAGE, JSON.stringify(data)); }
function id(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function money(n){
  const cur=data.settings.currency;
  return new Intl.NumberFormat("id-ID",{style:"currency",currency:cur,maximumFractionDigits:0}).format(Number(n)||0);
}
function dateText(v){
  if(!v) return "-";
  return new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(new Date(v+"T00:00:00"));
}
function monthKey(v){return String(v).slice(0,7)}
function activeTx(){return data.transactions.filter(t=>t.accountId===data.activeAccount)}
function monthNow(){return today.toISOString().slice(0,7)}
function txForMonth(month=monthNow(), arr=activeTx()){return arr.filter(t=>monthKey(t.date)===month)}
function totals(arr){
  return arr.reduce((a,t)=>{a[t.type]+=Number(t.amount);return a},{income:0,expense:0});
}
function toast(msg){
  const el=$("#toast"); el.textContent=msg; el.classList.add("show");
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove("show"),2200);
}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

function init(){
  applySettings();
  bindNavigation();
  bindEvents();
  populateCategories();
  $("#txDate").value=today.toISOString().slice(0,10);
  $("#reportMonth").value=monthNow();
  renderAll();
}

function bindNavigation(){
  $$(".nav-item").forEach(btn=>btn.addEventListener("click",()=>{
    showView(btn.dataset.view);
    $("#sidebar").classList.remove("open");
  }));
  $$("[data-view-target]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.viewTarget)));
}
function showView(view){
  currentView=view;
  $$(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+view));
  $$(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===view));
  if(view==="reports") renderReports();
  if(view==="transactions") renderTransactions();
  if(view==="accounts") renderAccounts();
  if(view==="dashboard") renderDashboard();
}
function bindEvents(){
  $("#mobileMenuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#addTransactionBtn").addEventListener("click",()=>openTransaction());
  $("#addTransactionBtn2").addEventListener("click",()=>openTransaction());
  $("#addAccountBtn").addEventListener("click",()=>openModal("accountModal"));
  $("#settingsBtn").addEventListener("click",()=>showView("settings"));
  $("#searchBtn").addEventListener("click",()=>{showView("transactions");$("#transactionSearch").focus()});
  $("#accountMenuBtn").addEventListener("click",()=>showView("accounts"));
  $("#transactionForm").addEventListener("submit",saveTransaction);
  $("#accountForm").addEventListener("submit",createAccount);
  $("#txType").addEventListener("change",()=>populateTransactionCategories($("#txCategory").value));
  ["transactionSearch","typeFilter","categoryFilter","monthFilter"].forEach(id=>$("#"+id).addEventListener("input",renderTransactions));
  $("#clearFilters").addEventListener("click",()=>{$("#transactionSearch").value="";$("#typeFilter").value="all";$("#categoryFilter").value="all";$("#monthFilter").value="";renderTransactions()});
  $("#reportMonth").addEventListener("change",renderReports);
  $("#reportCategory").addEventListener("change",renderReports);
  $("#applyReport").addEventListener("click",renderReports);
  $("#chartPeriod").addEventListener("change",renderDashboard);
  $("#backupBtn").addEventListener("click",backup);
  $("#csvBtn").addEventListener("click",downloadCSV);
  $("#restoreInput").addEventListener("change",restore);
  $("#resetDataBtn").addEventListener("click",resetData);
  $("#darkModeToggle").addEventListener("change",e=>{data.settings.dark=e.target.checked;save();applySettings()});
  $("#motionToggle").addEventListener("change",e=>{data.settings.motion=e.target.checked;save();applySettings()});
  $("#fontSizeSelect").addEventListener("change",e=>{data.settings.fontSize=e.target.value;save();applySettings()});
  $("#currencySelect").addEventListener("change",e=>{data.settings.currency=e.target.value;save();renderAll()});
  $("#confirmDeleteToggle").addEventListener("change",e=>{data.settings.confirmDelete=e.target.checked;save()});
  $$("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
  $$(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("open")}));
  window.addEventListener("resize",()=>{if(currentView==="dashboard")drawChart()});
}

function applySettings(){
  document.body.classList.toggle("dark",data.settings.dark);
  document.body.classList.toggle("large-text",data.settings.fontSize==="large");
  document.documentElement.style.setProperty("--motion",data.settings.motion?"1":"0");
  if($("#darkModeToggle"))$("#darkModeToggle").checked=data.settings.dark;
  if($("#motionToggle"))$("#motionToggle").checked=data.settings.motion;
  if($("#fontSizeSelect"))$("#fontSizeSelect").value=data.settings.fontSize;
  if($("#currencySelect"))$("#currencySelect").value=data.settings.currency;
  if($("#confirmDeleteToggle"))$("#confirmDeleteToggle").checked=data.settings.confirmDelete;
}

function renderAll(){
  $("#activeAccountName").textContent=data.accounts.find(a=>a.id===data.activeAccount)?.name||"Pribadi";
  renderDashboard(); renderTransactions(); renderReports(); renderAccounts(); populateCategories();
  $("#todayLabel").textContent=new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"numeric",month:"long"}).format(today);
}

function renderDashboard(){
  const arr=activeTx(), m=txForMonth(), t=totals(m);
  const all=totals(arr);
  const balance=all.income-all.expense;
  $("#balanceValue").textContent=money(balance);
  $("#incomeValue").textContent=money(t.income);
  $("#expenseValue").textContent=money(t.expense);
  $("#savingValue").textContent=(t.income?Math.max(0,((t.income-t.expense)/t.income*100)):0).toFixed(0)+"%";
  $("#balanceHint").textContent=`Total masuk ${money(all.income)} · keluar ${money(all.expense)}`;
  const recent=[...arr].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)).slice(0,6);
  $("#recentTransactions").innerHTML=recent.length?recent.map(transactionRow).join(""):`<div class="empty">Belum ada transaksi. Klik <b>＋ Transaksi</b> untuk mulai.</div>`;
  bindTxActions();
  renderCategoryChart(m);
  drawChart();
}
function transactionRow(t){
  return `<div class="transaction-row">
    <div class="tx-icon ${t.type}">${t.type==="income"?"↗":"↘"}</div>
    <div class="tx-main"><strong>${escapeHtml(t.category)}</strong><small>${escapeHtml(t.note||"Tanpa keterangan")} · ${dateText(t.date)}</small></div>
    <div class="tx-amount ${t.type}">${t.type==="income"?"+":"−"} ${money(t.amount)}</div>
  </div>`;
}
function renderCategoryChart(arr){
  const map={};arr.filter(t=>t.type==="expense").forEach(t=>map[t.category]=(map[t.category]||0)+Number(t.amount));
  const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const max=rows[0]?.[1]||1;
  $("#categoryChart").innerHTML=rows.length?rows.map(([k,v])=>`<div class="cat-row"><div class="cat-line"><span>${escapeHtml(k)}</span><span>${money(v)}</span></div><div class="progress"><i style="width:${v/max*100}%"></i></div></div>`).join(""):`<div class="empty">Belum ada pengeluaran bulan ini.</div>`;
}
function drawChart(){
  const canvas=$("#cashflowChart"); if(!canvas)return;
  const rect=canvas.getBoundingClientRect(), dpr=devicePixelRatio||1, w=Math.max(280,rect.width), h=260;
  canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext("2d");ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
  const months=Number($("#chartPeriod")?.value||6), points=[];
  for(let i=months-1;i>=0;i--){const d=new Date(today.getFullYear(),today.getMonth()-i,1);const key=d.toISOString().slice(0,7);const tt=totals(txForMonth(key));points.push({label:d.toLocaleDateString("id-ID",{month:"short"}),...tt})}
  const max=Math.max(1,...points.flatMap(p=>[p.income,p.expense]));
  const pad={l:10,r:10,t:15,b:35}, cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;
  ctx.font="10px system-ui";ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--muted");
  for(let i=0;i<4;i++){const y=pad.t+ch*i/3;ctx.strokeStyle=getComputedStyle(document.body).getPropertyValue("--border");ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke()}
  const group=cw/points.length, bar=group*.25;
  points.forEach((p,i)=>{
    const x=pad.l+group*i+group/2, ih=p.income/max*ch, eh=p.expense/max*ch;
    ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--green");ctx.roundRect(x-bar-3,pad.t+ch-ih,bar,ih,5);ctx.fill();
    ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--red");ctx.roundRect(x+3,pad.t+ch-eh,bar,eh,5);ctx.fill();
    ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--muted");ctx.textAlign="center";ctx.fillText(p.label,x,h-10);
  });
}

function populateCategories(){
  const catFilter=$("#categoryFilter"), reportCat=$("#reportCategory");
  const all=[...new Set(data.transactions.filter(t=>t.accountId===data.activeAccount).map(t=>t.category))].sort();
  const opts='<option value="all">Semua kategori</option>'+all.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("");
  catFilter.innerHTML=opts;reportCat.innerHTML=opts;
  populateTransactionCategories();
}
function populateTransactionCategories(selected){
  const type=$("#txType").value;
  const cats=CATEGORIES[type];
  $("#txCategory").innerHTML=cats.map(c=>`<option value="${c}">${c}</option>`).join("");
  if(selected&&cats.includes(selected))$("#txCategory").value=selected;
}

function renderTransactions(){
  const q=($("#transactionSearch")?.value||"").toLowerCase(), type=$("#typeFilter")?.value||"all", cat=$("#categoryFilter")?.value||"all", mon=$("#monthFilter")?.value||"";
  let arr=activeTx().filter(t=>(!q||`${t.note} ${t.category}`.toLowerCase().includes(q))&&(type==="all"||t.type===type)&&(cat==="all"||t.category===cat)&&(!mon||monthKey(t.date)===mon));
  arr.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  const head=`<div class="table-head"><span>Tanggal</span><span>Tipe</span><span>Kategori / Keterangan</span><span>Jumlah</span><span>Status</span><span>Aksi</span></div>`;
  const body=arr.map(t=>`<div class="table-row"><span>${dateText(t.date)}</span><span><b class="pill ${t.type}">${t.type==="income"?"Pemasukan":"Pengeluaran"}</b></span><span><b>${escapeHtml(t.category)}</b><br><small class="muted">${escapeHtml(t.note||"-")}</small></span><span class="${t.type}" style="font-weight:800">${t.type==="income"?"+":"−"} ${money(t.amount)}</span><span>${t.type==="income"?"Masuk":"Keluar"}</span><span class="tx-actions"><button class="mini-btn edit-btn" data-id="${t.id}">✎</button><button class="mini-btn delete-btn" data-id="${t.id}">🗑</button></span></div>`).join("");
  $("#transactionsTable").innerHTML=head+(body||`<div class="empty">Tidak ada transaksi yang cocok.</div>`);
  bindTxActions();
}
function bindTxActions(){
  $$(".edit-btn").forEach(b=>b.addEventListener("click",()=>openTransaction(b.dataset.id)));
  $$(".delete-btn").forEach(b=>b.addEventListener("click",()=>deleteTransaction(b.dataset.id)));
}

function openModal(id){$("#"+id).classList.add("open")}
function closeModal(id){$("#"+id).classList.remove("open")}
function openTransaction(txId){
  const form=$("#transactionForm");form.reset();
  $("#transactionId").value="";
  $("#modalTitle").textContent="Tambah transaksi";
  $("#txDate").value=today.toISOString().slice(0,10);
  $("#txType").value="expense";populateTransactionCategories();
  if(txId){
    const t=data.transactions.find(x=>x.id===txId);if(!t)return;
    $("#modalTitle").textContent="Edit transaksi";$("#transactionId").value=t.id;$("#txDate").value=t.date;$("#txType").value=t.type;populateTransactionCategories(t.category);$("#txAmount").value=t.amount;$("#txNote").value=t.note||"";
  }
  openModal("transactionModal");
}
function saveTransaction(e){
  e.preventDefault();
  const item={id:$("#transactionId").value||id(),accountId:data.activeAccount,date:$("#txDate").value,type:$("#txType").value,category:$("#txCategory").value,amount:Number($("#txAmount").value),note:$("#txNote").value.trim()};
  if(!item.amount||item.amount<0){toast("Masukkan jumlah yang valid");return}
  const idx=data.transactions.findIndex(t=>t.id===item.id);
  if(idx>=0)data.transactions[idx]=item;else data.transactions.push(item);
  save();closeModal("transactionModal");renderAll();toast(idx>=0?"Transaksi diperbarui":"Transaksi disimpan");
}
function deleteTransaction(txId){
  if(data.settings.confirmDelete&&!confirm("Hapus transaksi ini?"))return;
  data.transactions=data.transactions.filter(t=>t.id!==txId);save();renderAll();toast("Transaksi dihapus");
}

function renderReports(){
  const month=$("#reportMonth")?.value||monthNow(), cat=$("#reportCategory")?.value||"all";
  let arr=txForMonth(month).filter(t=>cat==="all"||t.category===cat);
  const t=totals(arr), prevBalance=totals(activeTx().filter(x=>x.date<month+"-01"));
  const stats=[["Saldo Awal",prevBalance.income-prevBalance.expense],["Pemasukan",t.income],["Pengeluaran",t.expense],["Selisih",t.income-t.expense],["Saldo Akhir",prevBalance.income-prevBalance.expense+t.income-t.expense]];
  $("#reportSummary").innerHTML=stats.map(([a,b])=>`<div class="report-stat"><small>${a}</small><strong>${money(b)}</strong></div>`).join("");
  ranking("#topExpenses",arr.filter(x=>x.type==="expense").sort((a,b)=>b.amount-a.amount).slice(0,5),false);
  ranking("#topIncome",arr.filter(x=>x.type==="income").sort((a,b)=>b.amount-a.amount).slice(0,5),true);
  categoryRanking("#topExpenseCategories",arr.filter(x=>x.type==="expense"));
  categoryRanking("#topIncomeCategories",arr.filter(x=>x.type==="income"));
}
function ranking(sel,arr,income){
  $(sel).innerHTML=arr.length?`<div class="ranking">${arr.map((t,i)=>`<div class="rank-row"><span class="rank-num">${i+1}</span><span>${escapeHtml(t.category)}<br><small class="muted">${dateText(t.date)} · ${escapeHtml(t.note||"")}</small></span><span class="rank-value" style="color:${income?"var(--green)":"var(--red)"}">${money(t.amount)}</span></div>`).join("")}</div>`:`<div class="empty">Belum ada data.</div>`;
}
function categoryRanking(sel,arr){
  const map={};arr.forEach(t=>map[t.category]=(map[t.category]||0)+Number(t.amount));
  const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
  $(sel).innerHTML=rows.length?`<div class="ranking">${rows.map(([k,v],i)=>`<div class="rank-row"><span class="rank-num">${i+1}</span><span>${escapeHtml(k)}</span><span class="rank-value">${money(v)}</span></div>`).join("")}</div>`:`<div class="empty">Belum ada data.</div>`;
}
function renderAccounts(){
  $("#accountsGrid").innerHTML=data.accounts.map(a=>{
    const arr=data.transactions.filter(t=>t.accountId===a.id),tt=totals(arr);
    return `<article class="account-card ${a.id===data.activeAccount?"active":""}" data-account="${a.id}"><div class="account-card-head"><div class="account-avatar">${escapeHtml(a.name[0].toUpperCase())}</div>${a.id.startsWith("acc-")?`<button class="dots-btn account-delete" data-id="${a.id}">⋮</button>`:""}</div><small class="muted">${a.id===data.activeAccount?"AKUN AKTIF":"Pilih akun"}</small><h3>${escapeHtml(a.name)}</h3><div class="account-balance">${money(tt.income-tt.expense)}</div><div class="account-meta">${arr.length} transaksi · Masuk ${money(tt.income)}</div></article>`;
  }).join("");
  $$(".account-card").forEach(c=>c.addEventListener("click",e=>{
    if(e.target.closest(".account-delete"))return;
    data.activeAccount=c.dataset.account;save();renderAll();showView("dashboard");toast("Akun aktif: "+data.accounts.find(a=>a.id===data.activeAccount).name);
  }));
  $$(".account-delete").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();deleteAccount(b.dataset.id)}));
}
function createAccount(e){
  e.preventDefault();const name=$("#accountNameInput").value.trim();
  if(!name)return;
  const a={id:id(),name};data.accounts.push(a);data.activeAccount=a.id;save();closeModal("accountModal");$("#accountForm").reset();renderAll();showView("dashboard");toast("Akun dibuat");
}
function deleteAccount(accountId){
  if(data.accounts.length<=1){toast("Minimal harus ada satu akun");return}
  const a=data.accounts.find(x=>x.id===accountId);
  if(!confirm(`Hapus akun "${a.name}" dan semua transaksinya?`))return;
  data.accounts=data.accounts.filter(x=>x.id!==accountId);data.transactions=data.transactions.filter(x=>x.accountId!==accountId);
  if(data.activeAccount===accountId)data.activeAccount=data.accounts[0].id;
  save();renderAll();toast("Akun dihapus");
}

function backup(){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});downloadBlob(blob,`catatan-keuangan-backup-${monthNow()}.json`);toast("Backup berhasil dibuat");
}
function restore(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();reader.onload=()=>{
    try{
      const incoming=JSON.parse(reader.result);
      if(!incoming.accounts||!incoming.transactions)throw new Error();
      data=incoming;save();applySettings();renderAll();toast("Data berhasil dipulihkan");
    }catch(err){alert("File backup tidak valid.");}
    e.target.value="";
  };reader.readAsText(file);
}
function downloadCSV(){
  const rows=[["Tanggal","Tipe","Kategori","Jumlah","Keterangan","Akun"]];
  activeTx().forEach(t=>rows.push([t.date,t.type==="income"?"Pemasukan":"Pengeluaran",t.category,t.amount,t.note||"",data.accounts.find(a=>a.id===t.accountId)?.name||""]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  downloadBlob(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),`transaksi-${monthNow()}.csv`);toast("CSV berhasil dibuat");
}
function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function resetData(){
  if(!confirm("Hapus seluruh data aplikasi? Data yang dihapus tidak dapat dipulihkan tanpa backup."))return;
  localStorage.removeItem(STORAGE);data=structuredClone(defaultData);save();renderAll();toast("Data dikembalikan ke contoh awal");
}
$("#exportReportBtn").addEventListener("click",()=>{
  const old= document.title; document.title="Laporan Keuangan - "+(data.accounts.find(a=>a.id===data.activeAccount)?.name||"");
  window.print();document.title=old;
});

init();
})();