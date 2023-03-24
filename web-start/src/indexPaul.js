// import per salvare sul database firestore
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  updateDoc,
  doc,
  serverTimestamp,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { getMessaging, getToken, onwork } from 'firebase/messaging';
import { getPerformance } from 'firebase/performance';

import { getFirebaseConfig } from './firebase-config.js';

// domando a firebase i lavori commissionati
// Start listening to the query.
let intestazione = true;
let lavoriDaAffidare = []; // in questo array mi salverò tutti i lavori che bisogna affidare
onSnapshot(richiestaServerWork(), function (snapshot) { // per tutti i lavori da affidare
  lavoriDaAffidare = [];
  if (intestazione) {// se è la prima volta stampo l'intestazione
    stampaIntestazione(1);
  }
  snapshot.docChanges().forEach(function (change) {
    if (change.type === "removed") {//se viene cancellato qualcosa allora lo cancello anche dal dom
      deletework(change.doc.id, 1);
    } else {
      var work = change.doc.data(); // altrimenti lo stampo
      displayWork(change.doc.id, work); // li metto sul DOM
      let tmp = change.doc.data();
      tmp.id = change.doc.id;
      lavoriDaAffidare.push(tmp);// li aggiungo nell'array
    }
  });
})
let lavoriSalvati = []; // qui mi salverò tutti i lavori a cui è stato affidato un operatore
onSnapshot(richiestaServerAssignedWork(), function (snapshot) { // per tutti i lavori affidati ma non conclusi
  lavoriSalvati = [];
  if (intestazione) {
    stampaIntestazione(2);
  }
  snapshot.docChanges().forEach(function (change) {
    if (change.type == "removed") {//se viene cancellato qualcosa allora lo cancello anche dal dom
      deletework(change.doc.id, 2);
    } else if (change.type == "modified") { // se viene modificato
      let dato = change.doc.data(); // lo salvo nell'array
      dato.id = change.doc.id;
      lavoriSalvati.push(dato)
    } else { // altrimenti lo scrivo nell'array e lo metto nel DOM
      var work = change.doc.data();
      displayWorkAsigned(change.doc.id, work);
      let dato = change.doc.data();
      dato.id = change.doc.id;
      lavoriSalvati.push(dato)
    }
  });
})
onSnapshot(richiestaServerDoneWork(), function (snapshot) { // per tutti i lavori conclusi
  if (intestazione) {
    stampaIntestazione(3);
    intestazione = false;
  }
  snapshot.docChanges().forEach(function (change) {
    if (change.type == "removed") {//se viene cancellato qualcosa allora lo cancello anche dal dom
      deletework(change.doc.id, 3);
    } else if (change.type == "modified") { // altrimenti lo scrivo nell'array e lo metto nel DOM
      deletework(change.doc.id, 3);
      let dato = change.doc.data();
      displayDoneWork(change.doc.id, dato);
    } else {
      let dato = change.doc.data();
      displayDoneWork(change.doc.id, dato);
    }
  });
})

function deletework(id, type) { // metodo per cancellare un elemento del dom
  var div = document.getElementById(id);
  // If an element for that work exists we delete it.
  if (div) {
    if(type==1){
    document.getElementById("lavoriCommissionati").removeChild(div);
    }else if(type==2){
      document.getElementById("lavoriAssegnati").removeChild(div);
    }else{
      document.getElementById("lavoriConclusi").removeChild(div);
    }
  }
}
let ordine = ["nome", "cognome", "numero", "email", "indirizzo", "lavoro", "ore", "descrizione"] // array con salvato tutti i campi e ordinati
let operatori = ["marco", "claudio", "giacomo", "ernesto", "mario"] // array con tutti gli operatori

function displayWork(id, work) { // metodo per stampare un lavoro da affidare
  let contenitore = document.createElement("div");//creo un div che contiene tutti i dati di un lavoro
  contenitore.id = id;
  contenitore.className = "richiesta";
  ordine.forEach(etichetta => { // popolo il div con i campi
    let cella = document.createElement("div");
    let s = "";
    let testo = null;
    if (etichetta == "lavoro") {
      if (typeof work[etichetta] != "string") {
        for (let lav of work[etichetta]) {
          s += lav + ", ";
        }
      } else {
        s = work[etichetta];
      }
      cella.className = etichetta;
      testo = document.createTextNode(s);
    } else {
      cella.className = etichetta;
      testo = document.createTextNode(work[etichetta]);
    }
    cella.appendChild(testo);
    contenitore.appendChild(cella);
  })
  let cella = document.createElement("div");// creo lo spazio per inserire la parte di scelta dell operatore
  cella.className = "operatore";
  let listOperatori = document.createElement("select");
  listOperatori.id = id;
  listOperatori.className = "selezOp";
  let newOperat = document.createElement("option");
  newOperat.selected = true;
  let txt = document.createTextNode("selez. op.");
  newOperat.appendChild(txt);
  listOperatori.appendChild(newOperat);
  operatori.forEach(operat => {// aggiungo gli operatori nel select
    let newOperat = document.createElement("option");
    newOperat.value = operat;
    let txt = document.createTextNode(operat);
    newOperat.appendChild(txt);
    listOperatori.appendChild(newOperat);
  })
  cella.appendChild(listOperatori);
  contenitore.appendChild(cella);
  document.getElementById("lavoriCommissionati").appendChild(contenitore);
  listOperatori.addEventListener('change', () => {// quando cambia il select
    let sceltaOperatore;
    for (let option of Array.from(listOperatori)) { // controllo quale operatore è stato selezionato
      if (option.selected) {
        sceltaOperatore = option.value;
      }
    }
    work.operatore = sceltaOperatore;
    inviaLavori(work, id) // lo invio ad firebase
  })
}

function displayWorkAsigned(id, work) { // metodo per stampare un lavoro affidato ma non concluso
  let contenitore = document.createElement("div");//creo un div che contiene tutti i dati di un lavoro
  contenitore.id = id;
  contenitore.className = "richiesta";
  ordine.forEach(etichetta => { // popolo il div con i campi
    let cella = document.createElement("div");
    let s = "";
    let testo = null;
    if (etichetta == "lavoro") {
      if (typeof work[etichetta] != "string") {
        for (let lav of work[etichetta]) {
          s += lav + ", ";
        }
      } else {
        s = work[etichetta];
      }
      cella.className = etichetta;
      testo = document.createTextNode(s);
    } else {
      cella.className = etichetta;
      testo = document.createTextNode(work[etichetta]);
    }
    cella.appendChild(testo);
    contenitore.appendChild(cella);
  })
  let cella = document.createElement("div");// creo lo spazio per inserire la parte di scelta dell operatore
  cella.className="operatore";
  let testo = document.createTextNode(work.operatore);
  cella.appendChild(testo);
  contenitore.appendChild(cella);
  document.getElementById("lavoriAssegnati").appendChild(contenitore);
}
let ordineDone = ["nome", "cognome", "numero", "email", "indirizzo", "lavoro", "oreFinale", "descrizione"]; // array con salvato tutti i campi e ordinati
function displayDoneWork(id, work) { // metodo per stampare un lavoro concluso
  work.id = id;
  let contenitore = document.createElement("div");//creo un div che contiene tutti i dati di un lavoro
  contenitore.id = id;
  contenitore.className = "richiesta";
  ordineDone.forEach(etichetta => { // popolo il div con i campi
    let cella = document.createElement("div");
    let s = "";
    let testo = null;
    if (etichetta == "lavoro") {
      if (typeof work[etichetta] != "string") {
        for (let lav of work[etichetta]) {
          s += lav + ", ";
        }
      } else {
        s = work[etichetta];
      }
      cella.className = etichetta;
      testo = document.createTextNode(s);
    } else {
      cella.className = etichetta;
      testo = document.createTextNode(work[etichetta]);
    }
    cella.appendChild(testo);
    contenitore.appendChild(cella);
  }) // creo il pulsante per i dettagli
  let cella = document.createElement("div");
  cella.className = "operatore";
  let btn = document.createElement("input");
  btn.type = "button";
  btn.value = "dettagli";
  btn.className="btn";
  cella.appendChild(btn);
  contenitore.appendChild(cella);
  btn.addEventListener('click', () => { // quando viene premuto il pulsante dettagli stampo i dettagli in un alert
    let cont = document.createElement("div");
      cont.className="cont";
      let btn = document.createElement("button");
      btn.className="chiudi"
      let txt=document.createTextNode("x");
      btn.appendChild(txt);
      cont.appendChild(btn);
      btn.addEventListener("click", ()=>{
        document.body.removeChild(cont);
      })
      let titolo = document.createElement("h3");
      titolo.className="titoloDiv"
      txt = document.createTextNode("Dettagli");
      titolo.appendChild(txt);
      cont.appendChild(titolo);
      let testo = document.createElement("p")
      testo.className="descriz";
      txt=document.createTextNode("data di inizio lavori: " + work.inizioLavori);
      testo.appendChild(txt)
      cont.appendChild(testo);
      testo = document.createElement("p")
      testo.className="descriz";
      txt=document.createTextNode("data di fine lavori: " + work.fineLavori);
      testo.appendChild(txt)
      cont.appendChild(testo);
      testo = document.createElement("p")
      testo.className="descriz";
      txt=document.createTextNode("problematiche: " + work.problematiche);
      testo.appendChild(txt)
      cont.appendChild(testo);
      testo = document.createElement("p")
      testo.className="descriz";
      txt=document.createTextNode("materiali usati: " + work.materiali);
      testo.appendChild(txt)
      cont.appendChild(testo);
      testo = document.createElement("p")
      testo.className="descriz";
      txt=document.createTextNode("tempo di lavoro: " + work.oreFinale+" h");
      testo.appendChild(txt)
      cont.appendChild(testo);
      testo = document.createElement("p")
      testo.className="descriz";
      txt=document.createTextNode("prezzo finale: " + work.prezzoFinale + "$");
      testo.appendChild(txt)
      cont.appendChild(testo);    
      testo = document.createElement("p")
      testo.className="descriz";
      txt=document.createTextNode("Operatore: " + work.operatore);
      testo.appendChild(txt)
      cont.appendChild(testo);  
    document.body.appendChild(cont);
  })
  document.getElementById("lavoriConclusi").appendChild(contenitore);
}

function stampaIntestazione(parte) { // metodo che permette di stampare l'intestazione
  let contenitore = document.createElement("div");
  contenitore.className = "intestazioneRichiesta";
  ordine.forEach(etichetta => { // stampo ogni etichetta
    let cella = document.createElement("div");
    cella.id = "intestazione";
    cella.className=etichetta;
    let testo = document.createTextNode(etichetta);
    cella.appendChild(testo);
    contenitore.appendChild(cella);
  })
  //aggiungo la "colonna" di operatore
  let cella = document.createElement("div");
  cella.className = "operatore";
  cella.id = "intestazione";
  let testo;
  if (parte == 1) {
    document.getElementById("lavoriCommissionati").appendChild(contenitore)
    testo = document.createTextNode("operatore");
  } else if (parte == 2) {
    document.getElementById("lavoriAssegnati").appendChild(contenitore)
    testo = document.createTextNode("operatore");
  } else {
    document.getElementById("lavoriConclusi").appendChild(contenitore)
    testo = document.createTextNode("dettagli");
  }
  cella.appendChild(testo);
  contenitore.appendChild(cella);
}

function inviaLavori(datiLavoro, id) {
  salvataggioAssignedWork(datiLavoro, id); // lo sposto dalla parte dedicata ai lavori senza operatori alla parte dei lavori con un operatore
}

async function salvataggioAssignedWork(datiLavoro, id) {
  try {
    await addDoc(collection(getFirestore(), 'assignedWork'), datiLavoro); //salvo il lavoro nell'array dei lavori con un operatore assegnato
    await deleteDoc(doc(getFirestore(), 'messages', id)); //lo rimuovo dall'altro array
  }
  catch (error) {
    console.error('Error writing new message to Firebase Database', error);
  }
}

function richiestaServerWork() {
  return query(collection(getFirestore(), 'messages'), orderBy('ore', 'desc')); //query di richiesta al db
}
function richiestaServerAssignedWork() {
  return query(collection(getFirestore(), 'assignedWork'), orderBy('operatore', 'desc')); //query di richiesta al db
}
function richiestaServerDoneWork() {
  return query(collection(getFirestore(), 'doneWork'), orderBy('fineLavori', 'desc')); //query di richiesta al db
}
function confrontaLavori(lavoro1, lavoro2) { // metodo di confronto di due lavori
  return (lavoro1.nome == lavoro2.nome && lavoro1.cognome == lavoro2.cognome && lavoro1.lavoro == lavoro2.lavoro && lavoro1.indirizzo == lavoro2.indirizzo)
}
